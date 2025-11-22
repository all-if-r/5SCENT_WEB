# Schema Changes Summary

This document lists all the changes made to match the existing database schema.

## Backend Changes

### Table Names
- `users` → `user`
- `products` → `product`
- `productimage` (unchanged)
- `orderdetail` (unchanged)
- `pos_item` (unchanged)
- `pos_transaction` (unchanged)

### Primary Keys
All primary keys are now named with `_id` suffix:
- `id` → `user_id`, `product_id`, `order_id`, `cart_id`, etc.

### Column Name Changes

#### User Table
- `address` → Split into: `address_line`, `district`, `city`, `province`, `postal_code`
- `profile_picture` → `profile_pic`

#### Product Table
- `notes` → Split into: `top_notes`, `middle_notes`, `base_notes`
- Removed: `is_best_seller`

#### ProductImage Table
- `image_path` → `image_url`
- `is_primary` → `is_50ml` (1 = 50ml image, 0 = 30ml or extra)

#### Order Table
- `total_amount` → `total_price`
- Removed: `order_number`, `payment_method`, `payment_status`
- Payment info moved to `payment` table

#### OrderDetail Table
- `id` → `order_detail_id`

#### Payment Table
- `payment_method` → `method`
- `payment_status` → `status`
- Added: `transaction_time`

#### Rating Table
- `rating` → `stars`
- `id` → `rating_id`

#### Cart Table
- `id` → `cart_id`

#### Wishlist Table
- `id` → `wishlist_id`

#### Admin Table
- Added: `role` field

#### POS Tables
- Completely restructured:
  - `pos_transaction`: `admin_id`, `customer_name`, `date`, `total_price`, `payment_method`
  - `pos_item`: Links to `product_id` (not separate item table)

## Frontend Changes Needed

### TypeScript Interfaces
Update all interfaces to use:
- `product_id` instead of `id`
- `user_id` instead of `id`
- `order_id` instead of `id`
- `top_notes`, `middle_notes`, `base_notes` instead of `notes`
- `image_url` instead of `image_path`
- `is_50ml` instead of `is_primary`
- `stars` instead of `rating`
- `profile_pic` instead of `profile_picture`
- `total_price` instead of `total_amount`
- Address fields: `address_line`, `district`, `city`, `province`, `postal_code`

### API Response Handling
- Update all API calls to use new field names
- Update image URLs to use `image_url`
- Update rating display to use `stars`
- Update address forms to use split address fields

### Components to Update
1. ProductGrid - Remove `is_best_seller`, update image handling
2. ProductDetailPage - Update notes display, image handling
3. ProfileModal - Update address fields, profile pic field
4. Cart components - Update field names
5. Order components - Update field names, remove order_number
6. Rating components - Use `stars` instead of `rating`



