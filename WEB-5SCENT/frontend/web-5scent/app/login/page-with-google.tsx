'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useToast } from '@/contexts/ToastContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/login`,
        { email, password }
      );

      const { token, user } = response.data;

      // Store authentication data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      showToast('Login successful', 'success');
      router.push('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      showToast(message, 'error');
      setErrors({
        email: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Logo/Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">5SCENT</h1>
            <p className="text-gray-600">Login to your account</p>
          </div>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <GoogleSignInButton mode="signin" />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="/forgot-password" className="text-sm text-black hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 text-sm mt-8">
            Don't have an account?{' '}
            <a href="/register" className="text-black font-semibold hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden md:flex w-1/2 bg-black items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-4xl font-bold mb-4">5SCENT</h2>
          <p className="text-xl text-gray-300">Premium Perfume Store</p>
          <p className="text-gray-400 mt-4">Discover your signature scent</p>
        </div>
      </div>
    </main>
  );
}
