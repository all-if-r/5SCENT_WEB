'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import DualTextType from '@/components/DualTextType';
import { fetchCarouselImages } from '@/lib/productData';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Fetch products with 50ml images
  useEffect(() => {
    const loadCarouselImages = async () => {
      const images = await fetchCarouselImages();
      setCarouselImages(images);
    };

    loadCarouselImages();
  }, []);

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    if (carouselImages.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
      }, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [carouselImages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      showToast('Logged in successfully', 'success');
      router.push('/');
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 422) {
        // Validation error (invalid credentials)
        showToast('Invalid email or password', 'error');
      } else if (error.response?.status === 401) {
        // Unauthorized
        showToast('Invalid email or password', 'error');
      } else if (error.response?.status === 404) {
        // User not found
        showToast('Invalid email or password', 'error');
      } else if (error.response?.data?.message) {
        // Use backend message if available
        showToast(error.response.data.message, 'error');
      } else if (error.message) {
        // Use error message
        showToast(error.message, 'error');
      } else {
        // Fallback message
        showToast('Login failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    // Reset auto-advance timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 3000);
  };

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + carouselImages.length) % carouselImages.length);
  };

  return (
    <main className="min-h-screen flex relative overflow-hidden">
      {/* Left Side - Carousel */}
      <div className="relative w-1/2 overflow-hidden max-md:w-full max-md:h-1/2">
        {/* Carousel Container - Normal rectangular box */}
        <div 
          className="relative w-full h-full overflow-hidden" 
        >
          {/* Carousel Images */}
          {carouselImages.length > 0 && (
            <div className="relative w-full h-full">
              {carouselImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Navigation Buttons - Right Side Pill */}
          <div className="absolute top-8 right-8 z-20 max-md:top-4 max-md:right-4">
            <div className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-md rounded-full flex gap-5 items-center">
              <Link
                href="/"
                className="text-white text-sm font-medium hover:font-semibold transition-all font-body"
              >
                Home
              </Link>
              <Link
                href="/register"
                className="text-white text-sm font-medium hover:font-semibold transition-all font-body"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="text-white text-sm font-bold font-body"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Carousel Controls - Bottom Center */}
          {carouselImages.length > 0 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3">
              {/* Previous Button */}
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all flex items-center justify-center"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Dots Navigation */}
              <div className="flex gap-2 items-center">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`transition-all ${
                      index === currentSlide
                        ? 'bg-white h-2 w-8 rounded-full'
                        : 'bg-white/50 w-2 h-2 rounded-full hover:bg-white/75'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all flex items-center justify-center"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="relative w-1/2 bg-white flex items-center justify-center p-12 max-md:w-full max-md:h-1/2 max-md:p-8">
        <div className="w-full max-w-md">
          {/* Brand and Greeting - Centered */}
          {/* NOTE: Height is stabilized by DualTextType component which measures full text on mount
              and sets a fixed height. This prevents layout shift of the form below during animation. */}
          <div className="mb-10 text-center max-md:mb-8">
            <h1 className="text-base uppercase font-bold text-black mb-4 font-header tracking-wider">5SCENT</h1>
            <DualTextType
              headerText="Hi Scent Lover"
              bodyText="Welcome to 5SCENT"
              headerClassName="text-4xl font-bold text-black mb-2 font-header max-md:text-3xl"
              bodyClassName="text-base font-body"
              typingSpeed={80}
              deletingSpeed={60}
              pauseBetweenPhases={500}
              bodyStyle={{ fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif', color: '#4A5565' }}
            />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-body">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-body">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
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
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-gray-500 hover:text-black transition-colors font-body"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Login Button - Pill Shaped */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body text-base mt-6"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Sign Up Link - Centered */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-body">
              Don't have an account?{' '}
              <Link href="/register" className="font-bold text-black hover:underline font-body">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
