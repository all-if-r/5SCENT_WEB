<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $table = 'cart';
    protected $primaryKey = 'cart_id';

    protected $fillable = [
        'user_id',
        'product_id',
        'size',
        'quantity',
    ];

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
        return $this->size === '30ml' ? $this->product->price_30ml : $this->product->price_50ml;
    }

    public function getTotalAttribute()
    {
        return $this->price * $this->quantity;
    }
}
