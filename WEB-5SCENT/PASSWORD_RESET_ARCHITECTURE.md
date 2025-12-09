# Password Reset Flow - Architecture & Sequence Diagrams

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                           │
│                      (Next.js Frontend)                         │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │ Forgot Password  │         │  Reset Password Page         │ │
│  │      Page        │         │  /?token=xxx&email=user@...  │ │
│  └────────┬─────────┘         └──────────────┬───────────────┘ │
│           │                                   │                │
│           │ 1. POST /api/forgot-password     │ 3. Click link  │
│           │    { email: "user@example.com" } │   from email   │
│           │                                   │                │
└───────────┼───────────────────────────────────┼────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LARAVEL BACKEND API                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ POST /api/forgot-password (ForgotPasswordController)       │ │
│  │ ✓ Validate email format                                    │ │
│  │ ✓ Check email exists in 'user' table                      │ │
│  │ ✓ Generate secure token                                    │ │
│  │ ✓ Store token in 'password_reset_tokens' table            │ │
│  │ ✓ Send email via Gmail SMTP                               │ │
│  │ ✓ Return JSON response                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Reset Password Email Notification                 │ │
│  │  - Custom subject: "Reset Password 5SCENT"               │ │
│  │  - Formatted with brand styling                          │ │
│  │  - Contains reset link with token & email               │ │
│  │  - Expires in 60 minutes                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
            │
            │ 2. Email sent (Gmail SMTP)
            │ Link: http://localhost:3000/reset-password?token=xxx&email=user@...
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     USER EMAIL INBOX                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Subject: Reset Password 5SCENT                           │   │
│  │ From: 5scent.app@gmail.com                              │   │
│  │                                                          │   │
│  │ Hello User,                                              │   │
│  │                                                          │   │
│  │ You have requested to reset your password.              │   │
│  │ [RESET PASSWORD BUTTON]                                 │   │
│  │                                                          │   │
│  │ This link expires in 60 minutes.                        │   │
│  │ If you didn't request this, ignore this email.          │   │
│  │                                                          │   │
│  │ Best regards, 5SCENT Team                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            │ Click button
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESET PASSWORD PAGE                          │
│                (Frontend extracts query params)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ const token = searchParams.get('token')                 │   │
│  │ const email = searchParams.get('email')                 │   │
│  │                                                          │   │
│  │ [New Password Input Field]                             │   │
│  │ [Confirm Password Input Field]                         │   │
│  │                                                          │   │
│  │ [Reset Password Button] ────┐                           │   │
│  └──────────────────────────────┼──────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                                  │ 4. POST /api/reset-password
                                  │    {
                                  │      token,
                                  │      email,
                                  │      password,
                                  │      password_confirmation
                                  │    }
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/reset-password                           │
│         (ResetPasswordController@reset)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✓ Validate all inputs                                    │   │
│  │ ✓ Verify token matches email                            │   │
│  │ ✓ Check token not expired                               │   │
│  │ ✓ Hash new password with bcrypt                         │   │
│  │ ✓ Update user password in database                      │   │
│  │ ✓ Regenerate remember token                            │   │
│  │ ✓ Fire PasswordReset event                              │   │
│  │ ✓ Delete used token from database                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │
            │ 5. Return JSON response
            │    { message: "Password has been reset successfully." }
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUCCESS - LOGIN WITH NEW PASSWORD              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram - Happy Path

