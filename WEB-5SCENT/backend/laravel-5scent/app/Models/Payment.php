<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $table = 'payment';
    protected $primaryKey = 'payment_id';
    public $timestamps = true;

    protected $fillable = [
        'order_id',
        'method',
        'amount',
        'status',
        'transaction_time',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'method' => 'string',
            'amount' => 'float',
            'transaction_time' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }
}
