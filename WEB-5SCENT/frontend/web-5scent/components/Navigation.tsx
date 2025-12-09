'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { LuShoppingCart } from 'react-icons/lu';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import ProfilePopup from './ProfilePopup';
import api from '@/lib/api';

export default function Navigation() {
  const { user } = useAuth();
  const { items } = useCart();
  const [showProfile, setShowProfile] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (user) {
      fetchWishlistCount();
    } else {
      setWishlistCount(0);
    }
  }, [user]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (user) {
        fetchWishlistCount();
      }
    };

    const handleCartUpdate = () => {
      // Cart count is automatically updated via CartContext
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [user]);

  const fetchWishlistCount = async () => {
    try {
      const response = await api.get('/wishlist');
      const wishlistData = response.data.data || response.data;
      const items = Array.isArray(wishlistData) ? wishlistData : [];
      setWishlistCount(items.length);
    } catch (error) {
      // Wishlist fetch failed, set to 0
      setWishlistCount(0);
    }
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo - Letter spacing 2.8px, using Poppins font */}
            <Link 
              href="/" 
              className="text-3xl font-header font-bold text-gray-900 pl-2"
              style={{ letterSpacing: '2.8px' }}
            >
              5SCENT
            </Link>

            {/* Navigation Links - Consistent spacing */}
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-base"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="text-gray-700 hover:text-primary-600 transition-colors font-medium text-base"
              >
                Products
              </Link>
            </div>

            {/* Right Side Icons & Buttons - More padding from right edge */}
            <div className="flex items-center gap-4 pr-2">
              {user ? (
                <>
                  {/* Wishlist Icon - Only show when logged in */}
                  <Link
                    href="/wishlist"
                    className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
                    id="wishlist-icon"
                  >
                    <HeartIcon className="w-6 h-6" />
                    {wishlistCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart Icon - Only show when logged in */}
                  <Link
                    href="/cart"
                    className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
                    id="cart-icon"
                  >
                    <LuShoppingCart className="w-6 h-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute top-0 right-0 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>

                  {/* User Avatar - Only show when logged in */}
                  <button
                    onClick={() => setShowProfile(true)}
                    className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                    aria-label="Profile"
                  >
                    {user.profile_pic ? (
                      <img
                        src={
                          user.profile_pic.startsWith('http')
                            ? user.profile_pic
                            : user.profile_pic.includes('/')
                            ? `/profile_pics/${user.profile_pic.split('/').pop()}`
                            : `/profile_pics/${user.profile_pic}`
                        }
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const initialDiv = parent.querySelector('.nav-initial');
                            if (initialDiv) {
                              (initialDiv as HTMLElement).style.display = 'flex';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`nav-initial w-full h-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-sm ${user.profile_pic ? 'hidden' : 'flex'}`}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* Sign Up Button - Plain text, no border/padding like image */}
                  <Link
                    href="/register"
                    className="px-0 py-0 text-gray-900 hover:text-gray-700 transition-colors font-medium text-base"
                  >
                    Sign Up
                  </Link>
                  {/* Login Button - Wider, pill-shaped with spacing */}
                  <Link
                    href="/login"
                    className="px-8 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium text-base ml-6"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {showProfile && user && <ProfilePopup onClose={() => setShowProfile(false)} />}
    </>
  );
}
