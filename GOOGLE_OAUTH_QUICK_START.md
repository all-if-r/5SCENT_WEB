# Google OAuth 2.0 - Quick Start (5 Minutes)

## Step 1: Get Google Client ID (3 min)

1. Go to: https://console.cloud.google.com
2. Create project → Name: **5SCENT**
3. APIs & Services → Library → Search "Google+ API" → Enable
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
5. Select: **Web application**
6. Add authorized origins:
   - `http://localhost:3000`
7. Click **Create**
8. **Copy the Client ID** (save it)

## Step 2: Configure Backend (1 min)

**File:** `laravel-5scent/.env`

Find line 14:
```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

Replace with your actual Client ID:
```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
```

Run:
```bash
cd laravel-5scent
php artisan config:clear
```

## Step 3: Configure Frontend (1 min)

**File:** `web-5scent/.env.local`

Add/Update:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Restart:
```bash
npm run dev
```

## Done! ✅

Test it:
1. Go to http://localhost:3000/login
2. Click "Continue with Google" button
3. Sign in with Google
4. Should redirect to home page

---

## What's Included

✅ Google Sign-In on login page  
✅ Google Sign-Up on register page  
✅ Secure backend token verification  
✅ Automatic user creation  
✅ Account linking (same email = same account)  
✅ Works with existing email+password auth  

---

## Files Modified

- ✅ `.env` (backend) - Added GOOGLE_CLIENT_ID
- ✅ `config/auth.php` - Added google_client_id config
- ✅ `hooks/useGoogleAuth.ts` - Fixed TypeScript
- ✅ `components/GoogleSignInButton.tsx` - Updated token key
- ✅ `app/login/page.tsx` - Added Google button
- ✅ `app/register/page.tsx` - Added Google button
- ✅ `.env.local` (frontend) - Added NEXT_PUBLIC_GOOGLE_CLIENT_ID

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Button doesn't show | Restart: `npm run dev` |
| "Invalid token" error | Verify CLIENT_ID matches in both files |
| CORS error | Start backend: `php artisan serve` |
| User not created | Check Laravel logs in `storage/logs/laravel.log` |

---

## Next Steps

- 📖 Read `GOOGLE_OAUTH_SETUP_COMPLETE.md` for detailed setup
- 📖 Read `GOOGLE_OAUTH_CODE_REFERENCE.md` for code examples
- 🧪 Test the flow on localhost
- 🚀 Deploy to production when ready

---

That's it! You now have complete Google OAuth 2.0 authentication. 🎉
