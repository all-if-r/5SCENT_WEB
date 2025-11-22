<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosTransaction extends Model
{
    use HasFactory;

    protected $table = 'pos_transaction';
    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'admin_id',
        'customer_name',
        'date',
        'total_price',
        'payment_method',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'float',
            'date' => 'datetime',
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
}
