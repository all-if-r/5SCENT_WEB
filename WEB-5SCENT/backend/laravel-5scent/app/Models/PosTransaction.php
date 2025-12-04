<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosTransaction extends Model
{
    use HasFactory;

    protected $table = 'pos_transaction';
    protected $primaryKey = 'transaction_id';
    public $timestamps = true;

    protected $fillable = [
        'admin_id',
        'customer_name',
        'phone',
        'total_price',
        'payment_method',
        'cash_received',
        'cash_change',
        'order_id',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'float',
            'cash_received' => 'float',
            'cash_change' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class, 'admin_id', 'admin_id');
    }

    public function items()
    {
        return $this->hasMany(PosItem::class, 'transaction_id', 'transaction_id');
    }

    /**
     * Get the associated order
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id', 'order_id');
    }

    /**
     * Calculate change for cash payments
     */
    public function getChangeAttribute()
    {
        if ($this->payment_method === 'Cash' && $this->cash_received) {
            return $this->cash_received - $this->total_price;
        }
        return 0;
    }
}
