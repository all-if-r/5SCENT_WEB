# Laravel Storage Setup Instructions

## Problem Fixed

The Laravel backend was returning 500 errors because the session storage directories were missing. This has been fixed by:

1. ✅ Created all required storage directories
2. ✅ Created `config/session.php` with proper configuration
3. ✅ Set default session driver to `file` (can be changed via `.env`)

## Manual Commands to Run

After pulling these changes, run the following commands in `backend/laravel-5scent`:

### 1. Clear Configuration Cache
```bash
php artisan config:clear
```

### 2. Clear Application Cache
```bash
php artisan cache:clear
```

### 3. Create Storage Link (if using public storage)
```bash
php artisan storage:link
```

### 4. Set Permissions (Linux/Mac only - Windows doesn't need this)
```bash
chmod -R 775 storage bootstrap/cache
```

## Environment Variables

Make sure your `.env` file has:

```env
SESSION_DRIVER=file
```

Or you can use:
- `SESSION_DRIVER=database` (requires `sessions` table migration)
- `SESSION_DRIVER=cookie` (for stateless APIs)

## Verification

After running the commands above:

1. Start the Laravel server: `php artisan serve`
2. Test the API endpoint: `http://localhost:8000/api/products`
3. You should get a JSON response with products, not a 500 error

## Storage Directory Structure

```
storage/
├── app/
│   └── public/          # Public uploaded files
├── framework/
│   ├── cache/           # Application cache
│   │   └── data/        # Cache data files
│   ├── sessions/        # Session files (when using 'file' driver)
│   └── views/           # Compiled Blade templates
└── logs/                # Application logs
```

All directories have been created and are ready to use.

