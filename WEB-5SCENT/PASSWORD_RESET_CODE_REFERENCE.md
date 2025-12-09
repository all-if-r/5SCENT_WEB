# Complete Code Reference - Password Reset Implementation

## 1. Updated `.env` File

```dotenv
APP_NAME=5SCENT
APP_ENV=local
APP_KEY=base64:2Uxn88RTrh4m0Y1Vn56btJ/GB0FC9nDy/QhsGY/K0hE=
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_FRONTEND_URL=http://localhost:3000  # <-- ADDED THIS LINE
APP_TIMEZONE=ASIA/JAKARTA
APP_LOCALE=en

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=db_5scent
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=5scent.app@gmail.com
MAIL_PASSWORD=xfax_anpf_qxly_vnun
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=5scent.app@gmail.com
MAIL_FROM_NAME="5SCENT"
```

---

## 2. New File: `config/auth.php`

```php
<?php

return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'api' => [
            'driver' => 'token',
            'provider' => 'users',
            'hash' => false,
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,
];
```

---

## 3. New File: `app/Notifications/ResetPasswordNotification.php`

```php
<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    /**
     * Build the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

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
```

---

## 4. New File: `app/Http/Controllers/Auth/ForgotPasswordController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class ForgotPasswordController extends Controller
{
    /**
     * Send a reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request)
    {
        // Validate the email
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'exists:user,email',  // Ensure email exists in user table
            ],
        ], [
            'email.required' => 'Email is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.exists' => 'If this email is registered, a reset link has been sent.',
        ]);

        // Send the password reset link
        $status = Password::sendResetLink(
            $request->only('email')
        );

        // Return success response
        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'If this email is registered, a reset link has been sent.',
            ], 200);
        }

        // This should rarely happen, but handle it gracefully
        return response()->json([
            'message' => 'If this email is registered, a reset link has been sent.',
        ], 200);
    }
}
```

---

## 5. New File: `app/Http/Controllers/Auth/ResetPasswordController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    /**
     * Reset the user's password.
     */
    public function reset(Request $request)
    {
        // Validate the input
        $validated = $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ], [
            'token.required' => 'Reset token is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Password is required.',
            'password.confirmed' => 'Passwords do not match.',
            'password.min' => 'Password must be at least 8 characters.',
        ]);

        // Attempt to reset the password
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->remember_token = Str::random(60);
                $user->save();

                event(new PasswordReset($user));
            }
        );

        // Return response
        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password has been reset successfully.',
            ], 200);
        }

        // Handle invalid token or expired token
        return response()->json([
            'message' => 'The reset token is invalid or has expired. Please request a new password reset link.',
        ], 400);
    }
}
```

---

## 6. Updated File: `app/Models/User.php`

Add this method to the User class (before the closing brace):

```php
    /**
     * Send the password reset notification.
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }
```

---

## 7. Updated File: `routes/api.php`

Add these imports at the top:

```php
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\ResetPasswordController;
```

Add these routes after the login/register routes (in the public routes section):

```php
// Password Reset Routes (Public)
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [ResetPasswordController::class, 'reset']);
```

---

## Example cURL Commands for Testing

### Test Forgot Password
```bash
curl -X POST http://localhost:8000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Test Reset Password
```bash
curl -X POST http://localhost:8000/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "YOUR_TOKEN_HERE",
    "password": "NewPassword123",
    "password_confirmation": "NewPassword123"
  }'
```

---

## Installation Steps

1. ✅ Update `.env` with `APP_FRONTEND_URL`
2. ✅ Create `config/auth.php`
3. ✅ Create `app/Notifications/ResetPasswordNotification.php`
4. ✅ Create `app/Http/Controllers/Auth/ForgotPasswordController.php`
5. ✅ Create `app/Http/Controllers/Auth/ResetPasswordController.php`
6. ✅ Update `app/Models/User.php` with password reset notification method
7. ✅ Update `routes/api.php` with imports and routes
8. Run `php artisan config:clear` (to clear config cache)
9. Test endpoints with cURL or Postman

---

## Verification Checklist

- [ ] All 4 new files created in correct directories
- [ ] User model updated with password reset notification method
- [ ] Routes added to api.php with proper imports
- [ ] .env has APP_FRONTEND_URL=http://localhost:3000
- [ ] config/auth.php points to password_reset_tokens table
- [ ] Gmail SMTP configured (should already be in .env)
- [ ] Test forgot password endpoint returns 200
- [ ] Test reset password endpoint returns 400 with invalid token
- [ ] Check Laravel logs for any errors: tail -f storage/logs/laravel.log