```
User          Frontend              Backend API          Database
 │                │                      │                  │
 │  1. Click      │                      │                  │
 │  Forgot Pass   │                      │                  │
 └──────────────►│                      │                  │
                 │                      │                  │
                 │  2. POST /forgot-pwd │                  │
                 │   { email }          │                  │
                 │─────────────────────►│                  │
                 │                      │                  │
                 │                      │ 3. Validate email │
                 │                      │ exists            │
                 │                      │─────────────────►│
                 │                      │◄─────────────────│
                 │                      │                  │
                 │                      │ 4. Generate token │
                 │                      │ & store           │
                 │                      │─────────────────►│
                 │                      │◄─────────────────│
                 │                      │                  │
                 │                      │ 5. Send email    │
                 │                      │ with reset link  │
                 │                      │ (Gmail SMTP)     │
                 │                      │─────────────────►
                 │                      │                  │
                 │  6. JSON response    │                  │
                 │◄─────────────────────│                  │
                 │                      │                  │
                 │  7. Show success msg │                  │
                 │◄──────────────────┐  │                  │
 │              │                 │  │  │                  │
 │              │                 │  │  │                  │
 │  (User checks email)           │  │  │                  │
 │                                │  │  │                  │
 │  8. Click reset link           │  │  │                  │
 └──────────────┐                 │  │  │                  │
                ▼                 │  │  │                  │
              Frontend gets token │  │  │                  │
              & email from URL    │  │  │                  │
                │                 │  │  │                  │
                │  9. POST /reset-pwd  │                  │
                │   { email, token,    │                  │
                │     password }       │                  │
                │─────────────────────►│                  │
                │                      │                  │
                │                      │ 10. Validate all │
                │                      │ (token, email,   │
                │                      │ password)        │
                │                      │─────────────────►│
                │                      │◄─────────────────│
                │                      │                  │
                │                      │ 11. Check token  │
                │                      │ validity         │
                │                      │─────────────────►│
                │                      │◄─────────────────│
                │                      │                  │
                │                      │ 12. Hash & update│
                │                      │ password         │
                │                      │─────────────────►│
                │                      │◄─────────────────│
                │                      │                  │
                │                      │ 13. Delete token │
                │                      │─────────────────►│
                │                      │◄─────────────────│
                │                      │                  │
                │  14. Success response │                  │
                │◄─────────────────────│                  │
                │                      │                  │
                │  15. Redirect to login│                  │
 │              │◄──────────────────┐  │                  │
 │              │                 │  │                  │
 │  16. Login   │                 │  │                  │
 │  with new    │                 │  │                  │
 │  password    │                 │  │                  │
 │              │                 │  │                  │
```

---

## Error Path - Invalid/Expired Token

```
User          Frontend              Backend API          Database
 │                │                      │                  │
 │  1. Click      │                      │                  │
 │  Reset link    │                      │                  │
 │  (expired)     │                      │                  │
 └──────────────►│                      │                  │
                 │                      │                  │
                 │  2. POST /reset-pwd  │                  │
                 │   { token, email,    │                  │
                 │     password }       │                  │
                 │─────────────────────►│                  │
                 │                      │                  │
                 │                      │ 3. Check token   │
                 │                      │ in database      │
                 │                      │─────────────────►│
                 │                      │◄─────────────────│
                 │                      │                  │
                 │                      │ 4. Token not     │
                 │                      │ found or expired │
                 │                      │ (error)          │
                 │                      │                  │
                 │  5. Error response   │                  │
                 │  (400)               │                  │
                 │◄─────────────────────│                  │
                 │                      │                  │
                 │  6. Show error msg   │                  │
                 │◄──────────────────┐  │                  │
 │              │                 │  │  │                  │
 │  Error:      │                 │  │  │                  │
 │  "Token      │                 │  │  │                  │
 │  expired.    │                 │  │  │                  │
 │  Request     │                 │  │  │                  │
 │  new link."  │                 │  │  │                  │
 │              │                 │  │  │                  │
```

---

## Data Flow - Password Reset Token

```
Password Reset Flow:

1. EMAIL RECEIVED
   ┌─────────────────────────┐
   │ user@example.com        │
   │ requests reset          │
   └────────┬────────────────┘
            │
            ▼
2. VALIDATION
   ├─ Email format valid? ✓
   ├─ Email exists in user table? ✓
   └─ Continue ✓

3. TOKEN GENERATION & STORAGE
   ┌───────────────────────────────────┐
   │ password_reset_tokens table       │
   ├───────────────────────────────────┤
   │ email: user@example.com           │
   │ token: abc123xyz...               │
   │ created_at: 2025-12-08 10:00:00   │
   └───────────────────────────────────┘
   ✓ Token expires in 60 minutes (auto)

4. EMAIL SENT (Gmail SMTP)
   ┌───────────────────────────────────────┐
   │ From: 5scent.app@gmail.com            │
   │ To: user@example.com                  │
   │ Subject: Reset Password 5SCENT        │
   │ Body: Click link to reset password   │
   │       [RESET PASSWORD BUTTON]        │
   │       Link: http://localhost:3000/   │
   │            reset-password?           │
   │            token=abc123xyz&          │
   │            email=user@example.com    │
   └───────────────────────────────────────┘

5. USER CLICKS LINK
   Query Parameters Received:
   ├─ token: abc123xyz
   └─ email: user@example.com

6. FORM SUBMISSION
   ┌──────────────────────┐
   │ New Password: ****   │
   │ Confirm: ****        │
   │ [Submit Button]      │
   └──────────────────────┘

7. VALIDATION
   ├─ Token required? ✓
   ├─ Email required & valid? ✓
   ├─ Password required? ✓
   ├─ Password >= 8 chars? ✓
   ├─ Password confirmed? ✓
   └─ Continue ✓

8. TOKEN VERIFICATION
   ┌───────────────────────────────────┐
   │ password_reset_tokens table       │
   ├───────────────────────────────────┤
   │ Find by:                          │
   │  - email: user@example.com        │
   │  - token: abc123xyz               │
   │  - created_at > 60 mins ago?      │
   │                                   │
   │ Result: ✓ Valid token found       │
   └───────────────────────────────────┘

9. PASSWORD UPDATE
   ┌───────────────────────────────────┐
   │ user table                        │
   ├───────────────────────────────────┤
   │ Update where email = user@...     │
   │  - password: Hash($newPassword)   │
   │  - remember_token: new_random     │
   │  - updated_at: now()              │
   │                                   │
   │ Result: ✓ Password updated        │
   └───────────────────────────────────┘

10. TOKEN CLEANUP
    ┌───────────────────────────────────┐
    │ password_reset_tokens table       │
    ├───────────────────────────────────┤
    │ Delete where email = user@...     │
    │                                   │
    │ Result: ✓ Token deleted           │
    └───────────────────────────────────┘

11. SUCCESS RESPONSE
    {
      "message": "Password has been reset successfully."
    }

12. USER LOGIN
    Credentials: 
    - Email: user@example.com
    - Password: NewPassword123
    Result: ✓ Login successful
```

