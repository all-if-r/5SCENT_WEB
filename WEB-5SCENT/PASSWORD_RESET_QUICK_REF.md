# Password Reset Quick Reference

## Files Created/Modified

### Backend Files Created:
1. ✅ `config/auth.php` - Authentication configuration
2. ✅ `app/Notifications/ResetPasswordNotification.php` - Custom email notification
3. ✅ `app/Http/Controllers/Auth/ForgotPasswordController.php` - Forgot password endpoint
4. ✅ `app/Http/Controllers/Auth/ResetPasswordController.php` - Reset password endpoint

### Backend Files Modified:
1. ✅ `.env` - Added `APP_FRONTEND_URL=http://localhost:3000`
2. ✅ `app/Models/User.php` - Added `sendPasswordResetNotification()` method
3. ✅ `routes/api.php` - Added password reset routes

---

## API Endpoints

### 1. Request Password Reset
```
POST /api/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "If this email is registered, a reset link has been sent."
}
```

### 2. Reset Password
```
POST /api/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "abc123...",
  "password": "NewPassword123!",
  "password_confirmation": "NewPassword123!"
}

Response: 200 OK
{
  "message": "Password has been reset successfully."
}

Response: 400 Bad Request
{
  "message": "The reset token is invalid or has expired..."
}
```

---

## Environment Variables

Add to `.env`:
```
APP_FRONTEND_URL=http://localhost:3000
```

Existing SMTP config (already set):
```
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

## Reset Link Format

The email will contain a link like:
```
http://localhost:3000/reset-password?token=abc123xyz&email=user@example.com
```

This link:
- Has 60-minute expiration
- Includes the token and email as query parameters
- Points to your Next.js frontend

---

## Key Security Features

- ✅ Email must exist in `user` table
- ✅ No token created for non-existent emails
- ✅ No email sent for non-existent emails
- ✅ Tokens expire after 60 minutes
- ✅ Passwords hashed with bcrypt
- ✅ Same response message for registered/unregistered emails (prevents user enumeration)
- ✅ Rate limited to 60 seconds between requests

---

## Testing Checklist

- [ ] Forgot password with valid email → receives reset email
- [ ] Forgot password with invalid email → no email sent, same message shown
- [ ] Click reset link → frontend shows reset form
- [ ] Reset with matching passwords → success
- [ ] Reset with mismatched passwords → error
- [ ] Reset with expired token → error message
- [ ] Reset with invalid token → error message
- [ ] New password works for login → success

---

## Frontend Integration

### In your `/forgot-password` page:
```typescript
const response = await fetch('http://localhost:8000/api/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});
```

### In your `/reset-password` page:
```typescript
// Extract from query string:
const token = searchParams.get('token');
const email = searchParams.get('email');

// Call reset endpoint:
const response = await fetch('http://localhost:8000/api/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token,
    email,
    password,
    password_confirmation: passwordConfirmation
  })
});
```

---

## Laravel Artisan Commands (if needed)

```bash
# Clear cache
php artisan config:clear
php artisan cache:clear

# Check email is working (optional)
php artisan tinker
# Then: Mail::raw('Test', function($message) { $message->to('test@example.com'); });

# Run migrations (if password_reset_tokens table missing)
php artisan migrate
```

---

## Customization

### Change token expiration time:
Edit `config/auth.php`, line with `'expire' => 60,` (value in minutes)

### Change email subject:
Edit `app/Notifications/ResetPasswordNotification.php`, line with `->subject(...)`

### Change password requirements:
Edit `app/Http/Controllers/Auth/ResetPasswordController.php`, validation rules

### Change frontend URL:
Update `APP_FRONTEND_URL` in `.env`
