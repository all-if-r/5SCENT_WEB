<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosItem extends Model
{
    use HasFactory;

    protected $table = 'pos_item';
    protected $primaryKey = 'pos_item_id';

    protected $fillable = [
        'transaction_id',
        'product_id',
        'size',
        'quantity',
        'price',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'subtotal' => 'float',
        ];
    }

    public function transaction()
    {
        return $this->belongsTo(PosTransaction::class, 'transaction_id', 'transaction_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
