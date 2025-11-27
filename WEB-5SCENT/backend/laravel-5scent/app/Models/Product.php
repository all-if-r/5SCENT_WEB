<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'product';
    protected $primaryKey = 'product_id';

    protected $fillable = [
        'name',
        'description',
        'category',
        'price_30ml',
        'price_50ml',
        'stock_30ml',
        'stock_50ml',
        'top_notes',
        'middle_notes',
        'base_notes',
    ];

    public function images()
    {
        return $this->hasMany(ProductImage::class, 'product_id', 'product_id')
                    ->orderBy('image_id');
    }

    public function mainImage()
    {
        return $this->hasOne(ProductImage::class, 'product_id', 'product_id')
                    ->where('is_50ml', 1)
                    ->orderBy('image_id');
    }

    public function cartItems()
    {
        return $this->hasMany(Cart::class, 'product_id', 'product_id');
    }

    public function wishlistItems()
    {
        return $this->hasMany(Wishlist::class, 'product_id', 'product_id');
    }

    public function orderDetails()
    {
        return $this->hasMany(OrderDetail::class, 'product_id', 'product_id');
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class, 'product_id', 'product_id');
    }

    public function posItems()
    {
        return $this->hasMany(PosItem::class, 'product_id', 'product_id');
    }

    public function getAverageRatingAttribute()
    {
        return $this->ratings()->avg('stars') ?? 0;
    }
}
