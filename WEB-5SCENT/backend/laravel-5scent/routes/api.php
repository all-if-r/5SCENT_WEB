<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RatingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SalesReportController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/best-sellers', [ProductController::class, 'bestSellers']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// Admin auth
Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AdminAuthController::class, 'me']);
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::put('/profile', [AdminAuthController::class, 'updateProfile']);
        Route::post('/change-password', [AdminAuthController::class, 'changePassword']);
    });
});

// Protected user routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Profile
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);
    Route::delete('/profile/picture', [ProfileController::class, 'deleteProfilePicture']);

    // Cart
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/', [CartController::class, 'store']);
        Route::put('/{id}', [CartController::class, 'update']);
        Route::delete('/{id}', [CartController::class, 'destroy']);
    });

    // Wishlist
    Route::prefix('wishlist')->group(function () {
        Route::get('/', [WishlistController::class, 'index']);
        Route::post('/', [WishlistController::class, 'store']);
        Route::delete('/{id}', [WishlistController::class, 'destroy']);
    });

    // Orders
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::put('/{id}', [OrderController::class, 'update']);
        Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('/{id}/finish', [OrderController::class, 'finish']);
        Route::get('/{id}/reviews', [RatingController::class, 'getOrderReviews']);
    });

    // Ratings
    Route::post('/ratings', [RatingController::class, 'store']);
    Route::put('/ratings/{id}', [RatingController::class, 'update']);

    // Payment
    Route::post('/payments/qris', [PaymentController::class, 'createQrisPayment']);
});

// Admin routes
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/dashboard/data', [DashboardController::class, 'dashboardData']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/orders', [DashboardController::class, 'orders']);
    Route::put('/dashboard/orders/{id}/status', [DashboardController::class, 'updateOrderStatus']);
    Route::get('/dashboard/sales-report', [DashboardController::class, 'salesReport']);

    // Sales Reports
    Route::get('/sales-reports', [SalesReportController::class, 'index']);
    Route::get('/sales-reports/export/pdf', [SalesReportController::class, 'exportPdf']);
    Route::get('/sales-reports/export/excel', [SalesReportController::class, 'exportExcel']);

    // Products
    Route::apiResource('products', ProductController::class);
    Route::delete('/products/{productId}/images/{imageId}', [ProductController::class, 'deleteImage']);
    Route::post('/products/{productId}/upload-image', [ProductController::class, 'uploadImage']);

    // POS
    Route::prefix('pos')->group(function () {
        Route::get('/products/search', [PosController::class, 'searchProducts']);
        Route::post('/transactions', [PosController::class, 'createTransaction']);
        Route::get('/transactions', [PosController::class, 'indexTransactions']);
        Route::get('/transactions/{id}', [PosController::class, 'getTransaction']);
        Route::get('/transactions/{id}/receipt', [PosController::class, 'generateReceipt']);
    });

    // Reviews
    Route::prefix('reviews')->group(function () {
        Route::get('/', [RatingController::class, 'adminIndex']);
        Route::get('/{id}', [RatingController::class, 'adminShow']);
        Route::put('/{id}/visibility', [RatingController::class, 'adminUpdateVisibility']);
        Route::delete('/{id}', [RatingController::class, 'adminDestroy']);
    });
});

// Payment webhook (no auth required)
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

