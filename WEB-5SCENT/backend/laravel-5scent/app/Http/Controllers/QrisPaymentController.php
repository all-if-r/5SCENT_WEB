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
 * Handles QRIS payment requests and creates records in qris_transactions table
 */
class QrisPaymentController extends Controller
{
    public function createQrisPayment(Request $request)
    {
        try {
            // Validate request
            $validated = $request->validate([
                'order_id' => 'required|exists:orders,order_id',
            ]);

            // Load order
            $order = Order::findOrFail($validated['order_id']);

            Log::info('QRIS Payment Request', [
                'order_id' => $order->order_id,
                'status' => $order->status,
                'payment_method' => $order->payment_method ?? 'unknown',
                'total_price' => $order->total_price,
            ]);

            // Check if order is still pending
            if (strtolower($order->status) !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order is not in pending status. Current status: ' . $order->status,
                ], 400);
            }

            // Check if payment already exists and is successful
            $existingPayment = PaymentTransaction::where('order_id', $order->order_id)
                ->where('status', 'settlement')
                ->first();
                
            if ($existingPayment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order has already been paid',
                ], 400);
            }

            // Configure Midtrans SDK
            $this->configureMidtrans();

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
                    'phone' => $order->phone_number ?? '',
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

            Log::info('Calling Midtrans CoreApi::charge', [
                'midtrans_order_id' => $midtransOrderId,
                'gross_amount' => (int)$order->total_price,
            ]);

            // Call Midtrans Core API using HTTP client instead of SDK to avoid parsing issues
            $response = $this->callMidtransApi($payload);

            Log::info('Midtrans response received', [
                'status_code' => $response['status_code'] ?? 'unknown',
                'transaction_id' => $response['transaction_id'] ?? 'null',
                'transaction_status' => $response['transaction_status'] ?? 'null',
                'has_actions' => isset($response['actions']),
            ]);

            // Check for errors
            if (isset($response['status_code']) && $response['status_code'] >= 400) {
                Log::error('Midtrans API error response', [
                    'status_code' => $response['status_code'],
                    'error_message' => $response['error_message'] ?? 'Unknown error',
                    'response' => $response,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => $response['error_message'] ?? 'Midtrans API error',
                ], 400);
            }

            // Extract transaction ID
            $transactionId = $response['transaction_id'] ?? null;

            // Find QR code URL in actions array
            $qrUrl = null;
            if (isset($response['actions']) && is_array($response['actions'])) {
                foreach ($response['actions'] as $action) {
                    if (isset($action['name']) && in_array($action['name'], ['generate-qr-code', 'generate-qr-code-v2'])) {
                        $qrUrl = $action['url'] ?? null;
                        break;
                    }
                }
            }

            if (!$qrUrl) {
                Log::warning('QR URL not found in Midtrans response', [
                    'response_keys' => array_keys((array)$response),
                    'actions_count' => isset($response->actions) ? count($response->actions) : 0,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate QR code from Midtrans',
                ], 500);
            }

            // Calculate expiry time (5 minutes from now)
            $expiredAt = now()->addMinutes(5);

            // Create or update payment transaction record
            $paymentTransaction = PaymentTransaction::updateOrCreate(
                ['order_id' => $order->order_id],
                [
                    'order_id' => $order->order_id,
                    'midtrans_order_id' => $midtransOrderId,
                    'midtrans_transaction_id' => $transactionId,
                    'payment_type' => 'qris',
                    'gross_amount' => (int)$order->total_price,
                    'qr_url' => $qrUrl,
                    'status' => 'pending',
                    'expired_at' => $expiredAt,
                ]
            );

            Log::info('Payment transaction created/updated', [
                'qris_transaction_id' => $paymentTransaction->qris_transaction_id,
                'order_id' => $order->order_id,
            ]);

            // Update order payment status
            $order->update([
                'payment_status' => 'pending',
            ]);

            return response()->json([
                'success' => true,
                'order_id' => $order->order_id,
                'qris' => [
                    'qr_url' => $qrUrl,
                    'expired_at' => $expiredAt->toIso8601String(),
                    'status' => 'pending',
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('QRIS payment creation error', [
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Configure Midtrans SDK for API calls
     */
    private function configureMidtrans(): void
    {
        Config::$serverKey = config('midtrans.server_key');
        Config::$clientKey = config('midtrans.client_key');
        Config::$isProduction = config('midtrans.is_production', false);
        Config::$isSanitized = config('midtrans.is_sanitized', true);
        Config::$is3ds = config('midtrans.is_3ds', true);
        
        // Remove SSL verification for localhost/development
        if (!Config::$isProduction) {
            Config::$curlOptions[CURLOPT_SSL_VERIFYHOST] = 0;
            Config::$curlOptions[CURLOPT_SSL_VERIFYPEER] = 0;
        }

        Log::debug('Midtrans configured', [
            'is_production' => Config::$isProduction,
            'server_key_first_10' => substr(Config::$serverKey, 0, 10),
        ]);
    }

    /**
     * Call Midtrans Core API via HTTP
     * Uses curl directly to avoid SDK parsing issues
     */
    private function callMidtransApi(array $payload): array
    {
        $serverKey = config('midtrans.server_key');
        $isProduction = config('midtrans.is_production', false);
        $baseUrl = $isProduction ? 'https://app.midtrans.com' : 'https://api.sandbox.midtrans.com';
        
        $url = $baseUrl . '/v2/charge';

        // Create proper authorization header (Base64 encode server_key:)
        $authHeader = 'Authorization: Basic ' . base64_encode($serverKey . ':');

        Log::info('Preparing Midtrans API call', [
            'url' => $url,
            'server_key_length' => strlen($serverKey),
            'is_production' => $isProduction,
            'payload_keys' => array_keys($payload),
        ]);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            $authHeader,
        ]);
        
        // Disable SSL verification for development
        if (!$isProduction) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        Log::debug('Midtrans API call', [
            'url' => $url,
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'response_length' => strlen($response ?? ''),
            'response_preview' => substr($response ?? '', 0, 200),
        ]);

        if ($curlError) {
            Log::error('Curl error calling Midtrans', [
                'error' => $curlError,
                'http_code' => $httpCode,
            ]);
            return [
                'status_code' => 500,
                'error_message' => 'Failed to connect to Midtrans: ' . $curlError,
            ];
        }

        if (!$response) {
            Log::error('Empty response from Midtrans', [
                'http_code' => $httpCode,
            ]);
            return [
                'status_code' => $httpCode,
                'error_message' => 'Empty response from Midtrans',
            ];
        }

        $decoded = json_decode($response, true);
        
        if ($decoded === null) {
            Log::error('Failed to decode Midtrans response', [
                'response' => $response,
                'http_code' => $httpCode,
                'json_error' => json_last_error_msg(),
            ]);
            return [
                'status_code' => $httpCode,
                'error_message' => 'Invalid JSON response from Midtrans: ' . json_last_error_msg(),
            ];
        }

        // Add status code to response
        $decoded['status_code'] = $httpCode;
        
        Log::debug('Midtrans API response decoded', [
            'status_code' => $httpCode,
            'has_actions' => isset($decoded['actions']),
            'transaction_id' => $decoded['transaction_id'] ?? null,
        ]);
        
        return $decoded;
    }
}

