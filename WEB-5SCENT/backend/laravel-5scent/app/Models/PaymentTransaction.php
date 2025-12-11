<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'qris_transactions';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'qris_transaction_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'midtrans_order_id',
        'midtrans_transaction_id',
        'payment_type',
        'gross_amount',
        'qr_url',
        'status',
        'expired_at',
        'raw_notification',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'expired_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'raw_notification' => 'json',
    ];

    /**
     * Get the order associated with this payment transaction.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    /**
     * Boot the model and set up event listeners
     */
    protected static function boot()
    {
        parent::boot();

        /**
         * When payment transaction status changes:
         * - To 'settlement': update order status to 'Packaging'
         * - To 'expire': update order status to 'Cancelled' (if still pending)
         */
        static::updated(function ($transaction) {
            if ($transaction->isDirty('status')) {
                $order = $transaction->order;
                if (!$order) {
                    \Log::warning('Order not found for PaymentTransaction', [
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'order_id' => $transaction->order_id,
                    ]);
                    return;
                }

                $newStatus = $transaction->status;
                $oldStatus = $transaction->getOriginal('status');

                \Log::info('PaymentTransaction status changed', [
                    'qris_transaction_id' => $transaction->qris_transaction_id,
                    'order_id' => $order->order_id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ]);

                // If payment is settled, move order to Packaging
                if ($newStatus === 'settlement' && strtolower($order->status) === 'pending') {
                    $order->update(['status' => 'Packaging']);
                    \Log::info('Order auto-transitioned to Packaging due to QRIS settlement', [
                        'order_id' => $order->order_id,
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'old_status' => $oldStatus,
                    ]);
                }
                // If payment expires and order is still pending, cancel it
                elseif ($newStatus === 'expire' && strtolower($order->status) === 'pending') {
                    $order->update(['status' => 'Cancelled']);
                    \Log::info('Order auto-cancelled due to QRIS payment expiry', [
                        'order_id' => $order->order_id,
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'old_status' => $oldStatus,
                    ]);
                }
                // If payment is denied/cancelled, cancel order if still pending
                elseif (in_array($newStatus, ['deny', 'cancel']) && strtolower($order->status) === 'pending') {
                    $order->update(['status' => 'Cancelled']);
                    \Log::info('Order auto-cancelled due to QRIS payment denial', [
                        'order_id' => $order->order_id,
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'reason' => $newStatus,
                    ]);
                }
            }
        });
    }
}
