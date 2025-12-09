# Google OAuth 2.0 Implementation Guide - 5SCENT

## Overview

This guide explains how to implement "Sign up with Google" and "Continue with Google" login for the 5SCENT e-commerce platform using Google OAuth 2.0 with Next.js frontend and Laravel backend.

---

## Part 1: Google Cloud Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named "5SCENT" (or your preference)
3. Wait for the project to be created

### Step 2: Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and select **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **External**
   - Add required information (app name, email, etc.)
   - For scopes, select: `email`, `profile`, `openid`
   - Add test users if in testing mode

### Step 4: Create Web Application Credentials

1. Select **Web application** as the application type
2. Name it something like "5SCENT Web App"
3. Add Authorized JavaScript Origins:
   ```
   http://localhost:3000
   http://localhost:8000
   https://yourdomain.com (for production)
   ```
4. Add Authorized Redirect URIs:
   ```
   http://localhost:3000/login
   http://localhost:3000/register
   https://yourdomain.com/login (for production)
   https://yourdomain.com/register (for production)
   ```
5. Click **Create**
6. Copy the **Client ID** (you'll need this for both backend and frontend)

### Step 5: Save Your Credentials

- **Client ID**: `xxxxx.apps.googleusercontent.com` (you'll use this in .env)
- **Client Secret**: Not needed for Google Identity Services (only for server-to-server)

---

## Part 2: Backend Setup (Laravel)

### Step 1: Update .env

Add the following to your `.env` file:

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

Replace `your_client_id_here.apps.googleusercontent.com` with your actual Client ID from Google Cloud.

### Step 2: Verify Files Are Created

Check that these files exist:

```
app/Http/Controllers/Auth/GoogleAuthController.php
config/google.php
```

### Step 3: Update routes/api.php

Verify this route exists:

```php
Route::post('/auth/google', [GoogleAuthController::class, 'handleGoogleLogin']);
```

### Step 4: Clear Laravel Cache

```bash
php artisan config:clear
php artisan cache:clear
```

### Step 5: Test Backend Endpoint

```bash
curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "your_google_id_token_here"
  }'
```

---

## Part 3: Frontend Setup (Next.js)

### Step 1: Update .env.local

Create or update `.env.local` in your Next.js root directory:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Important**: 
- Use `NEXT_PUBLIC_` prefix so the variable is available in the browser
- Replace with your actual Client ID from Google Cloud
- Update API URL for production

### Step 2: Verify Files Are Created

Check that these files exist:

```
hooks/useGoogleAuth.ts
components/GoogleSignInButton.tsx
app/login/page-with-google.tsx
app/register/page-with-google.tsx
```

### Step 3: Integration Steps

#### Option A: Update Existing Login Page

If you have an existing `app/login/page.tsx`, add this import and component:

```typescript
import GoogleSignInButton from '@/components/GoogleSignInButton';

// Then add this in your JSX where you want the Google button:
<GoogleSignInButton mode="signin" />
```

#### Option B: Use the Example Pages

Replace your existing pages with the examples:
- `app/login/page-with-google.tsx` → `app/login/page.tsx`
- `app/register/page-with-google.tsx` → `app/register/page.tsx`

### Step 4: Install Dependencies (if needed)

The implementation uses standard libraries, but ensure you have:

```bash
npm install axios
# These should already be in your project
npm install react-icons
npm install next
```

### Step 5: Test Frontend Integration

1. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000/login
3. You should see a "Sign in with Google" button
4. Click it and complete the Google sign-in flow
5. You should be redirected to the home page after successful login

---

## Architecture Overview

```
User Browser (Next.js)
    ↓
[Google Sign In Button Component]
    ↓
User clicks button → Google Identity Services JS Library loads
    ↓
User authenticates with Google
    ↓
Google returns ID Token (JWT)
    ↓
useGoogleAuth hook sends token to Laravel backend
    ↓
POST /api/auth/google with { credential: token }
    ↓
Laravel Backend (GoogleAuthController)
    ↓
Verify token with Google OAuth servers
    ↓
Extract email, name, picture from token
    ↓
Check if user exists in database
    ↓
If exists: Login with existing account
If not exists: Create new user account
    ↓
Generate Laravel Sanctum API token
    ↓
Return { token, user } as JSON
    ↓
Frontend stores token in localStorage
    ↓
Redirect to home page
```

---

## File Descriptions

### Backend Files

#### `app/Http/Controllers/Auth/GoogleAuthController.php`

**Purpose**: Handles Google OAuth token verification and user creation/login

**Key Methods**:
- `handleGoogleLogin()`: Main endpoint that receives ID token and returns API token
- `verifyGoogleToken()`: Verifies token with Google's OAuth servers

**Key Features**:
- Verifies token audience matches CLIENT_ID
- Verifies token hasn't expired
- Creates new user if email doesn't exist
- Generates Laravel Sanctum API token
- Returns user info and token as JSON

#### `config/google.php`

**Purpose**: Centralized configuration for Google OAuth

**Contains**:
- `google_client_id`: Loaded from `GOOGLE_CLIENT_ID` env variable

### Frontend Files

#### `hooks/useGoogleAuth.ts`

**Purpose**: React hook that manages Google Identity Services integration

**Key Features**:
- Automatically loads Google Identity Services script
- Initializes Google Sign-In with your CLIENT_ID
- Handles token response
- Sends token to Laravel backend
- Provides error handling

**Usage**:
```typescript
const { renderGoogleButton, googleClientId } = useGoogleAuth(
  (token, user) => {
    // Handle successful login
    localStorage.setItem('authToken', token);
    router.push('/');
  },
  (error) => {
    // Handle error
    showToast(error.details, 'error');
  }
);
```

#### `components/GoogleSignInButton.tsx`

**Purpose**: Ready-to-use Google Sign-In button component

**Props**:
- `mode`: 'signin' or 'signup' (changes button text)
- `onSuccess`: Optional callback on successful login

**Features**:
- Automatic button rendering
- Loading state handling
- Error handling with toast
- Works with both login and signup pages

**Usage**:
```typescript
// In login page
<GoogleSignInButton mode="signin" />

// In signup page
<GoogleSignInButton mode="signup" />

// With custom callback
<GoogleSignInButton 
  mode="signin"
  onSuccess={(token, user) => {
    console.log('Logged in as:', user.email);
  }}
/>
```

---

## How It Works

### 1. User Clicks Google Button

When user clicks the "Sign in with Google" or "Sign up with Google" button:

```
GoogleSignInButton renders the button
↓
User clicks → Google Sign-In popup appears
↓
User authenticates with Google
↓
Google returns ID token
```

### 2. Token is Sent to Backend

The `useGoogleAuth` hook intercepts the token:

```javascript
// In useGoogleAuth hook
const handleCredentialResponse = async (response) => {
  // response.credential contains the JWT ID token
  
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential: response.credential })
  });
  
  const { token, user } = await res.json();
  // token is the Laravel Sanctum API token
};
```

### 3. Backend Verifies Token

In `GoogleAuthController`:

```php
// 1. Verify token with Google
$payload = $this->verifyGoogleToken($token);

// 2. Extract user info
$email = $payload['email'];
$name = $payload['name'];
$picture = $payload['picture'];

// 3. Find or create user
$user = User::firstOrCreate(
    ['email' => $email],
    [
        'name' => $name,
        'password' => Hash::make(Str::random(32)),
        'profile_pic' => $picture
    ]
);

// 4. Generate API token
$token = $user->createToken('google_auth_token')->plainTextToken;

// 5. Return response
return response()->json([
    'token' => $token,
    'user' => $user
]);
```

### 4. Frontend Stores Token and Redirects

```javascript
// In GoogleSignInButton
localStorage.setItem('authToken', token);
localStorage.setItem('user', JSON.stringify(user));
router.push('/');
```

---

## Security Considerations

### ✅ What's Secure

1. **Token Verification**: Backend verifies token signature and expiration with Google
2. **Audience Validation**: Ensures token is for YOUR app (matches CLIENT_ID)
3. **No Secrets Exposed**: CLIENT_ID is public, no client secret in frontend code
4. **HTTPS Ready**: Works with HTTPS in production
5. **Same Email, Same Account**: If user registers with email+password and later uses Google with same email, they get the same account

### ⚠️ Security Notes

1. **Protect GOOGLE_CLIENT_ID in .env**: Don't commit `.env` files to git
2. **Use HTTPS in Production**: Google requires secure origins
3. **Validate Requests**: Backend verifies all tokens before accepting
4. **httpOnly Cookies**: Consider using httpOnly cookies instead of localStorage for even better security
5. **Token Expiration**: Google ID tokens expire in 1 hour, but that's fine - you generate a new Laravel token

---

## Troubleshooting

### Problem: "Google Sign-In button doesn't appear"

**Solution**:
1. Check that `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env.local`
2. Check browser console for errors
3. Verify JavaScript is enabled
4. Wait a few seconds for Google script to load

### Problem: "Invalid Google token" error

**Solution**:
1. Verify `GOOGLE_CLIENT_ID` in `.env` matches the one from Google Cloud
2. Check that the token hasn't expired (1 hour expiration)
3. Verify the authorized origins in Google Cloud include your localhost

### Problem: "CORS error"

**Solution**:
1. Check that `NEXT_PUBLIC_API_URL` points to correct backend URL
2. Verify Laravel CORS is configured in `config/cors.php`
3. Check browser console for exact error

### Problem: "User created but can't login afterward"

**Solution**:
1. Check that user was created in database: `SELECT * FROM user WHERE email = 'test@example.com';`
2. Verify token was returned from API
3. Check that token is being stored in localStorage

### Problem: "Existing email+password user can't login with Google"

**Solution**:
1. This should work automatically - GoogleAuthController checks `User::where('email', $email)->first()`
2. If not working, verify the email in the user table matches the Google email exactly
3. Check database for the user record

---

## Production Deployment

### Backend Changes

1. Update `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
   ```

2. Add production domain to Google Cloud authorized origins:
   ```
   https://yourdomain.com
   https://www.yourdomain.com
   ```

### Frontend Changes

1. Update `.env.local` or use `.env.production`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. Ensure HTTPS is configured

3. Update redirect URIs in Google Cloud:
   ```
   https://yourdomain.com/login
   https://yourdomain.com/register
   ```

### Security Checklist

- [ ] GOOGLE_CLIENT_ID is stored in .env, not hardcoded
- [ ] .env file is in .gitignore
- [ ] HTTPS is enabled on production
- [ ] CORS is properly configured
- [ ] Database backups are in place
- [ ] Email verification is considered for new accounts
- [ ] Rate limiting is configured
- [ ] Monitoring is set up for auth failures

---

## Testing

### Manual Testing

1. **Test Sign-Up with Google**:
   - Go to `/register`
   - Click "Sign up with Google"
   - Complete Google authentication
   - Should be logged in and redirected to home

2. **Test Login with Google**:
   - Go to `/login`
   - Click "Continue with Google"
   - Complete Google authentication
   - Should be logged in and redirected to home

3. **Test Email+Password Still Works**:
   - Test traditional login with email/password
   - Should still work as before

4. **Test Same Email**:
   - Create account with email+password
   - Try to login with Google using same email
   - Should log into the same account (no duplicate)

### API Testing

```bash
# Get a real ID token from Google (save from browser network tab)
# Then test the backend endpoint

curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "paste_real_token_here"
  }'

# Should return:
# {
#   "token": "api_token_here",
#   "user": { "user_id": 1, "name": "...", "email": "..." }
# }
```

---

## FAQ

**Q: Do I need to store Google user data?**  
A: No, you only store email, name, and profile picture. Google account details don't need to be stored.

**Q: What if user deletes their Google account?**  
A: Their 5SCENT account remains. They can set a password later if needed.

**Q: Can I make Google login mandatory?**  
A: Yes, you can remove the email/password form and only show Google button.

**Q: Is profile picture from Google automatically displayed?**  
A: Yes, it's stored in `profile_pic` column. Display it in your profile page.

**Q: What about password reset for Google users?**  
A: Google handles password recovery. For 5SCENT, they don't need a password unless they set one later.

**Q: Can I remove Google login later?**  
A: Yes, just remove the GoogleSignInButton component. Existing accounts won't be affected.

---

## Support & Documentation

- [Google Identity Services Documentation](https://developers.google.com/identity)
- [Laravel Sanctum Documentation](https://laravel.com/docs/sanctum)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Implementation Date**: December 8, 2025  
**Status**: ✅ Complete and Ready for Testing