---

## Validation Rules Summary

### Forgot Password Endpoint

| Field | Rules | Error Message |
|-------|-------|---------------|
| email | required | Email is required |
| email | email format | Please enter a valid email address |
| email | exists:user,email | If this email is registered, a reset link has been sent |

### Reset Password Endpoint

| Field | Rules | Error Message |
|-------|-------|---------------|
| token | required | Reset token is required |
| email | required | Email is required |
| email | email format | Please enter a valid email address |
| password | required | Password is required |
| password | min:8 | Password must be at least 8 characters |
| password | confirmed | Passwords do not match |

---

## Security Implementation Summary

```
SECURITY LAYER 1: INPUT VALIDATION
├─ Email format validation
├─ Email existence check (user table)
├─ Password confirmation check
└─ Password length requirement (8+ chars)

SECURITY LAYER 2: TOKEN MANAGEMENT
├─ Cryptographically secure random token generation
├─ Token storage in database only (hashed in some systems)
├─ Token expiration (60 minutes)
├─ Token single-use (deleted after reset)
└─ Token rate limiting (60 seconds between requests)

SECURITY LAYER 3: PASSWORD HANDLING
├─ Password hashing with bcrypt (Hash::make())
├─ Salting included in bcrypt
├─ Password confirmation required
├─ Minimum length enforcement (8 characters)
└─ Remember token regeneration after reset

SECURITY LAYER 4: INFORMATION PROTECTION
├─ Same message for existing/non-existing emails
├─ No direct indication of successful token creation
├─ Error messages don't reveal user enumeration
└─ Logs contain full details (server-side only)

SECURITY LAYER 5: EMAIL SECURITY
├─ Gmail SMTP encryption (TLS)
├─ MAIL_FROM authenticated address
├─ Reset link points to frontend (Next.js)
├─ No sensitive data in email body
└─ Token in URL (standard practice)

SECURITY LAYER 6: DATABASE SECURITY
├─ Separate token table (password_reset_tokens)
├─ Token linked to email (not user_id)
├─ Automatic cleanup via created_at
├─ No plaintext passwords stored
└─ Remember token regenerated on reset

SECURITY LAYER 7: API SECURITY
├─ JSON responses only (no redirects)
├─ CORS configured properly
├─ No sensitive data in responses
├─ Clear error messages without info leakage
└─ Rate limiting via throttle middleware
```

---

## Success Criteria Met ✅

✅ Email validation - Confirms email exists in `user` table  
✅ No token creation - If email doesn't exist, no token created  
✅ No email sent - If email doesn't exist, no email sent  
✅ Secure token - Cryptographically secure generation  
✅ Token expiration - Expires after 60 minutes  
✅ Frontend link - Points to Next.js reset page  
✅ Query parameters - Token and email in query string  
✅ Password hashing - bcrypt with automatic salting  
✅ Password confirmation - Validated before update  
✅ JSON responses - No redirects, all JSON  
✅ Error handling - Clear messages without info leakage  
✅ Event firing - PasswordReset event for extensibility  
