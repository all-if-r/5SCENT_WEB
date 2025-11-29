<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    use HasFactory;

    protected $table = 'productimage';
    protected $primaryKey = 'image_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'image_url',
        'is_50ml',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
