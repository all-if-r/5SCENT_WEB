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

            // Load order with relationships for Midtrans payload
            $order->load(['user', 'details.product']);

            // Configure Midtrans SDK
            $this->configureMidtrans();

            // Generate unique Midtrans order ID
            $midtransOrderId = 'ORDER-' . $order->order_id . '-' . time();

            // Get current time with timezone +0700 (WIB)
            $now = new \DateTime('now', new \DateTimeZone('Asia/Jakarta'));
            $orderTime = $now->format('Y-m-d H:i:s O');

            // Build complete customer details from database
            $customer = $order->user;
            $customerDetails = [
                'first_name' => $customer->name ?? 'Customer',
                'email' => $customer->email ?? 'customer@example.com',
                'phone' => $customer->phone ?? $order->phone_number ?? '',
                'billing_address' => [
                    'first_name' => $customer->name ?? 'Customer',
                    'phone' => $customer->phone ?? $order->phone_number ?? '',
                    'address' => $order->address_line ?? '',
                    'city' => $order->city ?? '',
                    'postal_code' => $order->postal_code ?? '',
                    'country_code' => 'IDN',
                ],
                'shipping_address' => [
                    'first_name' => $customer->name ?? 'Customer',
                    'phone' => $order->phone_number ?? $customer->phone ?? '',
                    'address' => $order->address_line ?? '',
                    'city' => $order->city ?? '',
                    'postal_code' => $order->postal_code ?? '',
                    'country_code' => 'IDN',
                ],
            ];

            // Build item details from order details and products
            $itemDetails = [];
            $itemsTotal = 0;
            
            foreach ($order->details as $detail) {
                $product = $detail->product;
                if ($product) {
                    $itemPrice = (int)$detail->price;
                    $itemQuantity = (int)$detail->quantity;
                    $subtotal = $itemPrice * $itemQuantity;
                    
                    $itemDetails[] = [
                        'id' => (string)$product->product_id,
                        'price' => $itemPrice,
                        'quantity' => $itemQuantity,
                        'name' => $product->name . ' (' . $detail->size . ')',
                    ];
                    
                    $itemsTotal += $subtotal;
                }
            }

            // Ensure item_details sum matches gross_amount (Midtrans requirement)
            $grossAmount = (int)$order->total_price;
            
            if (empty($itemDetails)) {
                // If no items found, create a generic item
                Log::warning('No order details found, creating generic item', [
                    'order_id' => $order->order_id,
                    'gross_amount' => $grossAmount,
                ]);
                $itemDetails = [
                    [
                        'id' => 'ORDER',
                        'price' => $grossAmount,
                        'quantity' => 1,
                        'name' => 'Order #' . $order->order_id,
                    ]
                ];
            } elseif ($itemsTotal !== $grossAmount) {
                // If items total doesn't match gross amount, adjust by creating adjustment item
                $difference = $grossAmount - $itemsTotal;
                Log::info('Adjusting item details to match gross amount', [
                    'order_id' => $order->order_id,
                    'items_total' => $itemsTotal,
                    'gross_amount' => $grossAmount,
                    'difference' => $difference,
                ]);
                
                if ($difference !== 0) {
                    $itemDetails[] = [
                        'id' => 'ADJUSTMENT',
                        'price' => $difference,
                        'quantity' => 1,
                        'name' => 'Adjustment',
                    ];
                }
            }

            // Build QRIS charge payload with complete details
            $payload = [
                'payment_type' => 'qris',
                'transaction_details' => [
                    'order_id' => $midtransOrderId,
                    'gross_amount' => $grossAmount,
                ],
                'customer_details' => $customerDetails,
                'item_details' => $itemDetails,
                'qris' => [
                    'acquirer' => 'gopay',
                ],
                'custom_expiry' => [
                    'order_time' => $orderTime,
                    'expiry_duration' => 1,
                    'unit' => 'minute',
                ],
            ];

            Log::info('Calling Midtrans Core API', [
                'endpoint' => 'v2/charge',
                'midtrans_order_id' => $midtransOrderId,
                'gross_amount' => $grossAmount,
                'customer_email' => $customer->email,
                'item_details_count' => count($itemDetails),
                'items_total_calculated' => array_sum(array_map(fn($item) => $item['price'] * $item['quantity'], $itemDetails)),
            ]);

            // Call Midtrans Core API
            $response = $this->callMidtransApi($payload);

            Log::info('Midtrans API response received', [
                'status_code' => $response['status_code'] ?? 'unknown',
                'transaction_id' => $response['transaction_id'] ?? 'null',
                'transaction_status' => $response['transaction_status'] ?? 'null',
                'payment_type' => $response['payment_type'] ?? 'unknown',
                'has_actions' => isset($response['actions']),
                'actions_count' => isset($response['actions']) ? count($response['actions']) : 0,
            ]);

            // Check for errors in response
            if (isset($response['status_code']) && $response['status_code'] >= 400) {
                Log::error('Midtrans API returned error status', [
                    'status_code' => $response['status_code'],
                    'error_id' => $response['id'] ?? null,
                    'error_message' => $response['error_message'] ?? 'Unknown error',
                    'status_message' => $response['status_message'] ?? null,
                    'full_response' => json_encode($response),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create QRIS payment: ' . ($response['error_message'] ?? 'Midtrans error'),
                ], 400);
            }

            // Validate response has required fields
            if (!isset($response['transaction_id']) || !isset($response['order_id'])) {
                Log::error('Midtrans response missing required fields', [
                    'response' => $response,
                    'has_transaction_id' => isset($response['transaction_id']),
                    'has_order_id' => isset($response['order_id']),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Invalid response from Midtrans API',
                ], 500);
            }

            // Extract transaction details
            $transactionId = $response['transaction_id'];

            // Find QR code URL in actions array
            $qrUrl = null;
            if (isset($response['actions']) && is_array($response['actions'])) {
                Log::debug('Searching for QR code in actions', [
                    'actions_count' => count($response['actions']),
                    'action_names' => array_column($response['actions'], 'name'),
                ]);

                foreach ($response['actions'] as $action) {
                    if (isset($action['name']) && 
                        ($action['name'] === 'generate-qr-code' || 
                         $action['name'] === 'generate-qr-code-v2' ||
                         strpos($action['name'], 'qr') !== false)) {
                        $qrUrl = $action['url'] ?? null;
                        Log::debug('Found QR code URL', [
                            'action_name' => $action['name'],
                            'qr_url' => substr($qrUrl, 0, 50) . '...',
                        ]);
                        break;
                    }
                }
            }

            if (!$qrUrl) {
                Log::error('QR URL not found in Midtrans response', [
                    'transaction_id' => $transactionId,
                    'actions_present' => isset($response['actions']),
                    'full_response' => json_encode($response),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to extract QR code URL from Midtrans response',
                ], 500);
            }

            // Extract transaction status from response
            $transactionStatus = $response['transaction_status'] ?? 'pending';

            // Set expiry time to 1 minute (matching Midtrans custom_expiry setting)
            $expiredAt = now()->addMinutes(1);

            Log::debug('Midtrans response fully processed', [
                'transaction_id' => $transactionId,
                'transaction_status' => $transactionStatus,
                'qr_url_length' => strlen($qrUrl),
                'will_expire_at' => $expiredAt->toIso8601String(),
            ]);

            // Create or update payment transaction record with Midtrans response data
            $paymentTransaction = PaymentTransaction::updateOrCreate(
                ['order_id' => $order->order_id],
                [
                    'order_id' => $order->order_id,
                    'midtrans_order_id' => $midtransOrderId,
                    'midtrans_transaction_id' => $transactionId,
                    'payment_type' => $response['payment_type'] ?? 'qris',
                    'gross_amount' => $response['gross_amount'] ?? (int)$order->total_price,
                    'qr_url' => $qrUrl,
                    'status' => $transactionStatus,
                    'expired_at' => $expiredAt,
                    'raw_notification' => json_encode($response),
                ]
            );

            Log::info('QRIS transaction created/updated successfully', [
                'qris_transaction_id' => $paymentTransaction->qris_transaction_id,
                'order_id' => $order->order_id,
                'midtrans_transaction_id' => $transactionId,
                'status' => $transactionStatus,
            ]);

            // Update order payment status
            $order->update([
                'payment_status' => 'pending',
            ]);

            Log::info('QRIS payment response sent to frontend', [
                'order_id' => $order->order_id,
                'qris_transaction_id' => $paymentTransaction->qris_transaction_id,
                'qr_url_available' => !empty($qrUrl),
            ]);

            return response()->json([
                'success' => true,
                'order_id' => $order->order_id,
                'qris_transaction_id' => $paymentTransaction->qris_transaction_id,
                'qris' => [
                    'qr_url' => $qrUrl,
                    'expired_at' => $expiredAt->toIso8601String(),
                    'status' => $transactionStatus,
                    'midtrans_order_id' => $midtransOrderId,
                    'midtrans_transaction_id' => $transactionId,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Order not found in QRIS payment creation', [
                'order_id' => $validated['order_id'] ?? null,
                'exception' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Unexpected error in QRIS payment creation', [
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred while creating QRIS payment',
                'error_details' => config('app.debug') ? $e->getMessage() : null,
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

