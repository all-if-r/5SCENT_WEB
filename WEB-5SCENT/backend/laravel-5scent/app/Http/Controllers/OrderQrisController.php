<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\NotificationService;
use App\Helpers\OrderCodeHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * OrderQrisController - Handle QRIS payment detail page requests
 * 
 * Routes:
 * - GET /api/orders/{orderId}/qris-detail - Get QRIS payment details for page load
 * - GET /api/orders/{orderId}/payment-status - Poll for payment status updates
 */
class OrderQrisController extends Controller
{
    /**
     * Get QRIS payment detail for the payment page
     * 
     * Response:
     * {
     *   "order": {
     *     "order_id": 123,
     *     "customer_name": "John Doe",
     *     "total_items": 1,
     *     "total_price": 78750,
     *     "created_at": "2025-12-11T06:45:00.000Z",
     *     "payment_method": "QRIS"
     *   },
     *   "payment": {
     *     "amount": 78750,
     *     "status": "Pending"
     *   },
     *   "qris": {
     *     "qr_url": "https://...",
     *     "status": "pending",
     *     "expired_at": "2025-12-11T06:50:00.000Z"
     *   }
     * }
     */
    public function getQrisDetail(string $orderId): JsonResponse
    {
        try {
            // Find order
            $order = Order::findOrFail($orderId);

            // Get order details count
            $totalItems = $order->details()->count();

            // Get payment record
            $payment = $order->payment()->first();

            // Get QRIS transaction
            $qrisTransaction = $order->paymentTransaction()->first();

            // If no QRIS transaction exists, return error so client retries
            if (!$qrisTransaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'No QRIS payment found for this order. Please complete the payment process.',
                ], 404);
            }

            // Calculate effective status based on expiry time
            $effectiveStatus = $qrisTransaction->status;
            if ($qrisTransaction->status === 'pending' && $qrisTransaction->expired_at && $qrisTransaction->expired_at <= now()) {
                // Actually expire the transaction immediately when detected
                $qrisTransaction->update([
                    'status' => 'expire',
                    'updated_at' => $qrisTransaction->expired_at,
                ]);
                
                // Also cancel the order if it's still pending
                if ($order->status === 'Pending') {
                    $order->update(['status' => 'Cancelled']);
                    
                    // Create expiry notification
                    $orderCode = \App\Helpers\OrderCodeHelper::formatOrderCode($order);
                    NotificationService::createOrderUpdateNotification(
                        $order->order_id,
                        "Payment for order {$orderCode} has expired."
                    );
                }
                
                $effectiveStatus = 'expire';
                
                \Log::info('QRIS transaction expired immediately on status check', [
                    'qris_transaction_id' => $qrisTransaction->qris_transaction_id,
                    'order_id' => $order->order_id,
                    'expired_at' => $qrisTransaction->expired_at->toISOString(),
                    'detected_at' => now()->toISOString(),
                ]);
            }

