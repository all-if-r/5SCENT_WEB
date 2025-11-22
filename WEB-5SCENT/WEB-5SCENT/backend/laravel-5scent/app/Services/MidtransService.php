<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;

class MidtransService
{
    protected $serverKey;
    protected $clientKey;
    protected $isProduction;
    protected $baseUrl;

    public function __construct()
    {
        $this->serverKey = config('midtrans.server_key');
        $this->clientKey = config('midtrans.client_key');
        $this->isProduction = config('midtrans.is_production');
        $this->baseUrl = $this->isProduction 
            ? 'https://app.midtrans.com' 
            : 'https://app.sandbox.midtrans.com';
    }

    public function createSnapToken(Order $order)
    {
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
                'order_id' => $order->order_number,
                'gross_amount' => (int) $order->total_amount,
            ],
            'item_details' => $itemDetails,
            'customer_details' => [
                'first_name' => $order->user->name,
                'email' => $order->user->email,
                'phone' => $order->user->phone ?? '',
            ],
        ];

        $response = Http::withBasicAuth($this->serverKey, '')
            ->post($this->baseUrl . '/snap/v1/transactions', $params);

        if ($response->successful()) {
            return $response->json();
        }

        throw new \Exception('Failed to create Midtrans transaction: ' . $response->body());
    }

    public function verifyNotification(array $data)
    {
        $orderId = $data['order_id'];
        $statusCode = $data['status_code'];
        $grossAmount = $data['gross_amount'];
        $transactionStatus = $data['transaction_status'];

        // Verify signature if needed
        return [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'transaction_status' => $transactionStatus,
        ];
    }
}



