<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $table = 'cart';
    protected $primaryKey = 'cart_id';
    public $timestamps = true;
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'user_id',
        'product_id',
        'size',
        'quantity',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['price', 'total'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function getPriceAttribute()
    {
        if (!$this->product || !$this->relationLoaded('product')) {
            return 0;
        }
        return $this->size === '30ml' 
            ? (float)$this->product->price_30ml 
            : (float)$this->product->price_50ml;
    }

    public function getTotalAttribute()
    {
        if (!$this->product || !$this->relationLoaded('product')) {
            return 0;
        }
        $price = $this->size === '30ml' 
            ? (float)$this->product->price_30ml 
            : (float)$this->product->price_50ml;
        return $price * (int)$this->quantity;
    }
}

