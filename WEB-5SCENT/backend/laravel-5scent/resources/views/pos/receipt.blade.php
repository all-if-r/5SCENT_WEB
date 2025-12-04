<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 20px;
            background: #fff;
        }

        .receipt {
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            background: #fff;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }

        .brand {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2.4px;
            font-family: 'Poppins', sans-serif;
        }

        .timestamp {
            font-size: 12px;
            text-align: right;
            color: #666;
        }

        /* Details Section */
        .details {
            margin-bottom: 30px;
            font-size: 13px;
        }

        .detail-row {
            margin-bottom: 8px;
        }

        .detail-label {
            font-weight: 600;
            display: inline-block;
            width: 140px;
            color: #333;
        }

        .detail-value {
            display: inline-block;
            color: #333;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
            font-size: 13px;
        }

        .items-table thead {
            background: #f5f5f5;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
        }

        .items-table th {
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #333;
        }

        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            color: #333;
        }

        .items-table tbody tr:last-child td {
            border-bottom: none;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        /* Totals Section */
        .totals {
            margin-bottom: 30px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 15px 0;
            font-size: 13px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .total-row.final {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 0;
        }

        .total-label {
            font-weight: 500;
        }

        .total-value {
            text-align: right;
        }

        /* Payment Method */
        .payment-method {
            margin-bottom: 30px;
            font-size: 13px;
        }

        .payment-row {
            margin-bottom: 8px;
        }

        /* Footer */
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }

        .footer-text {
            font-weight: 500;
            margin-bottom: 5px;
        }

        /* Currency Formatting */
        .currency {
            font-family: 'Courier New', monospace;
            font-weight: 500;
        }

        .size-quantity {
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="receipt">
        <!-- Header -->
        <div class="header">
            <div class="brand">5SCENT</div>
<<<<<<< HEAD
            <div class="timestamp">{{ $transaction->created_at->format('Y-m-d H:i:s') }}</div>
=======
            <div class="timestamp">{{ $transaction->date->format('Y-m-d H:i:s') }}</div>
>>>>>>> parent of 68c6cf8 (Ver 24.4)
        </div>

        <!-- Admin and Customer Details -->
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Admin:</span>
                <span class="detail-value">{{ $admin->name ?? 'Admin' }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer Name:</span>
                <span class="detail-value">{{ $transaction->customer_name }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Phone Number:</span>
                <span class="detail-value">{{ $transaction->phone }}</span>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                    <tr>
                        <td>{{ $item->product->name }}</td>
                        <td>{{ $item->size }}</td>
                        <td class="text-right">{{ $item->quantity }}</td>
                        <td class="text-right currency">Rp{{ number_format($item->price, 0, ',', '.') }}</td>
                        <td class="text-right currency">Rp{{ number_format($item->subtotal, 0, ',', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value currency">Rp{{ number_format($transaction->total_price, 0, ',', '.') }}</span>
            </div>

            @if($transaction->payment_method === 'Cash')
                <div class="total-row">
                    <span class="total-label">Cash Received:</span>
                    <span class="total-value currency">Rp{{ number_format($transaction->cash_received ?? 0, 0, ',', '.') }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Change:</span>
                    <span class="total-value currency">Rp{{ number_format($transaction->cash_change ?? 0, 0, ',', '.') }}</span>
                </div>
            @endif

            <div class="total-row final">
                <span class="total-label">Total:</span>
                <span class="total-value currency">Rp{{ number_format($transaction->total_price, 0, ',', '.') }}</span>
            </div>
        </div>

        <!-- Payment Method -->
        <div class="payment-method">
            <div class="payment-row">
                <strong>Payment Method: {{ str_replace('_', ' ', $transaction->payment_method) }}</strong>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">Thank you for shopping with 5SCENT</div>
            <div style="font-size: 11px; color: #999; margin-top: 10px;">
                Receipt ID: POS-{{ $transaction->transaction_id }}
            </div>
        </div>
    </div>
</body>
</html>
