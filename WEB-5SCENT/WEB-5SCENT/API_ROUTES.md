# 🔌 API Routes Documentation

Complete API endpoint documentation for 5SCENT.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Most endpoints require authentication via Laravel Sanctum. Include token in header:

```
Authorization: Bearer {token}
```

## Public Endpoints

### Authentication

#### Register
```
POST /register
Body: {
  name: string,
  email: string,
  password: string,
  password_confirmation: string,
  phone?: string
}
Response: { user, token }
```

#### Login
```
POST /login
Body: { email: string, password: string }
Response: { user, token }
```

### Products

#### List Products
```
GET /products?search=&category=&best_seller=
Response: { data: Product[], ...pagination }
```

#### Get Product
```
GET /products/{id}
Response: Product
```

## Protected User Endpoints

### Profile

#### Get Current User
```
GET /me
Response: User
```

#### Update Profile
```
PUT /profile
Body: FormData {
  name?: string,
  email?: string,
  phone?: string,
  address?: string,
  profile_picture?: File
}
Response: User
```

#### Change Password
```
POST /profile/change-password
Body: {
  current_password: string,
  password: string,
  password_confirmation: string
}
Response: { message: string }
```

### Cart

#### Get Cart
```
GET /cart
Response: { items: CartItem[], total: number }
```

#### Add to Cart
```
POST /cart
Body: {
  product_id: number,
  size: '30ml' | '50ml',
  quantity: number
}
Response: CartItem
```

#### Update Cart Item
```
PUT /cart/{id}
Body: { quantity: number }
Response: CartItem
```

#### Remove from Cart
```
DELETE /cart/{id}
Response: { message: string }
```

### Wishlist

#### Get Wishlist
```
GET /wishlist
Response: WishlistItem[]
```

#### Add to Wishlist
```
POST /wishlist
Body: { product_id: number }
Response: WishlistItem
```

#### Remove from Wishlist
```
DELETE /wishlist/{id}
Response: { message: string }
```

### Orders

#### List Orders
```
GET /orders
Response: {
  in_process: Order[],
  shipping: Order[],
  completed: Order[],
  canceled: Order[]
}
```

#### Create Order
```
POST /orders
Body: {
  cart_ids: number[],
  shipping_address: string,
  payment_method: 'COD' | 'QRIS'
}
Response: Order
```

#### Get Order
```
GET /orders/{id}
Response: Order
```

#### Cancel Order
```
POST /orders/{id}/cancel
Response: { message: string }
```

#### Finish Order
```
POST /orders/{id}/finish
Response: { message: string }
```

### Ratings

#### Submit Rating
```
POST /ratings
Body: {
  product_id: number,
  order_id: number,
  rating: number (1-5),
  comment?: string
}
Response: Rating
```

### Payments

#### Create QRIS Payment
```
POST /payments/qris
Body: { order_id: number }
Response: { token: string, redirect_url?: string }
```

## Admin Endpoints

### Authentication

#### Admin Login
```
POST /admin/login
Body: { email: string, password: string }
Response: { admin, token }
```

#### Get Admin Info
```
GET /admin/me
Response: Admin
```

### Dashboard

#### Get Statistics
```
GET /admin/dashboard/stats
Response: {
  stats: {
    total_orders: number,
    total_revenue: number,
    total_products: number,
    total_users: number
  },
  recent_orders: Order[]
}
```

#### List Orders
```
GET /admin/dashboard/orders?status=
Response: { data: Order[], ...pagination }
```

#### Update Order Status
```
PUT /admin/dashboard/orders/{id}/status
Body: {
  status: 'Pending' | 'Packaging' | 'Shipping' | 'Delivered' | 'Cancel',
  tracking_number?: string
}
Response: Order
```

#### Sales Report
```
GET /admin/dashboard/sales-report?start_date=&end_date=
Response: {
  period: { start, end },
  total_revenue: number,
  total_orders: number,
  orders: Order[]
}
```

### Products (Admin)

#### Create Product
```
POST /admin/products
Body: FormData {
  name: string,
  description: string,
  notes?: string,
  category: 'Day' | 'Night',
  price_30ml: number,
  price_50ml: number,
  stock_30ml: number,
  stock_50ml: number,
  is_best_seller?: boolean,
  images: File[]
}
Response: Product
```

#### Update Product
```
PUT /admin/products/{id}
Body: FormData { ...same as create }
Response: Product
```

#### Delete Product
```
DELETE /admin/products/{id}
Response: { message: string }
```

### POS

#### List POS Items
```
GET /admin/pos/items
Response: PosItem[]
```

#### Get Item by Code
```
GET /admin/pos/items/code/{code}
Response: PosItem
```

#### Create POS Item
```
POST /admin/pos/items
Body: {
  item_code: string,
  name: string,
  unit_price: number,
  stock: number
}
Response: PosItem
```

#### Update POS Item
```
PUT /admin/pos/items/{id}
Body: { ...same as create }
Response: PosItem
```

#### Delete POS Item
```
DELETE /admin/pos/items/{id}
Response: { message: string }
```

#### Create Transaction
```
POST /admin/pos/transactions
Body: {
  items: [{ item_code: string, quantity: number }],
  money_given: number
}
Response: { transaction, all_items }
```

#### Get Transaction
```
GET /admin/pos/transactions/{transactionNumber}
Response: PosTransaction[]
```

## Webhooks

### Midtrans Webhook
```
POST /payments/webhook
Body: Midtrans notification data
Response: { message: string }
```

## Error Responses

All errors follow this format:

```json
{
  "message": "Error message",
  "errors": {
    "field": ["Error detail"]
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Rate Limiting

API endpoints are rate-limited. Check response headers for rate limit information.



