'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { Eye, EyeOff, Mail, Lock, User, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { validatePassword } from '@/lib/passwordValidation';

interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_50ml: number;
}

interface Product {
  product_id: number;
  name: string;
  images: ProductImage[];
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Fetch products with 50ml images
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        const productsData = response.data.data || response.data;
        setProducts(Array.isArray(productsData) ? productsData : []);
        
        // Extract 50ml images
        const images50ml: string[] = [];
        productsData.forEach((product: Product) => {
          if (product.images && Array.isArray(product.images)) {
            product.images.forEach((img: ProductImage) => {
              if (img.is_50ml === 1 && img.image_url) {
                let imageUrl = img.image_url;
                
                // Handle different image URL formats
                if (imageUrl.includes('http://') || imageUrl.includes('https://')) {
                  const imageName = imageUrl.split('/').pop();
                  if (imageName && imageName.includes('50ml')) {
                    imageUrl = `/products/${imageName}`;
                  } else {
                    return;
                  }
                } else {
                  if (!imageUrl.startsWith('/')) {
                    imageUrl = '/' + imageUrl;
                  }
                  if (!imageUrl.startsWith('/products/')) {
                    const imageName = imageUrl.split('/').pop();
                    if (imageName && imageName.includes('50ml')) {
                      imageUrl = `/products/${imageName}`;
                    } else {
                      return;
                    }
                  }
                }
                
                if (imageUrl.includes('50ml') && !images50ml.includes(imageUrl)) {
                  images50ml.push(imageUrl);
                }
              }
            });
          }
        });
        
        // Ensure Night Bloom is first, then use other images
        const nightBloomIndex = images50ml.findIndex(img => img.toLowerCase().includes('nightbloom'));
        if (nightBloomIndex > 0) {
          const nightBloom = images50ml.splice(nightBloomIndex, 1)[0];
          images50ml.unshift(nightBloom);
        }
        
        // If no images from API, use local files with Night Bloom first
        if (images50ml.length === 0) {
          const localImages = [
            '/products/nightbloom50ml.png',
            '/products/CitrusFresh50ml.png',
            '/products/OceanBreeze50ml.png',
            '/products/RoyalOud50ml.png',
            '/products/VanillaSky50ml.png',
          ];
          setCarouselImages(localImages);
        } else {
          setCarouselImages(images50ml);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to local images with Night Bloom first
        const localImages = [
          '/products/nightbloom50ml.png',
          '/products/CitrusFresh50ml.png',
          '/products/OceanBreeze50ml.png',
          '/products/RoyalOud50ml.png',
          '/products/VanillaSky50ml.png',
        ];
        setCarouselImages(localImages);
      }
    };

    fetchProducts();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      showToast(passwordError, 'error');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      showToast('Passwords do not match', 'error');
      return;
    }

    // Format phone number with +62 prefix if provided
    let formattedPhone = formData.phone.trim();
    if (formattedPhone) {
      // Remove any existing +62 prefix and leading zeros
      formattedPhone = formattedPhone.replace(/^\+62/, '').replace(/^62/, '').replace(/^0/, '');
      // Add +62 prefix
      formattedPhone = `+62${formattedPhone}`;
    }

    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.password_confirmation, formattedPhone || undefined);
      showToast('Account created successfully', 'success');
      router.push('/');
    } catch (error: any) {
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        showToast(errorMessage || 'Registration failed', 'error');
      } else {
        showToast(error.response?.data?.message || 'Registration failed', 'error');
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
                className="text-white text-sm font-bold font-body"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="text-white text-sm font-medium hover:font-semibold transition-all font-body"
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

      {/* Right Side - Sign Up Form */}
      <div className="relative w-1/2 bg-white flex items-center justify-center p-12 max-md:w-full max-md:h-1/2 max-md:p-8">
        <div className="w-full max-w-md">
          {/* Brand and Title - Centered */}
          <div className="mb-10 text-center max-md:mb-8">
            <h1 className="text-base uppercase font-bold text-black mb-4 font-header tracking-wider">5SCENT</h1>
            <h2 className="text-4xl font-bold text-black mb-2 font-header max-md:text-3xl">Create Account</h2>
            <p className="text-gray-500 text-base font-body">Sign up to get started with 5SCENT</p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-body">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-body">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 font-body">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country Code Selector */}
                <div className="flex items-center gap-2 px-4 py-3.5 bg-[#F5F5F5] rounded-xl">
                  <Phone className="text-gray-400 w-5 h-5" />
                  <span className="text-gray-600 font-body text-sm">(+62)</span>
                </div>
                {/* Phone Number Input */}
                <div className="relative flex-1">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="8123456..."
                    className="w-full pl-4 pr-4 py-3.5 bg-[#F5F5F5] border-0 rounded-xl focus:ring-2 focus:ring-black focus:bg-white transition-all font-body text-sm placeholder:text-gray-400"
                  />
                </div>
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
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
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
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

            {/* Sign Up Button - Pill Shaped */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body text-base mt-6"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          {/* Sign In Link - Centered */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-body">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-black hover:underline font-body">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}