            return response()->json([
                'success' => true,
                'order' => [
                    'order_id' => $order->order_id,
                    'customer_name' => $order->user->name ?? 'Customer',
                    'total_items' => $totalItems,
                    'total_price' => (int)$order->total_price,
                    'created_at' => $order->created_at->toIso8601String(),
                    'payment_method' => $order->payment_method ?? 'QRIS',
                ],
                'payment' => [
                    'amount' => (int)($payment->amount ?? $order->total_price),
                    'status' => $payment->status ?? 'Pending',
                ],
                'qris' => [
                    'qr_url' => $qrisTransaction->qr_url,
                    'status' => $qrisTransaction->status,
                    'effective_status' => $effectiveStatus,
                    'expired_at' => $qrisTransaction->expired_at?->toIso8601String(),
                ],
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching QRIS details', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment details',
            ], 500);
        }
    }

    /**
     * Poll payment status for real-time updates
     * Called every 5 seconds by the frontend to detect payment status changes
     * 
     * Frontend uses this to detect when:
     * - Payment completes (settlement)
     * - Payment expires (expire)
     * - Payment is cancelled (cancel)
     * - Payment is denied (deny)
     * 
     * Response:
     * {
     *   "success": true,
     *   "payment_status": "Success|Pending|Failed|Refunded",
     *   "qris_status": "settlement|pending|expire|cancel|deny",
     *   "effective_status": "settlement|pending|expire|cancel|deny",
     *   "order_status": "Pending|Packaging|Shipping|Delivered|Cancel"
     * }
     */
    public function getPaymentStatus(string $orderId): JsonResponse
    {
        try {
            $order = Order::findOrFail($orderId);
            $payment = $order->payment()->first();
            $qrisTransaction = $order->paymentTransaction()->first();

            // Calculate effective status based on expiry time
            $effectiveStatus = $qrisTransaction->status ?? 'pending';
            if ($qrisTransaction && $qrisTransaction->status === 'pending' && $qrisTransaction->expired_at && $qrisTransaction->expired_at <= now()) {
                // Actually expire the transaction immediately when detected
                $qrisTransaction->update([
                    'status' => 'expire',
                    'updated_at' => $qrisTransaction->expired_at,
                ]);
                
                // Also cancel the order if it's still pending
                if ($order->status === 'Pending') {
                    $order->update(['status' => 'Cancelled']);
                    
                    // Create expiry notifications
                    $orderCode = OrderCodeHelper::formatOrderCode($order);
                    
                    // Create order update notification
                    NotificationService::createOrderUpdateNotification(
                        $order->order_id,
                        "Payment for order {$orderCode} has expired."
                    );
                    
                    // Create payment notification
                    NotificationService::createPaymentNotification(
                        $order->user_id ?? $order->order_id,
                        $order->order_id,
                        "Payment for order {$orderCode} has expired.",
                        'Payment'
                    );
                }
                
                $effectiveStatus = 'expire';
                
                \Log::info('QRIS transaction expired immediately on payment status check', [
                    'qris_transaction_id' => $qrisTransaction->qris_transaction_id,
                    'order_id' => $order->order_id,
                    'expired_at' => $qrisTransaction->expired_at->toISOString(),
                    'detected_at' => now()->toISOString(),
                ]);
            }

            return response()->json([
                'success' => true,
                'payment_status' => $payment->status ?? 'Pending',
                'qris_status' => $qrisTransaction->status ?? 'pending',
                'effective_status' => $effectiveStatus,
                'order_status' => $order->status ?? 'Pending',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching payment status', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment status',
            ], 500);
        }
    }

    /**
     * Download QRIS QR code image via backend proxy
     * 
     * This avoids CORS issues by proxying the request through the backend
     * 
     * Route: GET /api/orders/{orderId}/qris-download
     * 
     * Returns: Binary image data with proper headers
     */
    public function downloadQrisCode(string $orderId)
    {
        try {
            $order = Order::findOrFail($orderId);
            $qrisTransaction = $order->paymentTransaction()->first();

            if (!$qrisTransaction || !$qrisTransaction->qr_url) {
                return response()->json([
                    'success' => false,
                    'message' => 'QRIS QR code not found for this order',
                ], 404);
            }

            // Proxy the QR code image from Midtrans
            $qrUrl = $qrisTransaction->qr_url;
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $qrUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            // Disable SSL verification for sandbox
            if (strpos($qrUrl, 'sandbox') !== false) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
            }

            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError || $httpCode >= 400) {
                \Log::error('Failed to download QR code from Midtrans', [
                    'order_id' => $orderId,
                    'qr_url' => $qrUrl,
                    'curl_error' => $curlError,
                    'http_code' => $httpCode,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to download QR code from payment gateway',
                ], 500);
            }

            if (!$imageData) {
                return response()->json([
                    'success' => false,
                    'message' => 'No image data received',
                ], 500);
            }

            // Return image with proper headers
            return response($imageData)
                ->header('Content-Type', $contentType ?: 'image/png')
                ->header('Content-Disposition', 'attachment; filename=QRIS-Order-' . $order->order_id . '.png')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error downloading QRIS code', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to download QR code',
            ], 500);
        }
    }

    /**
     * Mark QRIS payment as expired (called when frontend timer reaches 0)
     * Updates both order status and QRIS transaction status
     */
    public function markQrisExpired(string $orderId, Request $request): JsonResponse
    {
        try {
            $order = Order::findOrFail($orderId);

            // Update order status to Cancelled
            try {
                $order->update([
                    'status' => 'Cancelled',
                ]);
            } catch (\Exception $e) {
                \Log::error('Error updating order status', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update order status',
                ], 500);
            }

            // Update payment status to Expired
            try {
                $payment = \App\Models\Payment::where('order_id', $orderId)->first();
                if ($payment) {
                    $payment->update(['status' => 'Failed']);
                }
            } catch (\Exception $e) {
                \Log::error('Error updating payment status', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ]);
            }

            // Update QRIS transaction status to expired using raw query
            try {
                \DB::table('qris_transactions')
                    ->where('order_id', $orderId)
                    ->update([
                        'status' => 'expired',
                        'updated_at' => now(),
                    ]);
            } catch (\Exception $e) {
                \Log::error('Error updating QRIS transaction', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ]);
            }

            // Create expiry notification
            try {
                $orderCode = \App\Helpers\OrderCodeHelper::formatOrderCode($order);
                \App\Services\NotificationService::createPaymentNotification(
                    $order->user_id ?? $order->order_id,
                    $order->order_id,
                    "Your payment for order {$orderCode} has expired. Please create a new payment."
                );
            } catch (\Exception $e) {
                \Log::error('Error creating notification', [
                    'order_id' => $order->order_id,
                    'error' => $e->getMessage(),
                ]);
                // Continue without notification
            }

            \Log::info('QRIS payment marked as expired', [
                'order_id' => $order->order_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'QRIS payment marked as expired',
                'order_status' => $order->status,
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error marking QRIS as expired', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mark QRIS as expired: ' . $e->getMessage(),
            ], 500);
        }
    }
}
