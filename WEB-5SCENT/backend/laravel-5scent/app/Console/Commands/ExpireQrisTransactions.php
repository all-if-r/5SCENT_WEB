<?php

namespace App\Console\Commands;

use App\Models\PaymentTransaction;
use App\Models\Order;
use App\Models\Payment;
use App\Services\NotificationService;
use App\Helpers\OrderCodeHelper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExpireQrisTransactions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'qris:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire QRIS transactions that have passed their expired_at timestamp';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $startTime = microtime(true);
        
        try {
            Log::info('ExpireQrisTransactions command started', [
                'timestamp' => now()->toISOString(),
                'start_microtime' => $startTime,
            ]);

            // Find all pending QRIS transactions that have expired
            $expiredTransactions = PaymentTransaction::where('status', 'pending')
                ->whereNotNull('expired_at')
                ->where('expired_at', '<=', now())
                ->lockForUpdate()
                ->get();

            $queryTime = microtime(true);
            Log::info('Query completed', [
                'query_duration_ms' => round(($queryTime - $startTime) * 1000, 2),
                'count' => $expiredTransactions->count(),
                'current_time' => now()->toISOString(),
            ]);

            if ($expiredTransactions->isEmpty()) {
                Log::debug('No expired QRIS transactions to process');
                return Command::SUCCESS;
            }

            DB::transaction(function () use ($expiredTransactions) {
                foreach ($expiredTransactions as $transaction) {
                    Log::info('Expiring QRIS transaction', [
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'order_id' => $transaction->order_id,
                        'expired_at' => $transaction->expired_at->toISOString(),
                        'current_time' => now()->toISOString(),
                    ]);

                    // Update the transaction status to 'expire' and set updated_at to expired_at
                    $transaction->update([
                        'status' => 'expire',
                        'updated_at' => $transaction->expired_at,
                    ]);

                    // Get the related order
                    $order = Order::find($transaction->order_id);
                    if ($order) {
                        // Always update payment status to Failed when QRIS expires
                        $payment = \App\Models\Payment::where('order_id', $transaction->order_id)->first();
                        if ($payment && $payment->status === 'Pending') {
                            $payment->update(['status' => 'Failed']);
                        }

                        if ($order->status === 'Pending') {
                            // Cancel the order if it's still pending
                            $order->update(['status' => 'Cancelled']);

                            // Create expiry notification
                            $orderCode = OrderCodeHelper::formatOrderCode($order);
                            
                            // Check if notification already exists for this transition
                            NotificationService::createPaymentNotification(
                                $order->user_id ?? $order->order_id,
                                $order->order_id,
                                "Payment for order {$orderCode} has expired.",
                                'Payment'
                            );
                        }
                    }

                    Log::info('QRIS transaction expired', [
                        'qris_transaction_id' => $transaction->qris_transaction_id,
                        'order_id' => $transaction->order_id,
                        'expired_at' => $transaction->expired_at,
                    ]);
                }
            });

            $endTime = microtime(true);
            $totalDuration = round(($endTime - $startTime) * 1000, 2);
            
            Log::info('ExpireQrisTransactions command completed', [
                'total_duration_ms' => $totalDuration,
                'transactions_processed' => $expiredTransactions->count(),
                'end_timestamp' => now()->toISOString(),
            ]);

            $count = $expiredTransactions->count();
            $this->info("Expired {$count} QRIS transaction(s)");
            return Command::SUCCESS;

        } catch (\Exception $e) {
            Log::error('Error expiring QRIS transactions', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->error('Error expiring QRIS transactions: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
