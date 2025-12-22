<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Services\NotificationService;
use App\Helpers\OrderCodeHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * MidtransNotificationController - Handle Midtrans webhook notifications
 * 
 * When a customer completes QRIS payment in Midtrans, a webhook notification
 * is sent to this endpoint with transaction status update.
 * 
 * This controller:
 * 1. Receives webhook payload from Midtrans
 * 2. Verifies the notification (optional but recommended)
 * 3. Updates PaymentTransaction status
 * 4. Updates Order based on payment status
 * 5. Sends automatic notifications to customer (success/failed)
 * 6. Returns HTTP 200 to acknowledge receipt
 */
class MidtransNotificationController extends Controller
{
    /**
     * Handle Midtrans webhook notification
     * 
     * Expected payload from Midtrans:
     * {
     *   "transaction_time": "2025-12-11 10:00:00",
     *   "transaction_status": "settlement|pending|expire|cancel|deny",
     *   "transaction_id": "abc123def456",
     *   "status_message": "...",
     *   "status_code": "200",
     *   "merchant_id": "...",
     *   "merchant_reference_key": "...",
     *   "gross_amount": "100000.00",
     *   "currency": "IDR",
     *   "order_id": "ORDER-123-1234567890",
     *   "payment_type": "qris",
     *   "fraud_status": "accept",
     *   "settlement_time": "2025-12-11 10:05:00"
     * }
     * 
     * Response (always 200):
     * {
     *   "status": "ok"
     * }
     */
    public function handleNotification(Request $request)
    {
        try {
            $payload = $request->all();

            Log::info('Midtrans notification received', [
                'order_id' => $payload['order_id'] ?? 'unknown',
                'transaction_status' => $payload['transaction_status'] ?? 'unknown',
                'payload' => $payload,
            ]);

            // Extract key fields from payload
            $midtransOrderId = $payload['order_id'] ?? null;
            $transactionStatus = $payload['transaction_status'] ?? null;
            $transactionId = $payload['transaction_id'] ?? null;
            $fraudStatus = $payload['fraud_status'] ?? null;

            if (!$midtransOrderId || !$transactionStatus) {
                Log::warning('Invalid Midtrans notification: missing order_id or transaction_status', [
                    'payload' => $payload,
                ]);
                return response()->json(['status' => 'ok'], 200);
            }

            // Extract actual order_id from Midtrans order_id format: "ORDER-123-1234567890"
            // Format: ORDER-{order_id}-{timestamp}
            $orderIdParts = explode('-', $midtransOrderId);
            if (count($orderIdParts) < 2) {
                Log::warning('Invalid Midtrans order_id format', [
                    'midtrans_order_id' => $midtransOrderId,
                ]);
                return response()->json(['status' => 'ok'], 200);
            }
            $orderId = $orderIdParts[1];

            // Find order
            $order = Order::find($orderId);
            if (!$order) {
                Log::warning('Order not found for Midtrans notification', [
                    'order_id' => $orderId,
                    'midtrans_order_id' => $midtransOrderId,
                ]);
                return response()->json(['status' => 'ok'], 200);
            }

            // Find or create PaymentTransaction
            $paymentTransaction = PaymentTransaction::where('order_id', $orderId)->first();
            if (!$paymentTransaction) {
                Log::warning('PaymentTransaction not found for order', [
                    'order_id' => $orderId,
                ]);
                $paymentTransaction = PaymentTransaction::create([
                    'order_id' => $orderId,
                    'midtrans_order_id' => $midtransOrderId,
                    'midtrans_transaction_id' => $transactionId,
                    'payment_type' => 'qris',
                    'gross_amount' => $order->total_price,
                    'status' => 'pending',
                ]);
            }

            // Update PaymentTransaction status
            $paymentTransaction->update([
                'midtrans_transaction_id' => $transactionId,
                'status' => $this->mapTransactionStatus($transactionStatus),
                'raw_notification' => json_encode($payload),
            ]);

            Log::info('PaymentTransaction updated', [
                'order_id' => $orderId,
                'status' => $transactionStatus,
            ]);

            // Update Order based on payment status
            $this->updateOrderStatus($order, $transactionStatus, $fraudStatus);

            // Update payment table status
            $this->updatePaymentStatus($order->order_id, $transactionStatus);

            Log::info('Midtrans notification processed successfully', [
                'order_id' => $orderId,
                'transaction_status' => $transactionStatus,
                'order_status_updated' => true,
                'payment_status_updated' => true,
            ]);

            return response()->json(['status' => 'ok'], 200);

        } catch (\Exception $e) {
            Log::error('Error handling Midtrans notification', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $request->all(),
            ]);

            // Return 200 anyway to prevent Midtrans retries
            return response()->json(['status' => 'ok'], 200);
        }
    }

    /**
     * Map Midtrans transaction status to PaymentTransaction status
     */
    private function mapTransactionStatus(string $midtransStatus): string
    {
        return match ($midtransStatus) {
            'capture',
            'settlement' => 'settlement',
            'pending' => 'pending',
            'expire' => 'expire',
            'cancel' => 'cancel',
            'deny' => 'deny',
            'failure' => 'deny',
            default => 'pending',
        };
    }

    /**
     * Update Order status based on payment transaction status
     */
    private function updateOrderStatus(Order $order, string $transactionStatus, ?string $fraudStatus = null): void
    {
        // Map transaction status
        $mappedStatus = $this->mapTransactionStatus($transactionStatus);

        switch ($mappedStatus) {
            case 'settlement':
                // Payment successful
                $order->update([
                    'payment_status' => 'success',
                    'order_status' => 'packaging', // Auto-move to packaging
                ]);

                Log::info('Order marked as paid and moved to packaging', [
                    'order_id' => $order->order_id,
                ]);

                // Create payment success notification
                $orderCode = OrderCodeHelper::formatOrderCode($order);
                NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} was successful. Thank you for your purchase."
                );

                // Create order update notification for packaging status
                NotificationService::createOrderUpdateNotification(
                    $order->order_id,
                    "Your order {$orderCode} is now being packaged. We'll notify you when it ships."
                );
                break;

            case 'expire':
                // Payment expired - order remains pending
                $order->update([
                    'payment_status' => 'expired',
                ]);

                Log::info('Order payment expired', [
                    'order_id' => $order->order_id,
                ]);

                // Create payment expired notification
                $orderCode = OrderCodeHelper::formatOrderCode($order);
                NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} has expired. Please create a new payment."
                );
                break;

            case 'cancel':
            case 'deny':
                // Payment failed - order remains pending
                $order->update([
                    'payment_status' => 'failed',
                ]);

                Log::info('Order payment failed', [
                    'order_id' => $order->order_id,
                    'reason' => $mappedStatus,
                ]);

                // Create payment failed notification
                $orderCode = OrderCodeHelper::formatOrderCode($order);
                NotificationService::createPaymentNotification(
                    $order->order_id,
                    "Your payment for order {$orderCode} failed. Please try again or use another payment method."
                );
                break;

            case 'pending':
            default:
                // Keep current status
                Log::info('Order payment status pending', [
                    'order_id' => $order->order_id,
                ]);
                break;
        }
    }

    /**
     * Update payment table status based on transaction status
     */
    private function updatePaymentStatus(string $orderId, string $transactionStatus): void
    {
        try {
            $payment = \App\Models\Payment::where('order_id', $orderId)->first();
            
            if (!$payment) {
                Log::warning('Payment record not found for order', [
                    'order_id' => $orderId,
                ]);
                return;
            }

            $mappedStatus = match ($transactionStatus) {
                'settlement', 'capture' => 'success',
                'pending' => 'pending',
                'expire' => 'failed',
                'cancel', 'deny' => 'failed',
                'failure' => 'failed',
                default => 'pending',
            };

            $payment->update([
                'status' => $mappedStatus,
            ]);

            Log::info('Payment status updated', [
                'order_id' => $orderId,
                'transaction_status' => $transactionStatus,
                'payment_status' => $mappedStatus,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating payment status', [
                'order_id' => $orderId,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
