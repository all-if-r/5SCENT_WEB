<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Midtrans\CoreApi;
use Midtrans\Config;

/**
 * QrisPaymentController - Handle QRIS payment creation via Midtrans Core API
 * 
 * When a user selects QRIS as payment method during checkout,
 * this controller:
 * 1. Validates the order
 * 2. Creates a QRIS charge via Midtrans Core API
 * 3. Extracts QR code URL from response
 * 4. Stores payment transaction record
 * 5. Returns QR URL to frontend with 5-minute expiry
 */
class QrisPaymentController extends Controller
{
    /**
     * Create a QRIS payment and return QR code URL
     * 
     * Request body:
     * {
     *   "order_id": 123
     * }
     * 
     * Response:
     * {
     *   "success": true,
     *   "qr_url": "https://...",
     *   "midtrans_order_id": "ORDER-123-1234567890",
     *   "status": "pending",
     *   "expired_at": "2025-12-11T10:05:00Z"
     * }
     */
    public function createQrisPayment(Request $request)
    {
        try {
            // Validate request
            $validated = $request->validate([
                'order_id' => 'required|exists:orders,order_id',
            ]);

            // Load order and validate status
            $order = Order::findOrFail($validated['order_id']);

            // Check if order is still pending and not already paid
            if ($order->order_status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order is not in pending status',
                ], 400);
            }

            // Check if payment already exists and is successful
            if ($order->paymentTransaction && $order->paymentTransaction->status === 'settlement') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order has already been paid',
                ], 400);
            }

            // Configure Midtrans SDK
            MidtransService::configure();

            // Generate unique Midtrans order ID
            $midtransOrderId = 'ORDER-' . $order->order_id . '-' . time();

            // Get current time with timezone +0700 (WIB)
            $now = new \DateTime('now', new \DateTimeZone('Asia/Jakarta'));
            $orderTime = $now->format('Y-m-d H:i:s O');

            // Build QRIS charge payload
            $payload = [
                'payment_type' => 'qris',
                'transaction_details' => [
                    'order_id' => $midtransOrderId,
                    'gross_amount' => (int)$order->total_price,
                ],
                'customer_details' => [
                    'first_name' => $order->user->name ?? 'Customer',
                    'email' => $order->user->email ?? 'customer@example.com',
                    'phone' => $order->phone_number,
                ],
                'qris' => [
                    'acquirer' => 'gopay',
                ],
                'custom_expiry' => [
                    'order_time' => $orderTime,
                    'expiry_duration' => 5,
                    'unit' => 'minute',
                ],
            ];

            Log::info('Creating QRIS payment', [
                'order_id' => $order->order_id,
                'midtrans_order_id' => $midtransOrderId,
                'payload' => $payload,
            ]);

            // Call Midtrans Core API
            $response = CoreApi::charge($payload);

            // Extract response data
            $transactionId = $response->transaction_id ?? null;
            $transactionStatus = $response->transaction_status ?? 'pending';

            // Find QR code URL in actions array
            $qrUrl = null;
            if (isset($response->actions) && is_array($response->actions)) {
                foreach ($response->actions as $action) {
                    if (in_array($action->name, ['generate-qr-code', 'generate-qr-code-v2'])) {
                        $qrUrl = $action->url;
                        break;
                    }
                }
            }

            if (!$qrUrl) {
                Log::warning('QR URL not found in Midtrans response', [
                    'response' => $response,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate QR code',
                ], 500);
            }

            // Calculate expiry time (5 minutes from now)
            $expiredAt = now()->addMinutes(5);

            // Create or update PaymentTransaction record
            $paymentTransaction = PaymentTransaction::updateOrCreate(
                ['order_id' => $order->order_id],
                [
                    'midtrans_order_id' => $midtransOrderId,
                    'midtrans_transaction_id' => $transactionId,
                    'payment_type' => 'qris',
                    'gross_amount' => (int)$order->total_price,
                    'qr_url' => $qrUrl,
                    'status' => 'pending',
                    'expired_at' => $expiredAt,
                ]
            );

            // Update order payment status (remain pending until settled)
            $order->update([
                'payment_status' => 'pending',
            ]);

            Log::info('QRIS payment created successfully', [
                'order_id' => $order->order_id,
                'payment_transaction_id' => $paymentTransaction->id,
                'qr_url' => $qrUrl,
            ]);

            return response()->json([
                'success' => true,
                'qr_url' => $qrUrl,
                'midtrans_order_id' => $midtransOrderId,
                'status' => 'pending',
                'expired_at' => $expiredAt->toIso8601String(),
                'message' => 'QRIS payment created successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('QRIS payment creation failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create QRIS payment: ' . $e->getMessage(),
            ], 500);
        }
    }
}
