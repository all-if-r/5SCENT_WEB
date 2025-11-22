# 📁 File Structure

Complete file structure of the 5SCENT monorepo.

## Backend Structure

```
backend/laravel-5scent/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       ├── AdminAuthController.php
│   │       ├── AuthController.php
│   │       ├── CartController.php
│   │       ├── DashboardController.php
│   │       ├── OrderController.php
│   │       ├── PaymentController.php
│   │       ├── PosController.php
│   │       ├── ProductController.php
│   │       ├── ProfileController.php
│   │       ├── RatingController.php
│   │       └── WishlistController.php
│   ├── Models/
│   │   ├── Admin.php
│   │   ├── Cart.php
│   │   ├── Order.php
│   │   ├── OrderDetail.php
│   │   ├── Payment.php
│   │   ├── PosItem.php
│   │   ├── PosTransaction.php
│   │   ├── Product.php
│   │   ├── ProductImage.php
│   │   ├── Rating.php
│   │   ├── User.php
│   │   └── Wishlist.php
│   ├── Services/
│   │   ├── MidtransService.php
│   │   └── OrderService.php
│   └── Providers/
│       └── AppServiceProvider.php
├── config/
│   ├── app.php
│   ├── database.php
│   ├── filesystems.php
│   ├── midtrans.php
│   └── sanctum.php
├── database/
│   ├── migrations/
│   │   ├── 2024_01_01_000001_create_users_table.php
│   │   ├── 2024_01_01_000002_create_admin_table.php
│   │   ├── 2024_01_01_000003_create_products_table.php
│   │   ├── 2024_01_01_000004_create_product_images_table.php
│   │   ├── 2024_01_01_000005_create_cart_table.php
│   │   ├── 2024_01_01_000006_create_wishlist_table.php
│   │   ├── 2024_01_01_000007_create_orders_table.php
│   │   ├── 2024_01_01_000008_create_order_details_table.php
│   │   ├── 2024_01_01_000009_create_payments_table.php
│   │   ├── 2024_01_01_000010_create_ratings_table.php
│   │   ├── 2024_01_01_000011_create_pos_items_table.php
│   │   ├── 2024_01_01_000012_create_pos_transactions_table.php
│   │   ├── 2024_01_01_000013_create_sessions_table.php
│   │   └── 2024_01_01_000014_create_notifications_table.php
│   └── seeders/
│       └── DatabaseSeeder.php
├── routes/
│   ├── api.php
│   ├── web.php
│   └── console.php
├── storage/
│   └── app/
│       └── public/          # Public storage for images
├── .env.example
├── composer.json
└── artisan
```

## Frontend Structure

```
frontend/web-5scent/
├── app/
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── pos/
│   │       └── page.tsx
│   ├── cart/
│   │   └── page.tsx
│   ├── checkout/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── orders/
│   │   └── page.tsx
│   ├── products/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── profile/
│   │   ├── MyAccountTab.tsx
│   │   └── MyOrdersTab.tsx
│   ├── AddToCartButton.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── Navigation.tsx
│   ├── ProductGrid.tsx
│   └── ProfileModal.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   └── ToastContext.tsx
├── lib/
│   ├── api.ts
│   └── utils.ts
├── public/
│   └── (static assets)
├── .env.local.example
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

## Key Directories

### Backend

- **app/Http/Controllers**: All API controllers
- **app/Models**: Eloquent models
- **app/Services**: Business logic services
- **database/migrations**: Database schema migrations
- **routes/api.php**: API route definitions
- **storage/app/public**: Public file storage (images)

### Frontend

- **app/**: Next.js App Router pages
- **components/**: Reusable React components
- **contexts/**: React context providers
- **lib/**: Utility functions and API client
- **public/**: Static assets

## File Naming Conventions

- **Controllers**: PascalCase (e.g., `ProductController.php`)
- **Models**: PascalCase (e.g., `Product.php`)
- **Migrations**: Snake_case with timestamp (e.g., `2024_01_01_000001_create_users_table.php`)
- **Components**: PascalCase (e.g., `ProductGrid.tsx`)
- **Pages**: lowercase (e.g., `page.tsx`)
- **Utilities**: camelCase (e.g., `api.ts`)

## Important Files

### Backend
- `.env` - Environment configuration
- `routes/api.php` - All API endpoints
- `composer.json` - PHP dependencies

### Frontend
- `.env.local` - Frontend environment variables
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `package.json` - Node.js dependencies



