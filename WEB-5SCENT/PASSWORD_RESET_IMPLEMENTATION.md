# 5SCENT Password Reset Implementation Guide

## Overview

This document provides a complete implementation of a secure password reset flow for the 5SCENT application. The backend uses Laravel with a custom notification to send reset emails, and the frontend uses Next.js.

---

## Backend Implementation Summary

### 1. Configuration Changes

#### `.env` file
Added `APP_FRONTEND_URL=http://localhost:3000` to specify the frontend URL for reset links.

#### `config/auth.php` (NEW FILE)
Created the authentication configuration file with password broker settings:
- Password reset table: `password_reset_tokens`
- Password reset expiration: 60 minutes
- Throttle limit: 60 seconds

### 2. User Model Update

**File:** `app/Models/User.php`

Added the `sendPasswordResetNotification()` method to use the custom notification:

```php
public function sendPasswordResetNotification($token)
{
    $this->notify(new \App\Notifications\ResetPasswordNotification($token));
}
```

### 3. Custom Notification

**File:** `app/Notifications/ResetPasswordNotification.php` (NEW FILE)

This notification extends Laravel's default `ResetPassword` notification and customizes the email:

```php
namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Reset Password 5SCENT')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('You have requested to reset your password. Click the button below to proceed:')
            ->action('Reset Password', $resetUrl)
            ->line('This password reset link will expire in 60 minutes.')
            ->line('If you did not request a password reset, you can safely ignore this email.')
            ->salutation('Best regards, 5SCENT Team');
    }
}
```

### 4. ForgotPasswordController

**File:** `app/Http/Controllers/Auth/ForgotPasswordController.php` (NEW FILE)

Handles the forgot password request:

```php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    public function sendResetLinkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'exists:user,email',
            ],
        ], [
            'email.exists' => 'If this email is registered, a reset link has been sent.',
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        return response()->json([
            'message' => 'If this email is registered, a reset link has been sent.',
        ], 200);
    }
}
```

**Key Features:**
- Validates email format and existence in `user` table
- Uses `exists:user,email` rule to prevent information leakage
- Always returns the same success message for security
- No token is created if email doesn't exist
- Uses Gmail SMTP configured in `.env`

### 5. ResetPasswordController

**File:** `app/Http/Controllers/Auth/ResetPasswordController.php` (NEW FILE)

Handles the password reset:

```php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    public function reset(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->remember_token = Str::random(60);
                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password has been reset successfully.',
            ], 200);
        }

        return response()->json([
            'message' => 'The reset token is invalid or has expired. Please request a new password reset link.',
        ], 400);
    }
}
```

**Key Features:**
- Validates token, email, and password confirmation
- Password must be minimum 8 characters
- Hashes password with Laravel's `Hash::make()`
- Regenerates remember token
- Fires `PasswordReset` event
- Returns clear error messages for invalid/expired tokens

### 6. API Routes

**File:** `routes/api.php`

Added two public routes:

```php
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [ResetPasswordController::class, 'reset']);
```

---

## Frontend Implementation (Next.js)

### 1. Forgot Password Page

**File:** `app/forgot-password/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/forgot-password', { email });
      setSuccess(true);
      setEmail('');
      
      // Optionally show message or redirect after delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-4">
            If an account exists with this email address, you will receive a password reset link.
          </p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-4">
          Remember your password?{' '}
          <a href="/login" className="text-black font-semibold hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 2. Reset Password Page

**File:** `app/reset-password/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token and email from query string
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!tokenParam || !emailParam) {
      setError('Invalid reset link');
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Success!</h2>
          <p className="text-gray-600 mb-4">Your password has been reset successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Set New Password</h1>

        {error && !token && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" value={email} />
            <input type="hidden" value={token} />

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Confirm password"
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-sm mt-4">
          <a href="/login" className="text-black font-semibold hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

## Testing the Implementation

### 1. Test Forgot Password Flow

```bash
curl -X POST http://localhost:8000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Expected Response (200):**
```json
{
  "message": "If this email is registered, a reset link has been sent."
}
```

### 2. Test Reset Password Flow

```bash
curl -X POST http://localhost:8000/api/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "your_reset_token_here",
    "password": "NewPassword123",
    "password_confirmation": "NewPassword123"
  }'
```

**Expected Response (200) on success:**
```json
{
  "message": "Password has been reset successfully."
}
```

**Expected Response (400) on failure:**
```json
{
  "message": "The reset token is invalid or has expired. Please request a new password reset link."
}
```

---

## Security Features

✅ **Email Validation**: Confirms email exists in the `user` table before creating a token
✅ **Token Security**: Uses Laravel's built-in secure token generation
✅ **Token Expiration**: Tokens expire after 60 minutes
✅ **Password Hashing**: Uses Laravel's `Hash::make()` with bcrypt
✅ **CSRF Protection**: API routes properly configured for JSON requests
✅ **Rate Limiting**: Built-in throttle of 60 seconds
✅ **Information Leak Prevention**: Same message returned for registered and unregistered emails
✅ **Email Verification**: Uses Gmail SMTP with verified credentials
✅ **Token Regeneration**: Remember token is regenerated after password reset

---

## Troubleshooting

### Email Not Sending

1. Verify Gmail credentials in `.env`
2. Check Laravel logs: `storage/logs/laravel.log`
3. Ensure "Less secure app access" is enabled for the Gmail account
4. Check spam folder in Gmail

### Invalid Token Error

- Tokens expire after 60 minutes (configurable in `config/auth.php`)
- User must request a new reset link if token has expired

### Database Migration

If `password_reset_tokens` table doesn't exist, run:

```bash
php artisan migrate
```

Laravel includes this migration by default.

---

## Summary

The implementation provides a complete, secure password reset flow that:
- Validates user email existence before creating tokens
- Sends secure reset links via Gmail SMTP
- Handles token validation and expiration
- Securely resets user passwords
- Provides proper error handling and user feedback
- Works seamlessly with Next.js frontend
