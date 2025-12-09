'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/contexts/ToastContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, loginAdmin } = useAdmin();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (admin) {
      router.push('/admin/dashboard');
    }
  }, [admin, router]);

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
      await loginAdmin(email, password);
      showToast('Admin login successful', 'success');
      router.push('/admin/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid email or password';
      showToast(message, 'error');
      setErrors({ email: message });
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
            <p className="text-gray-600">Admin Dashboard</p>
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
                placeholder="Enter admin email"
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
                  type={showPassword ? "text" : "password"}
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login to Admin'}
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-gray-600 text-sm mt-8">
            Admin credentials required
          </p>
        </div>
      </div>

      {/* Right side - Branding (Hidden on mobile) */}
      <div className="hidden md:flex w-1/2 bg-black items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-4xl font-bold mb-4">5SCENT</h2>
          <p className="text-xl text-gray-300">Admin Dashboard</p>
          <p className="text-gray-400 mt-4">Manage your store performance</p>
        </div>
      </div>
    </main>
  );
}



