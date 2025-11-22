# Environment Setup Guide

## Backend Environment File

The backend `.env` file has been configured with:
- Database: `db_5scent` (matching your existing database)
- Default Laravel settings
- Midtrans configuration placeholders
- Sanctum stateful domains for frontend

**Important:** After copying `.env.example` to `.env`, you need to:
1. Run `php artisan key:generate` to generate APP_KEY
2. Update database credentials if needed
3. Add Midtrans keys if using QRIS payment

## Frontend Environment File

The frontend `.env.local` file has been configured with:
- API URL: `http://localhost:8000/api`

**Note:** `.env` files are in `.gitignore` for security. You'll need to create them manually:

### Backend
```bash
cd backend/laravel-5scent
cp .env.example .env
php artisan key:generate
```

### Frontend
```bash
cd frontend/web-5scent
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
```

## Database Configuration

The `.env` file is configured to use:
- Database: `db_5scent`
- Host: `127.0.0.1`
- Port: `3306`
- Username: `root`
- Password: (empty by default, update if needed)

Make sure your Laragon MySQL is running and the database `db_5scent` exists.



