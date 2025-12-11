# Development Notes - 5SCENT Web Project

## Critical Terminal Usage Guidelines

### ⚠️ IMPORTANT: Use SEPARATE Terminals for Development Servers

**ALWAYS run these in SEPARATE terminal windows. Do NOT run multiple commands in the same terminal.**

### Terminal 1: Laravel Backend
```powershell
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT\backend\laravel-5scent"
php artisan serve --port 8000
```

**Expected Output:**
```
Laravel development server started: http://127.0.0.1:8000
```

**Keep this terminal OPEN and RUNNING.** Do NOT run other commands here.

### Terminal 2: Next.js Frontend
```powershell
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT\frontend\web-5scent"
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**Keep this terminal OPEN and RUNNING.** Do NOT run other commands here.

### Terminal 3: Utility/Management
```powershell
cd "c:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\5SCENT_1\5SCENT_WEB\WEB-5SCENT"
```

Use this terminal ONLY for:
- Running database migrations: `php artisan migrate`
- Running seeders: `php artisan db:seed`
- Running npm package installs: `npm install`
- Running composer installs: `composer install`
- Any PHP artisan commands that don't require the server to stay running
- ngrok tunnel setup: `ngrok http 8000`

**NEVER run commands like `php artisan serve` or `npm run dev` here if Terminals 1 & 2 are already running.**

---

## Why This Matters

When you run a command in the same terminal as a running dev server:

❌ **Wrong:**
```powershell
# Terminal running: php artisan serve --port 8000
# You try to run: php artisan migrate
# Result: Laravel server STOPS, migration runs, server doesn't restart
```

✅ **Correct:**
```powershell
# Terminal 1: php artisan serve --port 8000 (keeps running)
# Terminal 3: php artisan migrate (runs without stopping server)
```

---

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

**Verify values are set correctly:**
- `NEXT_PUBLIC_API_URL` = `http://localhost:8000/api`
- No trailing slashes on `NEXT_PUBLIC_API_URL`

### Backend (.env)
```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000

SANCTUM_STATEFUL_DOMAINS=localhost:3000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=5scent_db
DB_USERNAME=root
DB_PASSWORD=

# Midtrans (Sandbox for development)
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=Mid-server-bDGoRmIgpobYl-DlzaKyl1IO
MIDTRANS_CLIENT_KEY=Mid-client-mX1uUDkMfk28SfUG
```

---

## Common Issues & Solutions

### Issue 1: "Cannot connect to http://localhost:8000"
**Solution:** Check Terminal 1 - is `php artisan serve` still running? If not, restart it.

### Issue 2: "CORS Error - No 'Access-Control-Allow-Origin' header"
**Solution:** 
1. Verify `config/cors.php` has `allowed_origins` with `http://localhost:3000`
2. Ensure CORS middleware is registered in `bootstrap/app.php`
3. Restart Laravel server: `php artisan serve --port 8000`

### Issue 3: "ERR_NAME_NOT_RESOLVED for fonts"
**Solution:** Already fixed in `globals.css` - uses system fonts instead of external URLs. No action needed.

### Issue 4: TypeScript errors about undefined variables
**Solution:** Always null-check variables that could be undefined:
```typescript
// ❌ Wrong
navigator.clipboard.writeText(value); // Error if value is undefined

// ✅ Correct
if (value) {
  navigator.clipboard.writeText(value);
}

// ✅ Also correct (with nullish coalescing)
const status = searchParams?.get("status") ?? "all";
```

### Issue 5: GSI_LOGGER warning "Provided button width is invalid"
**Solution:** Already fixed in `hooks/useGoogleAuth.ts` - changed `width: '100%'` to `width: 'wide'`.

---

## Quick Commands Reference

### Backend Commands
```powershell
# Check if MySQL is running (if needed)
Get-Service -Name MySQL*

# Connect to database
mysql -u root 5scent_db

# Run migrations (in Terminal 3, NOT Terminal 1)
php artisan migrate

# Seed database
php artisan db:seed

# Clear caches (if having cache issues)
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Check logs
Get-Content "storage\logs\laravel.log" -Tail 50
```

### Frontend Commands
```powershell
# Install new package (in Terminal 3, NOT Terminal 2)
npm install package-name

# Build for production
npm run build

# Clear Next.js cache
rm -r .next
```

---

## Testing the Setup

### 1. Test Backend API
```powershell
# In Terminal 3:
curl http://localhost:8000/api/products
# or use Postman/Insomnia
```

Expected: Returns JSON array of products.

### 2. Test Frontend Connection
Visit `http://localhost:3000` in browser.

Expected: Page loads without CORS errors, network tab shows successful requests to `http://localhost:8000/api/*`.

### 3. Check Console for Errors
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for:
   - ❌ CORS errors → Check backend CORS config
   - ❌ Font errors → Already fixed, should be gone
   - ❌ Axios errors → Check NEXT_PUBLIC_API_URL
   - ✅ No errors → Setup is correct!

---

## Git & Version Control

**Before committing:**
```powershell
# Check for uncommitted changes
git status

# See differences
git diff

# Stage changes
git add .

# Commit with message
git commit -m "Fix description"

# Push to remote
git push
```

**Never commit:**
- `.env` files with secrets
- `node_modules/`
- `vendor/` (PHP)
- `.next/` build directory

---

## Support & Debugging

### Backend Logs
```powershell
# Get last 50 lines of Laravel log
Get-Content "backend/laravel-5scent/storage/logs/laravel.log" -Tail 50
```

### Frontend Errors
Open `http://localhost:3000` and check:
1. Console tab (F12) for JavaScript errors
2. Network tab to verify API calls
3. Application tab to check localStorage for auth token

### Database Issues
```powershell
# Connect to MySQL
mysql -u root

# Use database
use 5scent_db;

# Check tables
show tables;

# See structure of specific table
describe users;

# Quick query example
select * from products limit 5;
```

---

## Last Updated
December 11, 2025

**All issues have been fixed:**
- ✅ CORS configuration corrected
- ✅ Font loading errors resolved (system fonts)
- ✅ Google Sign-In width warning fixed
- ✅ TypeScript undefined variable error fixed
- ✅ Axios baseURL verified
