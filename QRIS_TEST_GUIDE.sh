#!/bin/bash
# QRIS Payment Flow Test Script
# This script tests the QRIS payment creation flow

echo "======================================"
echo "QRIS Payment Flow Test"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:8000/api"
HEADERS="-H 'Content-Type: application/json'"

echo -e "${YELLOW}Test 1: Check if order exists${NC}"
echo "This will help us find an order_id to test with"
echo ""

# Try to fetch orders (you may need to adjust this based on your API)
echo "Query: List recent orders from database"
echo "Command: mysql -u root -proot 5scent_db -e \"SELECT order_id, status, total_price, payment_method FROM orders ORDER BY order_id DESC LIMIT 5;\""
echo ""
echo -e "${YELLOW}Expected Output:${NC} Table with order_id, status, total_price, payment_method"
echo ""

echo "======================================"
echo -e "${YELLOW}Test 2: Call POST /api/payments/qris${NC}"
echo "======================================"
echo ""

# Get latest order_id
ORDER_ID="57"  # Replace with actual order_id

echo "Testing with Order ID: $ORDER_ID"
echo ""
echo "Command:"
echo "curl -X POST '$API_BASE_URL/payments/qris' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"order_id\":$ORDER_ID}'"
echo ""

echo -e "${YELLOW}Expected Response (Success):${NC}"
cat << 'EOF'
{
  "success": true,
  "order_id": 57,
  "qris_transaction_id": 19,
  "qris": {
    "qr_url": "https://api.sandbox.midtrans.com/v2/...",
    "expired_at": "2025-12-11T23:50:00+07:00",
    "status": "pending",
    "midtrans_order_id": "ORDER-57-1765471100",
    "midtrans_transaction_id": "8d182248-9b1d-4fb5-9eae-2c7a3e6d5f4c"
  }
}
EOF
echo ""

echo -e "${YELLOW}Expected Response (Error - before fix):${NC}"
cat << 'EOF'
{
  "success": false,
  "message": "Failed to create QRIS payment: ..."
}
EOF
echo ""

echo "======================================"
echo -e "${YELLOW}Test 3: Check Laravel Log${NC}"
echo "======================================"
echo ""

echo "Command:"
echo "tail -50 storage/logs/laravel.log | grep -A5 'Calling Midtrans Core API'"
echo ""

echo -e "${YELLOW}Expected Log Output (Success):${NC}"
cat << 'EOF'
[2025-12-11 23:45:00] local.INFO: Calling Midtrans Core API {
  "endpoint":"v2/charge",
  "midtrans_order_id":"ORDER-57-...",
  "gross_amount":210000,
  "item_details_count":2,
  "items_total_calculated":210000
}

[2025-12-11 23:45:00] local.INFO: QRIS transaction created/updated successfully {
  "qris_transaction_id":19,
  "order_id":57,
  "midtrans_transaction_id":"8d182248-..."
}
EOF
echo ""

echo "======================================"
echo -e "${YELLOW}Test 4: Verify Database${NC}"
echo "======================================"
echo ""

echo "Check qris_transactions table:"
echo "mysql -u root -proot 5scent_db -e \"SELECT * FROM qris_transactions WHERE order_id = $ORDER_ID;\""
echo ""

echo -e "${YELLOW}Expected Columns:${NC}"
echo "- qris_transaction_id: Should have a value"
echo "- order_id: Should be $ORDER_ID"
echo "- midtrans_order_id: Should start with 'ORDER-'"
echo "- midtrans_transaction_id: Should have a UUID-like value"
echo "- qr_url: Should be a long URL"
echo "- status: Should be 'pending'"
echo "- expired_at: Should be within 5 minutes from now"
echo ""

echo "======================================"
echo -e "${YELLOW}Test 5: Frontend Navigation${NC}"
echo "======================================"
echo ""

echo "After successful QRIS creation:"
echo "1. Check browser network tab - should see 200 response from POST /api/payments/qris"
echo "2. Check browser redirects to: /orders/$ORDER_ID/qris"
echo "3. Check QR code is displayed on the page"
echo ""

echo "======================================"
echo -e "${GREEN}Test Complete!${NC}"
echo "======================================"
