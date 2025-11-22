<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function createQrisPayment(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,order_id',
        ]);

        $order = Order::with('details', 'payment')->findOrFail($validated['order_id']);

        $payment = $order->payment;
        if (!$payment || $payment->method !== 'QRIS') {
            return response()->json(['message' => 'Invalid payment method'], 400);
        }

        // Midtrans integration
        $midtransOrderId = 'MID-' . time() . '-' . $order->order_id;
        
        $itemDetails = $order->details->map(function($detail) {
            return [
                'id' => (string) $detail->product_id,
                'price' => (int) $detail->price,
                'quantity' => $detail->quantity,
                'name' => $detail->product->name . ' (' . $detail->size . ')',
            ];
        })->toArray();

        $params = [
            'transaction_details' => [
                'order_id' => $midtransOrderId,
                'gross_amount' => (int) $order->total_price,
            ],
            'item_details' => $itemDetails,
            'customer_details' => [
                'first_name' => $order->user->name,
                'email' => $order->user->email,
                'phone' => $order->user->phone ?? '',
            ],
            'payment_type' => 'qris',
        ];

        // Call Midtrans API
        $serverKey = config('midtrans.server_key');
        $isProduction = config('midtrans.is_production');
        $baseUrl = $isProduction 
            ? 'https://app.midtrans.com/snap/v1' 
            : 'https://app.sandbox.midtrans.com/snap/v1';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $baseUrl . '/transactions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Basic ' . base64_encode($serverKey . ':'),
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 201) {
            return response()->json([
                'message' => 'Failed to create payment',
                'error' => json_decode($response, true)
            ], 400);
        }

        $midtransResponse = json_decode($response, true);

        return response()->json([
            'token' => $midtransResponse['token'],
            'redirect_url' => $midtransResponse['redirect_url'] ?? null,
        ]);
    }

    public function webhook(Request $request)
    {
        $serverKey = config('midtrans.server_key');

        $orderId = $request->input('order_id');
        $statusCode = $request->input('status_code');
        $grossAmount = $request->input('gross_amount');
        $transactionStatus = $request->input('transaction_status');

        // Extract order ID from Midtrans order ID format
        if (preg_match('/MID-\d+-(\d+)/', $orderId, $matches)) {
            $orderId = $matches[1];
        }

        $payment = Payment::whereHas('order', function($q) use ($orderId) {
            $q->where('order_id', $orderId);
        })->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        $order = $payment->order;

        if ($transactionStatus === 'settlement') {
            $payment->update([
                'status' => 'Success',
                'transaction_time' => now(),
            ]);
        } elseif ($transactionStatus === 'cancel' || $transactionStatus === 'expire') {
            $payment->update(['status' => 'Failed']);
            $order->update(['status' => 'Cancel']);
        }

        return response()->json(['message' => 'Webhook processed']);
    }
}
