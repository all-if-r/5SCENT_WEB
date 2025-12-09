'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        setLoading(false);
        return;
      }

      // Call the forgot password API
      const response = await api.post('/forgot-password', { email });

      showToast('Password reset link has been sent to your email', 'success');
      setEmail('');
      setLoading(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setLoading(false);

      // Handle specific error responses
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        if (errors?.email) {
          showToast(errors.email[0], 'error');
        } else {
          showToast('Validation failed', 'error');
        }
      } else if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else if (error.message) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to send reset link. Please try again.', 'error');
      }
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black mb-1">5SCENT</h1>
          <h2 className="text-3xl font-bold text-black mb-2">Reset Password</h2>
          <p className="text-gray-500 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

