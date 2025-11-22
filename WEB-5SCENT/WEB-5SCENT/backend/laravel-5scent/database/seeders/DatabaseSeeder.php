<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin
        Admin::create([
            'name' => 'Admin',
            'email' => 'admin@5scent.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        // Create test user
        User::create([
            'name' => 'Test User',
            'email' => 'user@test.com',
            'password' => Hash::make('password'),
            'phone' => '081234567890',
        ]);

        // Create sample products
        $products = [
            [
                'name' => 'Midnight Elegance',
                'description' => 'A sophisticated night fragrance with deep, mysterious notes.',
                'top_notes' => 'Bergamot, Black Pepper',
                'middle_notes' => 'Rose, Jasmine',
                'base_notes' => 'Sandalwood, Vanilla',
                'category' => 'Night',
                'price_30ml' => 250000,
                'price_50ml' => 400000,
                'stock_30ml' => 50,
                'stock_50ml' => 30,
            ],
            [
                'name' => 'Sunrise Bloom',
                'description' => 'Fresh and vibrant day fragrance perfect for everyday wear.',
                'top_notes' => 'Citrus, Green Apple',
                'middle_notes' => 'Lavender, Mint',
                'base_notes' => 'Musk, Cedar',
                'category' => 'Day',
                'price_30ml' => 200000,
                'price_50ml' => 350000,
                'stock_30ml' => 60,
                'stock_50ml' => 40,
            ],
            [
                'name' => 'Ocean Breeze',
                'description' => 'Crisp and clean aquatic fragrance for a refreshing day.',
                'top_notes' => 'Sea Salt, Lemon',
                'middle_notes' => 'Water Lily, Seaweed',
                'base_notes' => 'Driftwood, Amber',
                'category' => 'Day',
                'price_30ml' => 220000,
                'price_50ml' => 380000,
                'stock_30ml' => 45,
                'stock_50ml' => 35,
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::create($productData);
            
            // Add placeholder image path (you'll need to add actual images)
            ProductImage::create([
                'product_id' => $product->product_id,
                'image_url' => 'products/placeholder.jpg',
                'is_50ml' => 0,
            ]);
        }
    }
}
