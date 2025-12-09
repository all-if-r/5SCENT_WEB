# Google OAuth Quick Reference - 5SCENT

## TL;DR - Quick Setup

### 1. Get Google Client ID (5 minutes)
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create project, enable Google+ API
- Create OAuth 2.0 Web Application credentials
- Copy the Client ID

### 2. Backend Setup (2 minutes)
```bash
# Update .env
echo "GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com" >> .env

# Clear cache
php artisan config:clear
```

### 3. Frontend Setup (2 minutes)
```bash
# Update .env.local
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com" >> .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local

# Restart Next.js dev server
npm run dev
```

### 4. Add to Your Pages (1 minute)
```typescript
import GoogleSignInButton from '@/components/GoogleSignInButton';

// In your login page:
<GoogleSignInButton mode="signin" />

// In your signup page:
<GoogleSignInButton mode="signup" />
```

**Done!** Test at http://localhost:3000/login

---

## Files Overview

### Backend (Laravel)

| File | Purpose |
|------|---------|
| `app/Http/Controllers/Auth/GoogleAuthController.php` | Handles OAuth token verification & user creation |
| `config/google.php` | Google configuration (CLIENT_ID from env) |
| `.env` | Contains `GOOGLE_CLIENT_ID` |
| `routes/api.php` | Contains `POST /api/auth/google` endpoint |

### Frontend (Next.js)

| File | Purpose |
|------|---------|
| `hooks/useGoogleAuth.ts` | React hook for Google Identity Services |
| `components/GoogleSignInButton.tsx` | Ready-to-use button component |
| `app/login/page-with-google.tsx` | Full login page example |
| `app/register/page-with-google.tsx` | Full signup page example |
| `.env.local` | Contains `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |

---

## API Reference

### Backend Endpoint

```
POST /api/auth/google
Content-Type: application/json

Request:
{
  "credential": "<google_id_token>"
}

Response (200):
{
  "token": "api_token_here",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "profile_pic": "https://..."
  }
}

Response (401):
{
  "message": "Invalid Google token"
}
```

### Frontend Hook

```typescript
const { renderGoogleButton } = useGoogleAuth(
  (token, user) => {
    // Success callback
    localStorage.setItem('authToken', token);
    router.push('/');
  },
  (error) => {
    // Error callback
    console.error(error.details);
  }
);
```

### Frontend Component

```typescript
// Basic usage
<GoogleSignInButton mode="signin" />

// With custom callback
<GoogleSignInButton 
  mode="signup"
  onSuccess={(token, user) => {
    console.log(`Welcome, ${user.name}!`);
  }}
/>
```

---

## Environment Variables

### Backend (.env)

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Google Cloud Setup - Checklist

- [ ] Create Google Cloud project
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials (Web application type)
- [ ] Add authorized JavaScript origins:
  - [ ] `http://localhost:3000`
  - [ ] `http://localhost:8000`
  - [ ] Production domain (when ready)
- [ ] Copy Client ID
- [ ] Update .env and .env.local

---

## How It Works (Simple)

```
1. User clicks "Sign in with Google" button
   ↓
2. Google popup opens, user authenticates
   ↓
3. Google returns ID token to frontend
   ↓
4. Frontend sends token to Laravel backend
   ↓
5. Backend verifies token with Google
   ↓
6. Backend checks if user exists in database
   - If yes: Use existing user
   - If no: Create new user with email & name from Google
   ↓
7. Backend generates Laravel API token
   ↓
8. Frontend stores token, redirects to home
```

---

## Common Issues

### "Google button not showing"
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
- Check browser console for errors
- Restart Next.js dev server

### "Invalid token error from backend"
- Verify `GOOGLE_CLIENT_ID` in .env matches Google Cloud
- Check authorized origins in Google Cloud include your domain
- Verify token hasn't expired (1 hour timeout)

### "Unauthorized origin" error
- Go to Google Cloud Console
- Add your domain to "Authorized JavaScript origins"
- Include `http://localhost:3000` for local development

### "CORS errors"
- Check Laravel CORS config
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser Network tab for exact error

### "Can't login after account created"
- Check user was created in database: 
  ```sql
  SELECT * FROM user WHERE email = 'test@example.com';
  ```
- Verify email case sensitivity matches
- Check API token was returned correctly

---

## Security Notes

✅ **Token verified with Google** - No fake tokens accepted  
✅ **Audience validation** - Token must be for your app  
✅ **Expiration checked** - No expired tokens  
✅ **Same email = same account** - No duplicate accounts  
✅ **No passwords exposed** - Google handles password security  

⚠️ **DO NOT:**
- Hardcode CLIENT_ID in code
- Expose `.env` file
- Use HTTP in production (use HTTPS)
- Skip token verification on backend

---

## Testing

### Quick Test
1. Go to http://localhost:3000/login
2. Click "Continue with Google"
3. Sign in with Google account
4. Should redirect to home page
5. Check localStorage has `authToken`

### Verify User Created
```bash
# SSH into your database and check:
SELECT * FROM user WHERE email = 'your_test_email@gmail.com';
```

### Test API Directly
```bash
# Get token from browser Network tab, then:
curl -X POST http://localhost:8000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential": "paste_token_here"}'
```

---

## Production Deployment

### Before Going Live

1. **Update Google Cloud Console**:
   - Add production domain to authorized origins
   - Update redirect URIs

2. **Update Backend .env**:
   ```env
   GOOGLE_CLIENT_ID=production_client_id
   ```

3. **Update Frontend .env.production**:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=production_client_id
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

4. **Enable HTTPS** on both frontend and backend

5. **Test thoroughly** on staging environment first

---

## Code Examples

### Add Google Button to Existing Login Page

```typescript
// app/login/page.tsx
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1>Login</h1>
      
      {/* Add Google button */}
      <GoogleSignInButton mode="signin" />
      
      {/* Or your existing form */}
      <form>
        {/* email & password fields */}
      </form>
    </div>
  );
}
```

### Custom Success Handler

```typescript
<GoogleSignInButton 
  mode="signin"
  onSuccess={(token, user) => {
    // Custom behavior
    console.log(`Logged in as ${user.name}`);
    
    // Store additional data
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    
    // Redirect to dashboard instead of home
    router.push('/dashboard');
  }}
/>
```

### Custom Error Handler

```typescript
<GoogleSignInButton 
  mode="signin"
  onError={(error) => {
    if (error.error === 'Invalid Google token') {
      showAlert('Invalid token. Please try again.');
    } else {
      showAlert(`Error: ${error.details}`);
    }
  }}
/>
```

---

## Useful Links

- [Google Cloud Console](https://console.cloud.google.com)
- [Google Identity Services Docs](https://developers.google.com/identity)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)

---

## Support

For issues, check:
1. Browser console for JavaScript errors
2. Laravel logs: `storage/logs/laravel.log`
3. Google Cloud credentials configuration
4. Environment variables in both .env and .env.local
5. Network tab in browser DevTools

---

**Last Updated**: December 8, 2025  
**Status**: ✅ Ready for Production
