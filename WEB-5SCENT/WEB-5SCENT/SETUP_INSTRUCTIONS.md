# 🛠️ Setup Instructions

Complete setup instructions for 5SCENT monorepo.

## Prerequisites

Install the following before starting:

1. **PHP 8.2+**
   - Download from: https://www.php.net/downloads.php
   - Or use Laragon/XAMPP which includes PHP

2. **Composer**
   - Download from: https://getcomposer.org/download/
   - Verify: `composer --version`

3. **Node.js 18+ and npm**
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

4. **MySQL/MariaDB**
   - Use Laragon (recommended): https://laragon.org/
   - Or XAMPP: https://www.apachefriends.org/
   - Or standalone MySQL

5. **Git** (optional)
   - Download from: https://git-scm.com/downloads

## Step-by-Step Setup

### 1. Backend Setup

#### Navigate to Backend Directory
```bash
cd backend/laravel-5scent
```

#### Install Dependencies
```bash
composer install
```

#### Environment Configuration
```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

#### Database Configuration

Edit `.env` file and configure database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=5scent_db
DB_USERNAME=root
DB_PASSWORD=your_password_here
```

**Create Database:**
- Open HeidiSQL or phpMyAdmin
- Create new database: `5scent_db`
- Or use command: `CREATE DATABASE 5scent_db;`

#### Run Migrations
```bash
php artisan migrate
```

#### Seed Database
```bash
php artisan db:seed
```

This creates:
- Admin user: `admin@5scent.com` / `password`
- Test user: `user@test.com` / `password`
- Sample products

#### Create Storage Link
```bash
php artisan storage:link
```

This creates a symbolic link for file storage.

#### Start Backend Server
```bash
php artisan serve
```

Backend will run on: `http://localhost:8000`

### 2. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd frontend/web-5scent
```

#### Install Dependencies
```bash
npm install
```

#### Environment Configuration

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

#### Start Development Server
```bash
npm run dev
```

Frontend will run on: `http://localhost:3000`

## Verification

### Backend Verification

1. Visit: `http://localhost:8000`
   - Should see: `{"message":"5SCENT API"}`

2. Test API endpoint:
   - Visit: `http://localhost:8000/api/products`
   - Should return JSON with products

### Frontend Verification

1. Visit: `http://localhost:3000`
   - Should see homepage with hero section

2. Test navigation:
   - Click "Shop Now" or "Products"
   - Should see product listing

## Default Credentials

### Admin Account
- **URL**: `http://localhost:3000/admin/login`
- **Email**: `admin@5scent.com`
- **Password**: `password`

### Test User Account
- **URL**: `http://localhost:3000/login`
- **Email**: `user@test.com`
- **Password**: `password`

## Midtrans Configuration (Optional)

For QRIS payment to work:

1. Sign up at: https://dashboard.midtrans.com/
2. Get your Server Key and Client Key
3. Add to backend `.env`:

```env
MIDTRANS_SERVER_KEY=your_server_key_here
MIDTRANS_CLIENT_KEY=your_client_key_here
MIDTRANS_IS_PRODUCTION=false
```

## Troubleshooting

### Backend Issues

**Problem**: `composer install` fails
- **Solution**: Check PHP version: `php -v` (need 8.2+)
- **Solution**: Update Composer: `composer self-update`

**Problem**: Database connection error
- **Solution**: Check MySQL is running
- **Solution**: Verify credentials in `.env`
- **Solution**: Check database exists

**Problem**: Migration fails
- **Solution**: Drop database and recreate
- **Solution**: Check database user has permissions

**Problem**: Storage link fails
- **Solution**: Run: `php artisan storage:link` again
- **Solution**: Check `storage/app/public` exists

### Frontend Issues

**Problem**: `npm install` fails
- **Solution**: Clear cache: `npm cache clean --force`
- **Solution**: Delete `node_modules` and `package-lock.json`, then reinstall

**Problem**: API connection fails
- **Solution**: Check backend is running on port 8000
- **Solution**: Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- **Solution**: Check CORS settings (should work with Sanctum)

**Problem**: Images not loading
- **Solution**: Ensure storage link is created
- **Solution**: Check file permissions: `chmod -R 775 storage`
- **Solution**: Verify image paths in database

## Development Workflow

1. **Start Backend**:
   ```bash
   cd backend/laravel-5scent
   php artisan serve
   ```

2. **Start Frontend** (new terminal):
   ```bash
   cd frontend/web-5scent
   npm run dev
   ```

3. **Make Changes**:
   - Backend: Edit files in `backend/laravel-5scent/app/`
   - Frontend: Edit files in `frontend/web-5scent/app/` or `components/`

4. **Test Changes**:
   - Backend: Test API endpoints
   - Frontend: Check browser for updates (hot reload)

## Production Build

### Backend
```bash
# Optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set environment
APP_ENV=production
APP_DEBUG=false
```

### Frontend
```bash
# Build
npm run build

# Start production server
npm start
```

## Additional Resources

- [Laravel Documentation](https://laravel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues:
1. Check [START_HERE.md](./START_HERE.md)
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) (if exists)
3. Check error logs
4. Create an issue in repository



