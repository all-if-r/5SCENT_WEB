<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';
    protected $primaryKey = 'order_id';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'subtotal',
        'total_price',
        'status',
        'phone_number',
        'address_line',
        'district',
        'city',
        'province',
        'postal_code',
        'tracking_number',
        'payment_method',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'float',
            'total_price' => 'float',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function details()
    {
        return $this->hasMany(OrderDetail::class, 'order_id', 'order_id');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'order_id', 'order_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'order_id', 'order_id');
    }

    public function canBeCancelled()
    {
        return $this->status === 'Packaging';
    }

    /**
     * Scope to filter completed orders (Packaging, Shipping, Delivered)
     */
    public function scopeCompleted($query)
    {
        return $query->whereIn('status', ['Packaging', 'Shipping', 'Delivered']);
    }
}
