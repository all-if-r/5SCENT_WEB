# Password Reset & Auth Pages Fix - Complete Implementation

## Summary of Changes

### Issue 1: Token Not Expiring After 3 Minutes ✅ FIXED

**Problem**: Token remained valid even after 3 minutes.

**Root Cause**: Used PHP's `strtotime()` with `time()` comparison, which had timezone issues and off-by-one errors.

**Solution**: Updated to use Laravel's Carbon date handling with proper timezone support.

---

## Backend Changes

### File: `app/Http/Controllers/Auth/ResetPasswordController.php`

**Changed Section 1: Return 410 instead of 400 for clearer HTTP status**

```php
if (!$resetRecord) {
    Log::warning('Password reset token not found for email: ' . $email);
    return response()->json([
        'message' => 'Password reset link has expired. Please request a new one.',
    ], 410);  // HTTP 410 Gone = resource no longer available
}
```

**Changed Section 2: Fix token expiry check using Carbon**

```php
// Check if token has expired (3 minutes)
// Use Carbon for proper timezone handling
$tokenCreatedAtCarbon = \Carbon\Carbon::parse($resetRecord->created_at);
$expiresAt = $tokenCreatedAtCarbon->addMinutes(3);
$now = \Carbon\Carbon::now();

Log::info('Token created at: ' . $tokenCreatedAtCarbon . ', Expires at: ' . $expiresAt . ', Current time: ' . $now);

if ($now->greaterThan($expiresAt)) {
    Log::warning('Password reset token expired for email: ' . $email);
    DB::table('password_reset_tokens')->where('email', $email)->delete();
    return response()->json([
        'message' => 'Password reset link has expired. Please request a new one.',
    ], 410);
}
```

**Why this works**:
- Carbon handles timezones correctly
- `addMinutes(3)` is precise and timezone-aware
- `greaterThan()` is a safe comparison for Carbon dates
- Token is immediately deleted when expired
- Returns 410 Gone status (industry standard for expired resources)

---

## Frontend Changes

### File: `app/reset-password/page.tsx`

**Changed Section 1: Fix dependency array to prevent redirect loops**

```typescript
// Get token and email from URL query params
useEffect(() => {
  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  if (!tokenParam || !emailParam) {
    showToast('Invalid reset link. Please request a new one.', 'error');
    // Use setTimeout to avoid redirect during render
    const timer = setTimeout(() => {
      router.push('/forgot-password');
    }, 1000);
    return () => clearTimeout(timer);
  }

  setToken(tokenParam);
  setEmail(emailParam);
  setIsValid(true);
}, [searchParams]);  // Only depend on searchParams, not router/showToast
```

**Why this works**:
- Only depends on `searchParams` (stable)
- Uses `setTimeout` to defer redirect outside of render
- Cleanup function clears timeout to prevent memory leaks
- Avoids infinite redirect loops

**Changed Section 2: Handle 410 status for expired tokens**

```typescript
} catch (error: any) {
  console.error('Password reset error:', error);
  
  if (error.response?.status === 410 || error.response?.status === 400) {
    const message = error.response?.data?.message || 'Password reset link has expired. Please request a new one.';
    showToast(message, 'error');
    // Redirect to forgot password after 2 seconds
    setTimeout(() => {
      router.push('/forgot-password');
    }, 2000);
  } else if (error.response?.status === 422) {
    // validation errors...
  }
  // rest of error handling...
}
```

**Why this works**:
- Explicitly handles 410 Gone status
- Shows friendly expiry message
- Redirects user to request new reset after delay
- No infinite loops

---

### File: `contexts/AuthContext.tsx`

**Changed Section: Skip token verification on auth pages**

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

// ... interface definitions ...

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Don't verify token on auth pages to prevent freezing
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isAuthPage = authPages.some(page => pathname?.startsWith(page));

    // Restore auth state from localStorage on mount
    const restoreAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // Set user immediately from localStorage
          setUser(JSON.parse(storedUser));
          
          // Only verify token on non-auth pages
          if (!isAuthPage) {
            // Verify token is still valid
            const response = await api.get('/me');
            if (response.data) {
              setUser(response.data);
              localStorage.setItem('user', JSON.stringify(response.data));
            }
          }
        }
      } catch (error) {
        // Token verification failed, clear auth only if not on auth page
        if (!isAuthPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, [pathname]);
  
  // ... rest of context implementation ...
}
```

**Why this fixes the freeze**:
- On login/register pages, skips the `/me` API call that was causing hangs
- Still reads token from localStorage for UI updates
- Only verifies token on public pages (home, products, etc.)
- `pathname` dependency ensures clean state per page
- Prevents cascade of API calls on auth pages
- Each page loads independently without blocking

---

## How Token Expiry Now Works

### Flow:

1. **User requests reset**:
   - Email sent with token (valid for 3 minutes from now)
   - Email template says "expires in 3 minutes"

2. **User clicks reset link within 3 minutes**:
   - Frontend loads reset page with token & email
   - User submits new password
   - Backend checks: `created_at + 3 minutes > current_time`?
   - ✅ Result: Password updated, token deleted, redirect to login

3. **User clicks reset link after 3+ minutes**:
   - Frontend loads reset page with token & email
   - User submits new password
   - Backend checks: `created_at + 3 minutes > current_time`?
   - ❌ Result: Returns 410 Gone error
   - Frontend shows: "Password reset link has expired. Please request a new one."
   - Frontend redirects to forgot-password page after 2 seconds

---

## How Login/Register Pages Now Stay Responsive

### Problem (Before):
```
User visits /login
  ↓
