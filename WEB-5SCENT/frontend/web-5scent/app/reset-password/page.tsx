'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Lock, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tokenParam = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const emailParam = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Get token and email from URL query params
  // FIXED: Removed router and showToast from dependency array to prevent infinite loop
  // These objects change on every render, causing the effect to run repeatedly
  useEffect(() => {
    if (!tokenParam || !emailParam) {
      // Just show error, do NOT auto-redirect to prevent loops
      showToast('Invalid reset link. Please request a new one.', 'error');
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);
    setIsValid(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam, emailParam]); // Only depend on stable memo values

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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <p className="text-gray-600">Preparing reset form...</p>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
