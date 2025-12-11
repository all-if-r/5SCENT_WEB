<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     *   "order_status": "Pending|Packaging|Shipping|Delivered|Cancel"
     * }
     */
    public function getPaymentStatus(string $orderId): JsonResponse
    {
        try {
            $order = Order::findOrFail($orderId);
            $payment = $order->payment()->first();
            $qrisTransaction = $order->paymentTransaction()->first();

            return response()->json([
                'success' => true,
                'payment_status' => $payment->status ?? 'Pending',
                'qris_status' => $qrisTransaction->status ?? 'pending',
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
}