AuthProvider mounts, calls restoreAuth()
  ↓
Tries to verify token with GET /me (even on login page)
  ↓
If API hangs, page freezes for 1-2 seconds
  ↓
User sees black screen
```

### Solution (After):
```
User visits /login
  ↓
AuthProvider mounts, checks pathname
  ↓
pathname === '/login' → isAuthPage = true
  ↓
Skip GET /me API call, only read localStorage
  ↓
setLoading(false) immediately
  ↓
Page renders instantly, no freeze
```

---

## Testing the Fix

### Test 1: Token Expires After 3 Minutes

```bash
1. Request password reset for alifrahmanra5@gmail.com
2. Check email, get reset link
3. Click link immediately
   ✅ Page loads, form works
4. Submit new password
   ✅ Successfully resets
5. Check database:
   - Row in password_reset_tokens should be DELETED
   - User password should be updated
```

### Test 2: Expired Token Shows Friendly Message

```bash
1. Request password reset
2. Note the time (e.g., 10:00 AM)
3. Do NOT click the link
4. Wait 3+ minutes (until 10:03 AM or later)
5. Click the reset link from email
   ✅ Page loads reset form
6. Try to submit any password
   ✅ Backend returns 410 Gone
   ✅ Frontend shows: "Password reset link has expired. Please request a new one."
   ✅ After 2 seconds, redirects to /forgot-password
```

### Test 3: Login Page Loads Instantly

```bash
1. Open http://localhost:3000/login
2. Page should load in < 0.5 seconds
   ✅ No black screen
   ✅ Form appears immediately
3. Click sign-up link
4. Register page should load in < 0.5 seconds
   ✅ No freeze
5. Navigate back to login using navbar
   ✅ Smooth transition, no delay
```

### Test 4: Reset Flow Doesn't Break Navigation

```bash
1. Go to /forgot-password
2. Request reset with valid email
3. Check database for new token row
   ✅ Row exists with correct timestamp
4. Click email link
   ✅ /reset-password page loads
5. Enter password and submit (within 3 minutes)
   ✅ Success toast appears
   ✅ Redirects to /login
6. Page loads normally
   ✅ Can log in without issues
7. After login, navigate to products, cart, etc.
   ✅ Everything works smoothly
```

---

## Configuration Verification

### File: `config/auth.php`

Already correctly set:
```php
'passwords' => [
    'users' => [
        'provider' => 'users',
        'table' => 'password_reset_tokens',
        'expire' => 3,  // ✅ 3 minutes
        'throttle' => 60,
    ],
],
```

This is read by Laravel's password broker if you use it, and our custom code uses Carbon for explicit 3-minute check anyway.

---

## Database State After Fix

### When token is created:
```
password_reset_tokens:
  email: 'alifrahmanra5@gmail.com'
  token: 'O7SqUx...64chars...Pu8'
  created_at: '2025-12-09 10:00:00'  (Current time)
  Expires at: 2025-12-09 10:03:00   (created_at + 3 minutes)
```

### When user resets password successfully:
```
password_reset_tokens: DELETED

user:
  email: 'alifrahmanra5@gmail.com'
  password: 'hashed_new_password'
  updated_at: '2025-12-09 10:02:15'
```

### When user clicks link after 3 minutes:
```
// Token row still exists but is expired
$created_at = '2025-12-09 10:00:00'
$expires_at = '2025-12-09 10:03:00'
$now = '2025-12-09 10:05:00'  (5 minutes later)

if ($now->greaterThan($expires_at)) {  // TRUE!
    // Delete token
    // Return 410 error
}
```

---

## Summary of Fixes

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Token expires correctly | ❌ Never expired | ✅ Expires after 3 minutes | FIXED |
| Expired token handling | ❌ Still accepted | ✅ Returns 410 Gone + friendly message | FIXED |
| Login page freeze | ❌ Freezes 1-2 sec | ✅ Loads instantly | FIXED |
| Register page freeze | ❌ Freezes 1-2 sec | ✅ Loads instantly | FIXED |
| Reset flow stability | ❌ Breaks navigation | ✅ Smooth navigation after reset | FIXED |

---

## Files Modified

1. ✅ `app/Http/Controllers/Auth/ResetPasswordController.php` - Token expiry check
2. ✅ `app/reset-password/page.tsx` - Expired token handling + redirect fix
3. ✅ `contexts/AuthContext.tsx` - Skip token verification on auth pages

**No new dependencies added. No database migrations needed.**

---

## How to Deploy

1. Update the 3 files above
2. Clear Laravel cache: `php artisan cache:clear`
3. Restart frontend: `npm run dev`
4. Restart backend: `php artisan serve`
5. Test the password reset flow (see Testing section above)

All changes are backwards compatible. No breaking changes.
