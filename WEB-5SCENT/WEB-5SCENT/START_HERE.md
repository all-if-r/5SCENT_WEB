# 🚀 START HERE - 5SCENT Setup Guide

Welcome to the 5SCENT perfume ecommerce project! This guide will help you get started.

## 📋 Prerequisites

Before you begin, ensure you have:

- **PHP 8.2+** installed
- **Composer** installed
- **Node.js 18+** and **npm** installed
- **MySQL/MariaDB** (via Laragon or XAMPP)
- **Git** installed

## 🏃 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend
cd backend/laravel-5scent

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Configure database in .env file
# Edit .env and set:
# DB_DATABASE=5scent_db
# DB_USERNAME=root
# DB_PASSWORD=your_password

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Create storage link
php artisan storage:link

# Start server
php artisan serve
```

Backend will be available at: `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend/web-5scent

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## 🔑 Default Credentials

### Admin Account
- Email: `admin@5scent.com`
- Password: `password`

### Test User Account
- Email: `user@test.com`
- Password: `password`

## 📚 Next Steps

1. Read [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) to understand the project structure
2. Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for feature overview
3. Review [API_ROUTES.md](./API_ROUTES.md) for API documentation

## 🆘 Troubleshooting

### Backend Issues

**Problem**: `Class 'PDO' not found`
- **Solution**: Install PHP PDO extension: `sudo apt-get install php-pdo-mysql` (Linux) or enable in php.ini

**Problem**: `SQLSTATE[HY000] [1045] Access denied`
- **Solution**: Check database credentials in `.env` file

**Problem**: `Storage link not working`
- **Solution**: Run `php artisan storage:link` again

### Frontend Issues

**Problem**: `Module not found`
- **Solution**: Run `npm install` again

**Problem**: `API connection failed`
- **Solution**: Check `NEXT_PUBLIC_API_URL` in `.env.local` and ensure backend is running

## 📖 Documentation Index

- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) - Project structure
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Features overview
- [API_ROUTES.md](./API_ROUTES.md) - API documentation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database structure
- [TOAST_IMPLEMENTATION.md](./TOAST_IMPLEMENTATION.md) - Toast system guide
- [PROFILE_PHOTO_UPLOAD.md](./PROFILE_PHOTO_UPLOAD.md) - Profile photo guide
- [POS_GUIDE.md](./POS_GUIDE.md) - POS system guide

## 🎯 Development Workflow

1. Make changes to code
2. Test locally
3. Commit changes
4. Push to repository

## 📞 Support

For issues or questions, please check the documentation files or create an issue in the repository.



