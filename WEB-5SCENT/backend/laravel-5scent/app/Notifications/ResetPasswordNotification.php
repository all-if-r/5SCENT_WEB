<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Log;

class ResetPasswordNotification extends ResetPassword
{
    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        Log::info('ResetPasswordNotification via for email: ' . $notifiable->email);
        return ['mail'];
    }

    /**
     * Build the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        Log::info('Building reset password email for: ' . $notifiable->email);
        
        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

        Log::info('Reset URL: ' . $resetUrl);

        return (new MailMessage)
            ->subject('Reset Password 5SCENT')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('You have requested to reset your password. Click the button below to proceed:')
            ->action('Reset Password', $resetUrl)
            ->line('This password reset link will expire in ' . config('auth.passwords.' . $this->getPasswordResetBrokerName() . '.expire') . ' minutes.')
            ->line('If you did not request a password reset, you can safely ignore this email.')
            ->salutation('Best regards, 5SCENT Team');
    }
}
