# Google OAuth 2.0 - Code Reference & Examples

**Quick code samples for integration and troubleshooting**

---

## Backend Code Reference

### GoogleAuthController::handleGoogleLogin()

**Location:** `app/Http/Controllers/Auth/GoogleAuthController.php`

**What it does:**
- Validates credential is present
- Verifies Google ID token
- Extracts email, name, picture
- Creates or retrieves user
- Generates Sanctum token
- Returns JSON response

**Full method signature:**
```php
public function handleGoogleLogin(Request $request)
```

**Input:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExIn0..."
}
```

**Output:**
```json
{
  "token": "1|abc123xyz456...",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "profile_pic": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error scenarios:**
```php
// No credential
{ "message": "Google credential is required." }  // 422

// Invalid token
{ "message": "Invalid Google token" }  // 401

// No email
{ "message": "Email not provided by Google." }  // 400
```

---

### Token Verification Logic

**How the backend verifies Google tokens:**

```php
private function verifyGoogleToken(string $token): ?array
{
    // 1. Get your CLIENT_ID from config
    $googleClientId = config('auth.google_client_id');
    
    // 2. Send token to Google for verification
    $client = new \GuzzleHttp\Client();
    $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
        'query' => ['id_token' => $token],
    ]);
    
    // 3. Decode response
    $payload = json_decode($response->getBody(), true);
    
    // 4. Verify audience (CLIENT_ID)
    if (($payload['aud'] ?? null) !== $googleClientId) {
        return null;  // Token not for this app
    }
    
    // 5. Verify not expired
    if ((int)($payload['exp'] ?? 0) < time()) {
        return null;  // Token expired
    }
    
    // 6. Return verified payload
    return $payload;
}
```

**Payload contains:**
- `iss` - Issuer (accounts.google.com)
- `aud` - Audience (your CLIENT_ID)
- `exp` - Expiration time (Unix timestamp)
- `email` - User email
- `name` - User full name
- `picture` - User profile picture URL
- `email_verified` - Whether email is verified

---

### User Creation Logic

**How new users are created:**

```php
$user = User::create([
    'name' => $name,  // From Google profile
    'email' => $email,  // From Google profile
    'password' => Hash::make(Str::random(32)),  // Random, can't be used
    'profile_pic' => $picture,  // From Google
]);
```

**Key points:**
- `email` is UNIQUE, so duplicate emails = same account
- `password` is random so Google users can't use password login
- All other fields (phone, address, etc.) default to NULL
- User can add phone/address in profile settings later

---

## Frontend Code Reference

### useGoogleAuth Hook

**Location:** `hooks/useGoogleAuth.ts`

**What it does:**
- Loads Google Identity Services script from CDN
- Initializes Google Sign-In with your CLIENT_ID
- Renders Google button in specified container
- Handles sign-in responses
- Communicates with backend

**Usage example:**

```typescript
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function MyComponent() {
  const { renderGoogleButton, googleClientId } = useGoogleAuth(
    (token, user) => {
      // Success callback
      console.log('User:', user.email);
      localStorage.setItem('token', token);
    },
    (error) => {
      // Error callback
      console.error('Login failed:', error.details);
    }
  );

  useEffect(() => {
    // Render button when component mounts
    renderGoogleButton('button-container-id');
  }, []);

  return <div id="button-container-id" />;
}
```

**Hook options:**
```typescript
interface GoogleError {
  error: string;      // Main error message
  message?: string;   // Alternative message
  details?: string;   // Detailed error info
}

// Returns:
{
  renderGoogleButton: (containerId: string, options?: any) => void;
  googleClientId: string | undefined;
}
```

---

### GoogleSignInButton Component

**Location:** `components/GoogleSignInButton.tsx`

**What it does:**
- Wraps useGoogleAuth hook
- Renders official Google button
- Handles loading states
- Shows error toasts
- Stores token and redirects
- No configuration needed (uses env vars)

**Usage example:**

```tsx
// In login page
<GoogleSignInButton mode="signin" />

// In register page
<GoogleSignInButton mode="signup" />

// With custom callback
<GoogleSignInButton 
  mode="signin"
  onSuccess={(token, user) => {
    console.log('Logged in as:', user.name);
    // Do something else before redirect
  }}
/>
```

**Props:**
```typescript
interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';  // Button text (continue vs signup)
  onSuccess?: (token: string, user: any) => void;  // Custom callback
}
```

**What it handles automatically:**
- ✅ Loads Google script
- ✅ Shows loading skeleton
- ✅ Renders button
- ✅ Handles success → stores token, shows toast, redirects
- ✅ Handles errors → shows error toast
- ✅ Works on login and signup pages

---

## Environment Configuration Reference

### Backend (.env)

```env
# Google OAuth 2.0 Configuration
# Get CLIENT_ID from: https://console.cloud.google.com
# Steps:
# 1. Create project "5SCENT"
# 2. Enable Google+ API
# 3. Create OAuth 2.0 Web Application credentials
# 4. Add authorized origins: http://localhost:3000
# 5. Copy Client ID here
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

**How to use in code:**
```php
// In controller
$clientId = config('auth.google_client_id');

// In env
$clientId = env('GOOGLE_CLIENT_ID');
```

---

### Frontend (.env.local)

```env
# Google OAuth Configuration
# MUST use same CLIENT_ID as backend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE

# API URL for backend communication
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**How to use in code:**
```typescript
// In hooks/components
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## Authentication Flow Code Examples

### Frontend Flow (Step-by-Step)

```typescript
// 1. User clicks Google button
// 2. Google popup opens
// 3. User signs in
// 4. Google returns credential
const handleGoogleResponse = async (response: any) => {
  // 5. Extract credential
  const credential = response.credential;
  
  // 6. Send to backend
  const res = await fetch(`${apiUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  
  // 7. Get response
  const data = await res.json();
  
  // 8. Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  // 9. Redirect
  router.push('/');
};
```

### Backend Flow (Step-by-Step)

```php
// 1. Receive credential from frontend
$credential = $request->input('credential');

// 2. Verify with Google
$googleClientId = config('auth.google_client_id');
$client = new GuzzleHttp\Client();
$response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
    'query' => ['id_token' => $credential],
]);
$payload = json_decode($response->getBody(), true);

// 3. Validate audience
if ($payload['aud'] !== $googleClientId) {
    return response()->json(['message' => 'Invalid audience'], 401);
}

// 4. Validate expiration
if ($payload['exp'] < time()) {
    return response()->json(['message' => 'Token expired'], 401);
}

// 5. Extract email
$email = $payload['email'];

// 6. Find or create user
$user = User::firstOrCreate(
    ['email' => $email],
    [
        'name' => $payload['name'],
        'email' => $email,
        'password' => Hash::make(Str::random(32)),
        'profile_pic' => $payload['picture'],
    ]
);

// 7. Generate token
$token = $user->createToken('google_auth_token')->plainTextToken;

// 8. Return response
return response()->json([
    'token' => $token,
    'user' => [
        'user_id' => $user->user_id,
        'name' => $user->name,
        'email' => $user->email,
        'profile_pic' => $user->profile_pic,
    ]
]);
```

---

## API Testing Examples

### Using cURL

```bash
# Get a real Google ID token first (from browser console)
# Then test the API

curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExIn0..."
  }'
```

### Using Postman

1. Create POST request to: `http://localhost:8000/api/auth/google`
2. Set header: `Content-Type: application/json`
3. Body (raw JSON):
```json
{
  "credential": "paste_your_google_token_here"
}
```
4. Send request

**Note:** To get a real Google token:
1. Open browser DevTools (F12)
2. Go to Console
3. Type: `window.google.accounts.id.initialize({client_id: 'YOUR_CLIENT_ID'})`
4. Get token from Google sign-in response

---

## Error Handling Examples

### In useGoogleAuth Hook

```typescript
const handleGoogleResponse = async (response: any) => {
  try {
    if (!response.credential) {
      throw new Error('No credential received');
    }

    const res = await fetch(`${apiUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await res.json();

    // Check if request was successful
    if (!res.ok) {
      // API returned error
      onError?.({
        error: data.message || 'Google login failed',
        details: data.details
      });
      return;
    }

    // Success
    onSuccess?.(data.token, data.user);

  } catch (error) {
    // Network or parsing error
    onError?.({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

### In GoogleSignInButton Component

```typescript
const { renderGoogleButton } = useGoogleAuth(
  (token, user) => {
    // Success
    localStorage.setItem('token', token);
    showToast(`Welcome, ${user.name}!`, 'success');
    router.push('/');
  },
  (error) => {
    // Error
    showToast(error.details || error.error, 'error');
  }
);
```

---

## Debugging Tips

### Check if Google Script Loaded

```javascript
// In browser console
window.google  // Should exist if script loaded
window.google.accounts.id  // Should exist if initialized
```

### Check Environment Variables

```bash
# Backend
grep GOOGLE_CLIENT_ID laravel-5scent/.env

# Frontend
grep NEXT_PUBLIC_GOOGLE_CLIENT_ID web-5scent/.env.local
```

### Check Browser Storage

```javascript
// In DevTools
localStorage.getItem('token')  // Should be the API token
localStorage.getItem('user')  // Should be the user object
```

### Check API Response

```javascript
// Test directly in browser
fetch('http://localhost:8000/api/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential: 'invalid' })
}).then(r => r.json()).then(console.log)
```

### Check Laravel Logs

```bash
tail -50 laravel-5scent/storage/logs/laravel.log
```

---

## Common Code Patterns

### Protecting Routes Based on Auth

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Welcome, {user.name}!</div>;
}
```

### Accessing User Data

```typescript
// From AuthContext
const { user } = useAuth();
console.log(user?.email);  // Works for both auth methods
console.log(user?.profile_pic);  // Populated by Google

// From localStorage
const user = JSON.parse(localStorage.getItem('user') || '{}');
const token = localStorage.getItem('token');

// After Google login
const response = await fetch('...auth/google');
const { token, user } = await response.json();
```

### Making Authenticated Requests

```typescript
import api from '@/lib/api';

// Token is automatically added by api interceptor
const response = await api.get('/me');
const userData = response.data;

// Or manually
const response = await fetch('http://localhost:8000/api/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## Production Checklist

```typescript
// Before deploying to production:

// 1. Update CLIENT_ID
GOOGLE_CLIENT_ID=your_production_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_client_id

// 2. Update API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api

// 3. Add production domain to Google authorized origins
// Google Cloud Console → OAuth credential → Authorized origins
// https://yourdomain.com
// https://api.yourdomain.com

// 4. Ensure HTTPS is enabled
// Both frontend and backend must use HTTPS

// 5. Test complete flow on staging
// Sign up → Check database → Sign in → Logout → Sign in again

// 6. Backup production database
// Just in case anything goes wrong
```

---

## References

- **Google Identity Services**: https://developers.google.com/identity
- **Google OAuth 2.0**: https://developers.google.com/identity/protocols/oauth2
- **Laravel Sanctum**: https://laravel.com/docs/sanctum
- **Next.js**: https://nextjs.org/docs

---

**This is a quick reference. For detailed setup, see: GOOGLE_OAUTH_SETUP_COMPLETE.md**
