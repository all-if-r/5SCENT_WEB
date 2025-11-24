# Updated Backend Logic - Cart & Wishlist Controllers

## Cart Controller - Complete Updated Implementation

### File: `app/Http/Controllers/CartController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * Get all cart items for the authenticated user
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Load cart items with product and product images
            $cartItems = Cart::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->get();

            // Format items with calculated prices and totals
            $formattedItems = $cartItems->map(function($item) {
                return [
                    'cart_id' => $item->cart_id,
                    'product_id' => $item->product_id,
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                    'price' => $item->price,           // From getPriceAttribute
                    'total' => $item->total,           // From getTotalAttribute
                    'product' => $item->product,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                ];
            });

            // Calculate total from all items
            $total = $formattedItems->sum(function($item) {
                return $item['total'] ?? 0;
            });

            return response()->json([
                'items' => $formattedItems,
                'total' => $total,
            ]);
        } catch (\Exception $e) {
            \Log::error('Cart index error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to fetch cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add item to cart or update if already exists
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Validate input
            $validated = $request->validate([
                'product_id' => 'required|exists:product,product_id',
                'size' => 'required|in:30ml,50ml',
                'quantity' => 'required|integer|min:1',
            ]);

            // Check product exists
            $product = Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'message' => 'Product not found'
                ], 404);
            }

            // Check stock availability
            $stockField = $validated['size'] === '30ml' ? 'stock_30ml' : 'stock_50ml';
            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }

            // Check if item already exists in cart
            $cartItem = Cart::where('user_id', $user->user_id)
                ->where('product_id', $validated['product_id'])
                ->where('size', $validated['size'])
                ->first();

            if ($cartItem) {
                // Update quantity if item exists
                $newQuantity = $cartItem->quantity + $validated['quantity'];
                if ($product->$stockField < $newQuantity) {
                    return response()->json([
                        'message' => 'Insufficient stock'
                    ], 400);
                }
                $cartItem->update(['quantity' => $newQuantity]);
                $cartItem->load(['product' => function($query) {
                    $query->with('images');
                }]);
            } else {
                // Create new cart item - auto-increment ID will be sequential
                $cartItem = Cart::create([
                    'user_id' => $user->user_id,
                    'product_id' => $validated['product_id'],
                    'size' => $validated['size'],
                    'quantity' => $validated['quantity'],
                ]);
                $cartItem->load(['product' => function($query) {
                    $query->with('images');
                }]);
            }

            // Return formatted response
            return response()->json([
                'cart_id' => $cartItem->cart_id,
                'product_id' => $cartItem->product_id,
                'size' => $cartItem->size,
                'quantity' => $cartItem->quantity,
                'price' => $cartItem->price,           // Uses accessor
                'total' => $cartItem->total,           // Uses accessor
                'product' => $cartItem->product,
                'created_at' => $cartItem->created_at,
                'updated_at' => $cartItem->updated_at,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart store error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to add item to cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update cart item quantity
     * 
     * @param Request $request
     * @param int $id Cart item ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Find cart item belonging to user
            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'message' => 'Cart item not found'
                ], 404);
            }

            // Validate new quantity
            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            // Check stock
            $product = $cartItem->product;
            if (!$product) {
                return response()->json([
                    'message' => 'Product not found'
                ], 404);
            }

            $stockField = $cartItem->size === '30ml' ? 'stock_30ml' : 'stock_50ml';
            if ($product->$stockField < $validated['quantity']) {
                return response()->json([
                    'message' => 'Insufficient stock'
                ], 400);
            }

            // Update quantity
            $cartItem->update($validated);
            $cartItem->load(['product' => function($query) {
                $query->with('images');
            }]);

            // Return formatted response
            return response()->json([
                'cart_id' => $cartItem->cart_id,
                'product_id' => $cartItem->product_id,
                'size' => $cartItem->size,
                'quantity' => $cartItem->quantity,
                'price' => $cartItem->price,
                'total' => $cartItem->total,
                'product' => $cartItem->product,
                'created_at' => $cartItem->created_at,
                'updated_at' => $cartItem->updated_at,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Cart update error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to update cart item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove item from cart
     * 
     * @param int $id Cart item ID
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id, Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Find and delete cart item
            $cartItem = Cart::where('user_id', $user->user_id)
                ->find($id);

            if (!$cartItem) {
                return response()->json([
                    'message' => 'Cart item not found'
                ], 404);
            }

            $cartItem->delete();

            return response()->json(['message' => 'Item removed from cart']);
        } catch (\Exception $e) {
            \Log::error('Cart destroy error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to remove item from cart',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
```

---

## Wishlist Controller - Complete Updated Implementation

### File: `app/Http/Controllers/WishlistController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WishlistController extends Controller
{
    /**
     * Get all wishlist items for the authenticated user
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Load wishlist items with product and product images
            $wishlistItems = Wishlist::with(['product' => function($query) {
                $query->with('images');
            }])
                ->where('user_id', $user->user_id)
                ->orderBy('created_at', 'desc')  // Most recent first
                ->get();

            // Return consistent response structure
            return response()->json([
                'success' => true,
                'data' => $wishlistItems,
                'count' => $wishlistItems->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Wishlist index error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch wishlist',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add product to wishlist or return if already exists
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Validate input
            $validated = $request->validate([
                'product_id' => 'required|exists:product,product_id',
            ]);

            // Check if product exists
            $product = \App\Models\Product::find($validated['product_id']);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found'
                ], 404);
            }

            // Check if item already exists in wishlist
            $existingItem = Wishlist::where('user_id', $user->user_id)
                ->where('product_id', $validated['product_id'])
                ->with(['product' => function($query) {
                    $query->with('images');
                }])
                ->first();

            if ($existingItem) {
                // Item already exists, return it
                return response()->json([
                    'success' => true,
                    'message' => 'Product already in wishlist',
                    'data' => $existingItem,
                ], 200);
            }

            // Create new wishlist item
            $wishlistItem = Wishlist::create([
                'user_id' => $user->user_id,
                'product_id' => $validated['product_id'],
            ]);

            // Load relationships
            $wishlistItem->load(['product' => function($query) {
                $query->with('images');
            }]);

            // Return consistent response structure
            return response()->json([
                'success' => true,
                'message' => 'Product added to wishlist',
                'data' => $wishlistItem,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Wishlist store error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to add item to wishlist',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove product from wishlist
     * 
     * @param int $id Wishlist item ID
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id, Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Find and delete wishlist item
            $wishlistItem = Wishlist::where('user_id', $user->user_id)
                ->find($id);

            if (!$wishlistItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wishlist item not found'
                ], 404);
            }

            $wishlistItem->delete();

            // Return consistent response structure
            return response()->json([
                'success' => true,
                'message' => 'Item removed from wishlist'
            ]);
        } catch (\Exception $e) {
            \Log::error('Wishlist destroy error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove item from wishlist',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
```

---

## Cart Model - Updated Implementation

### File: `app/Models/Cart.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $table = 'cart';
    protected $primaryKey = 'cart_id';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'product_id',
        'size',
        'quantity',
        'created_at',
        'updated_at',
    ];

    // Explicitly tell Eloquent to append these attributes in JSON
    protected $appends = ['price', 'total'];

    /**
     * Relationship: Cart item belongs to a user
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Relationship: Cart item belongs to a product
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    /**
     * Get the price based on selected size
     * 
     * Returns the unit price for the selected size (30ml or 50ml)
     * Safety check: Returns 0 if product relationship is not loaded
     */
    public function getPriceAttribute()
    {
        // Safety check: ensure product is loaded before accessing
        if (!$this->product || !$this->relationLoaded('product')) {
            return 0;
        }
        
        // Get price based on selected size
        $price = $this->size === '30ml' 
            ? (float)$this->product->price_30ml 
            : (float)$this->product->price_50ml;
        
        // Ensure we return a valid number, never null or undefined
        return is_numeric($price) ? $price : 0;
    }

    /**
     * Get the total price for this cart item (price × quantity)
     * 
     * Returns: price × quantity
     * Safety check: Returns 0 if product relationship is not loaded
     */
    public function getTotalAttribute()
    {
        // Safety check: ensure product is loaded before accessing
        if (!$this->product || !$this->relationLoaded('product')) {
            return 0;
        }
        
        // Get price based on selected size
        $price = $this->size === '30ml' 
            ? (float)$this->product->price_30ml 
            : (float)$this->product->price_50ml;
        
        // Ensure we return a valid number, never null or undefined
        if (!is_numeric($price) || !is_numeric($this->quantity)) {
            return 0;
        }
        
        return $price * (int)$this->quantity;
    }
}
```

---

## Database Migrations - Updated

### File: `database/migrations/2024_01_01_000005_create_cart_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cart', function (Blueprint $table) {
            // Primary Key - auto-increments sequentially
            $table->id('cart_id');
            
            // Foreign Keys
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            
            // Data
            $table->enum('size', ['30ml', '50ml']);
            $table->integer('quantity');
            
            // Foreign Key Constraints
            $table->foreign('user_id')
                ->references('user_id')
                ->on('user')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('product_id')
                ->on('product');
            
            // Timestamps for audit trail
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart');
    }
};
```

### File: `database/migrations/2024_01_01_000006_create_wishlist_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('wishlist', function (Blueprint $table) {
            // Primary Key - auto-increments sequentially
            $table->id('wishlist_id');
            
            // Foreign Keys
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            
            // Foreign Key Constraints
            $table->foreign('user_id')
                ->references('user_id')
                ->on('user')
                ->onDelete('cascade');
            $table->foreign('product_id')
                ->references('product_id')
                ->on('product');
            
            // Timestamps for audit trail
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wishlist');
    }
};
```

---

## Key Improvements Summary

### Cart Controller
✅ **Defensive Price Calculation**: Returns 0 instead of NaN when relationship isn't loaded
✅ **Explicit Formatting**: Maps items to ensure consistent response structure
✅ **Total Calculation**: Properly sums all item totals in backend
✅ **Sequential IDs**: Uses auto-increment which is now properly configured
✅ **Error Logging**: Full stack traces for debugging

### Wishlist Controller
✅ **Consistent Response**: All methods return `{success, data/message, ...}` structure
✅ **Duplicate Handling**: Returns existing item if already in wishlist
✅ **Proper HTTP Status**: 201 for create, 200 for get, descriptive errors
✅ **Better Logging**: Complete error information for debugging

### Cart Model
✅ **Null Safety**: Checks relationship is loaded before accessing product
✅ **Type Safety**: Explicit casting to float prevents type coercion errors
✅ **Appends Configuration**: Tells Eloquent to include price/total in JSON
✅ **Documentation**: Clear comments explaining the purpose of each method

### Database Migrations
✅ **Complete Schema**: Includes timestamps for audit trail
✅ **Auto-Increment**: Properly configured for sequential IDs
✅ **Cascade Deletes**: User deletion removes related cart and wishlist items
✅ **Comments**: Clear documentation for future maintainers

All changes are production-ready and follow Laravel best practices.
