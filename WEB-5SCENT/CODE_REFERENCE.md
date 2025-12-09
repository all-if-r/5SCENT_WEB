# Quick Code Reference - Password Reset Fix

## 1. Laravel Backend: Reset Password Controller

**File**: `app/Http/Controllers/Auth/ResetPasswordController.php`

**Key Change**: Use Carbon for timezone-aware token expiry check

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;  // Add this import

class ResetPasswordController extends Controller
{
    public function reset(Request $request)
    {
        // Validate the input
        $validated = $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ], [
            'token.required' => 'Reset token is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Password is required.',
            'password.confirmed' => 'Passwords do not match.',
            'password.min' => 'Password must be at least 8 characters.',
        ]);

        $email = $validated['email'];
        $token = $validated['token'];

        Log::info('Password reset attempt for email: ' . $email . ', token: ' . substr($token, 0, 10) . '...');

        try {
            // Check if the reset token exists
            $resetRecord = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->where('token', $token)
                ->first();

            if (!$resetRecord) {
                Log::warning('Password reset token not found for email: ' . $email);
                return response()->json([
                    'message' => 'Password reset link has expired. Please request a new one.',
                ], 410);  // HTTP 410 Gone
            }

            // Check if token has expired (3 minutes)
            // Use Carbon for proper timezone handling
            $tokenCreatedAtCarbon = Carbon::parse($resetRecord->created_at);
            $expiresAt = $tokenCreatedAtCarbon->addMinutes(3);
            $now = Carbon::now();

            Log::info('Token created at: ' . $tokenCreatedAtCarbon . ', Expires at: ' . $expiresAt . ', Current time: ' . $now);

            if ($now->greaterThan($expiresAt)) {
                Log::warning('Password reset token expired for email: ' . $email);
                DB::table('password_reset_tokens')->where('email', $email)->delete();
                return response()->json([
                    'message' => 'Password reset link has expired. Please request a new one.',
                ], 410);  // HTTP 410 Gone
            }

            // Find the user
            $user = User::where('email', $email)->first();

            if (!$user) {
                Log::warning('User not found for email: ' . $email);
                return response()->json([
                    'message' => 'User not found.',
                ], 400);
            }

            // Update the password
            $user->password = Hash::make($validated['password']);
            $user->remember_token = Str::random(60);
            $user->save();

            // Delete the reset token
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            Log::info('Password reset successfully for email: ' . $email);

            return response()->json([
                'message' => 'Password has been reset successfully.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error resetting password: ' . $e->getMessage() . ', Trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'An error occurred while resetting your password.',
            ], 500);
        }
    }
}
```

---

## 2. Next.js Frontend: Reset Password Page

**File**: `app/reset-password/page.tsx`

**Key Changes**:
1. Fix dependency array to prevent infinite redirects
2. Handle 410 Gone status for expired tokens
3. Use setTimeout to defer redirects

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Lock, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Get token and email from URL query params
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!tokenParam || !emailParam) {
      showToast('Invalid reset link. Please request a new one.', 'error');
      // Use setTimeout to avoid redirect during render
      const timer = setTimeout(() => {
        router.push('/forgot-password');
      }, 1000);
      return () => clearTimeout(timer);
    }

    setToken(tokenParam);
    setEmail(emailParam);
    setIsValid(true);
  }, [searchParams]);  // FIXED: Only depend on searchParams

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!password || !passwordConfirmation) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (password !== passwordConfirmation) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      showToast('Password reset successfully! Redirecting to login...', 'success');
      
      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // FIXED: Handle both 410 Gone and 400 Bad Request
      if (error.response?.status === 410 || error.response?.status === 400) {
        const message = error.response?.data?.message || 'Password reset link has expired. Please request a new one.';
        showToast(message, 'error');
        // Redirect to forgot password after 2 seconds
        setTimeout(() => {
          router.push('/forgot-password');
        }, 2000);
      } else if (error.response?.status === 422) {
        const messages = error.response?.data?.errors 
          ? Object.values(error.response.data.errors).flat().join(', ')
          : 'Validation failed';
        showToast(messages, 'error');
      } else if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else {
        showToast('Failed to reset password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isValid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black mb-2 font-header">5SCENT</h1>
          <h2 className="text-2xl font-bold text-black mb-2 font-header">Reset Password</h2>
          <p className="text-sm text-gray-600 font-body">Enter your new password below</p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          {/* Email Display (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-body">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3.5 bg-gray-100 border-0 rounded-xl text-gray-600 font-body text-sm cursor-not-allowed"
            />
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-body">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className="w-full pl-12 pr-12 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-body">Minimum 8 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-black mb-2 font-body">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full pl-12 pr-12 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Reset Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body text-base mt-6"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 font-body">
            Remember your password?{' '}
            <Link href="/login" className="font-bold text-black hover:underline font-body">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
```

---

## 3. Next.js Frontend: Auth Context

**File**: `contexts/AuthContext.tsx`

**Key Change**: Skip token verification on auth pages to prevent freezing

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  address_line?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  profile_pic?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();  // ADDED: Get current pathname

  useEffect(() => {
    // ADDED: Don't verify token on auth pages to prevent freezing
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isAuthPage = authPages.some(page => pathname?.startsWith(page));

    // Restore auth state from localStorage on mount
    const restoreAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // Set user immediately from localStorage
          setUser(JSON.parse(storedUser));
          
          // FIXED: Only verify token on non-auth pages
          if (!isAuthPage) {
            // Verify token is still valid
            const response = await api.get('/me');
            if (response.data) {
              setUser(response.data);
              localStorage.setItem('user', JSON.stringify(response.data));
            }
          }
        }
      } catch (error) {
        // FIXED: Clear auth only if not on auth page
        if (!isAuthPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, [pathname]);  // FIXED: Depend on pathname instead of empty array

  const login = async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    const { user: userData, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string, phone?: string) => {
    const response = await api.post('/register', { name, email, password, password_confirmation, phone });
    const { user: userData, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      // Continue logout even if API fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Summary of Changes

| File | Changes | Why |
|------|---------|-----|
| `ResetPasswordController.php` | Use Carbon for timezone-aware token expiry + return 410 status | Ensures 3-minute expiry is actually enforced |
| `app/reset-password/page.tsx` | Handle 410 status + fix dependency array + defer redirects | Gracefully handle expired tokens, no infinite loops |
| `contexts/AuthContext.tsx` | Skip API verification on auth pages | Prevents page freeze on login/register |

---

## No Changes Needed

✅ `config/auth.php` - Already has `'expire' => 3`
✅ `resources/views/emails/reset-password.blade.php` - Already says "expires in 3 minutes"
✅ Login page + Register page - Fixed by AuthContext change

---

## Testing Commands

```bash
# Backend
php artisan cache:clear
php artisan serve

# Frontend
cd frontend/web-5scent
npm run dev
```

---

## What to Expect After Fix

1. **Token Expiry Works**: Click reset link after 3+ minutes → see friendly "link expired" message
2. **Login Loads Instantly**: No black screen, page responsive immediately
3. **Register Loads Instantly**: Same as login
4. **Navigation Smooth**: After reset, navigating between pages works normally
5. **Error Handling Clear**: Expired tokens show specific message, not generic error
