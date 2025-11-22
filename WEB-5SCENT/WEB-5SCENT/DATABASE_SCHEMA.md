# 🗄️ Database Schema

Complete database schema for 5SCENT.

## Tables Overview

### Core Tables

1. **users** - Customer accounts
2. **admin** - Admin accounts
3. **products** - Product catalog
4. **productimage** - Product images
5. **cart** - Shopping cart
6. **wishlist** - User wishlists
7. **orders** - Order headers
8. **orderdetail** - Order line items
9. **payments** - Payment records
10. **rating** - Product ratings

### POS Tables

11. **pos_item** - POS items
12. **pos_transaction** - POS transactions

### System Tables

13. **sessions** - User sessions
14. **notification** - Notifications
15. **personal_access_tokens** - Sanctum tokens
16. **migrations** - Migration tracking

## Detailed Schema

### users

```sql
id                  BIGINT PRIMARY KEY
name                VARCHAR(255)
email               VARCHAR(255) UNIQUE
email_verified_at   TIMESTAMP NULL
password            VARCHAR(255)
phone               VARCHAR(20) NULL
address             TEXT NULL
profile_picture     VARCHAR(255) NULL
remember_token      VARCHAR(100) NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### admin

```sql
id                  BIGINT PRIMARY KEY
name                VARCHAR(255)
email               VARCHAR(255) UNIQUE
email_verified_at   TIMESTAMP NULL
password            VARCHAR(255)
remember_token      VARCHAR(100) NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### products

```sql
id                  BIGINT PRIMARY KEY
name                VARCHAR(255)
description         TEXT
notes               TEXT NULL
category            ENUM('Day', 'Night')
price_30ml          DECIMAL(10,2)
price_50ml          DECIMAL(10,2)
stock_30ml          INTEGER DEFAULT 0
stock_50ml          INTEGER DEFAULT 0
is_best_seller      BOOLEAN DEFAULT false
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### productimage

```sql
id                  BIGINT PRIMARY KEY
product_id          BIGINT FOREIGN KEY -> products.id
image_path          VARCHAR(255)
is_primary          BOOLEAN DEFAULT false
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### cart

```sql
id                  BIGINT PRIMARY KEY
user_id             BIGINT FOREIGN KEY -> users.id
product_id          BIGINT FOREIGN KEY -> products.id
size                ENUM('30ml', '50ml')
quantity            INTEGER
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### wishlist

```sql
id                  BIGINT PRIMARY KEY
user_id             BIGINT FOREIGN KEY -> users.id
product_id          BIGINT FOREIGN KEY -> products.id
created_at          TIMESTAMP
updated_at          TIMESTAMP
UNIQUE(user_id, product_id)
```

### orders

```sql
id                  BIGINT PRIMARY KEY
user_id             BIGINT FOREIGN KEY -> users.id
order_number        VARCHAR(255) UNIQUE
status              ENUM('Pending', 'Packaging', 'Shipping', 'Delivered', 'Cancel')
shipping_address    TEXT
tracking_number     VARCHAR(255) NULL
total_amount        DECIMAL(10,2)
payment_method      ENUM('COD', 'QRIS')
payment_status      ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending'
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### orderdetail

```sql
id                  BIGINT PRIMARY KEY
order_id            BIGINT FOREIGN KEY -> orders.id
product_id          BIGINT FOREIGN KEY -> products.id
size                ENUM('30ml', '50ml')
quantity            INTEGER
price               DECIMAL(10,2)
subtotal            DECIMAL(10,2)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### payments

```sql
id                          BIGINT PRIMARY KEY
order_id                    BIGINT FOREIGN KEY -> orders.id
payment_method              ENUM('COD', 'QRIS')
payment_status              ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending'
transaction_id              VARCHAR(255) NULL
midtrans_order_id           VARCHAR(255) NULL
midtrans_transaction_id     VARCHAR(255) NULL
amount                      DECIMAL(10,2)
paid_at                     TIMESTAMP NULL
created_at                  TIMESTAMP
updated_at                  TIMESTAMP
```

### rating

```sql
id                  BIGINT PRIMARY KEY
user_id             BIGINT FOREIGN KEY -> users.id
product_id          BIGINT FOREIGN KEY -> products.id
order_id            BIGINT FOREIGN KEY -> orders.id
rating              INTEGER (1-5)
comment             TEXT NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### pos_item

```sql
id                  BIGINT PRIMARY KEY
item_code           VARCHAR(255) UNIQUE
name                VARCHAR(255)
unit_price          DECIMAL(10,2)
stock               INTEGER DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### pos_transaction

```sql
id                  BIGINT PRIMARY KEY
transaction_number  VARCHAR(255)
item_code           VARCHAR(255) FOREIGN KEY -> pos_item.item_code
quantity            INTEGER
unit_price          DECIMAL(10,2)
subtotal            DECIMAL(10,2)
total               DECIMAL(10,2)
money_given         DECIMAL(10,2)
change              DECIMAL(10,2)
transaction_date    TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## Relationships

### User Relationships
- `users` → `cart` (one-to-many)
- `users` → `wishlist` (one-to-many)
- `users` → `orders` (one-to-many)
- `users` → `rating` (one-to-many)

### Product Relationships
- `products` → `productimage` (one-to-many)
- `products` → `cart` (one-to-many)
- `products` → `wishlist` (one-to-many)
- `products` → `orderdetail` (one-to-many)
- `products` → `rating` (one-to-many)

### Order Relationships
- `orders` → `orderdetail` (one-to-many)
- `orders` → `payments` (one-to-one)
- `orders` → `rating` (one-to-many)

### POS Relationships
- `pos_item` → `pos_transaction` (one-to-many)

## Indexes

- `users.email` - UNIQUE
- `admin.email` - UNIQUE
- `orders.order_number` - UNIQUE
- `pos_item.item_code` - UNIQUE
- `wishlist(user_id, product_id)` - UNIQUE

## Constraints

- Foreign key constraints on all relationships
- Check constraints on ENUM fields
- NOT NULL constraints on required fields
- UNIQUE constraints on email and order_number fields

## Seed Data

Default seed data includes:
- 1 admin user (admin@5scent.com)
- 1 test user (user@test.com)
- 3 sample products with images

Run: `php artisan db:seed`



