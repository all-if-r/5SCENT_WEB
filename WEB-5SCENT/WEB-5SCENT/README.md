# 5SCENT - Premium Perfume Ecommerce

A full-stack monorepo for a luxury perfume ecommerce website built with Laravel 12 and Next.js 16.

## 🏗️ Project Structure

```
WEB-5SCENT/
├── backend/
│   └── laravel-5scent/     # Laravel 12 API
└── frontend/
    └── web-5scent/         # Next.js 16 Frontend
```

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
composer install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Generate application key:
```bash
php artisan key:generate
```

5. Configure database in `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=5scent_db
DB_USERNAME=root
DB_PASSWORD=
```

6. Run migrations:
```bash
php artisan migrate
```

7. Seed database:
```bash
php artisan db:seed
```

8. Create storage link:
```bash
php artisan storage:link
```

9. Start server:
```bash
php artisan serve
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend/web-5scent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

4. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📋 Features

### Customer Features
- ✅ Product browsing and search
- ✅ Product detail pages with images and descriptions
- ✅ Shopping cart
- ✅ Checkout with COD and QRIS payment
- ✅ Order tracking
- ✅ Order history with status grouping
- ✅ Product ratings and reviews
- ✅ User profile management
- ✅ Wishlist

### Admin Features
- ✅ Admin dashboard with statistics
- ✅ Product CRUD operations
- ✅ Order management
- ✅ Order status updates
- ✅ Tracking number upload
- ✅ Sales reports
- ✅ Point of Sale (POS) system

## 🗄️ Database Schema

### Main Tables
- `users` - Customer accounts
- `admin` - Admin accounts
- `products` - Product catalog
- `productimage` - Product images
- `cart` - Shopping cart items
- `wishlist` - User wishlists
- `orders` - Order headers
- `orderdetail` - Order line items
- `payments` - Payment records
- `rating` - Product ratings
- `pos_item` - POS items
- `pos_transaction` - POS transactions

## 🔐 Authentication

- **Customer Auth**: Laravel Sanctum
- **Admin Auth**: Laravel Sanctum (separate guard)

## 💳 Payment Integration

- **COD**: Cash on Delivery
- **QRIS**: Integrated with Midtrans API

### Midtrans Configuration

Add to `.env`:
```env
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false
```

## 📦 Order Status Flow

1. **Pending** - Order placed, awaiting payment
2. **Packaging** - Payment confirmed, order being prepared
3. **Shipping** - Order shipped with tracking number
4. **Delivered** - Order completed
5. **Cancel** - Order cancelled (only during Packaging)

## 🛠️ Tech Stack

### Backend
- Laravel 12
- PHP 8.2+
- MySQL/MariaDB
- Laravel Sanctum
- Laravel Pint, Sail, PHPUnit

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Headless UI
- Heroicons
- Lucide React
- Framer Motion
- Axios

## 📝 API Endpoints

### Public
- `GET /api/products` - List products
- `GET /api/products/{id}` - Product details
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Protected (User)
- `GET /api/me` - Get current user
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/{id}` - Update cart item
- `DELETE /api/cart/{id}` - Remove from cart
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create order
- `POST /api/orders/{id}/cancel` - Cancel order
- `POST /api/orders/{id}/finish` - Finish order
- `POST /api/ratings` - Submit rating

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/dashboard/orders` - List orders
- `PUT /api/admin/dashboard/orders/{id}/status` - Update order status
- `GET /api/admin/products` - List products (admin)
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/{id}` - Update product
- `DELETE /api/admin/products/{id}` - Delete product
- `GET /api/admin/pos/items` - List POS items
- `POST /api/admin/pos/transactions` - Create POS transaction

## 🎨 Design

- **Header Font**: Poppins
- **Body Font**: SF Pro Display
- **Primary Color**: Purple (#d946ef)
- **Modern, clean UI** with proper spacing and alignment

## 📄 License

MIT



