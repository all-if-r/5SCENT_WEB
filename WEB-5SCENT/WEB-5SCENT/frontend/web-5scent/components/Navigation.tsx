'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingCartIcon, UserIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import ProfileModal from './ProfileModal';

export default function Navigation() {
  const { user } = useAuth();
  const { items } = useCart();
  const [showProfile, setShowProfile] = useState(false);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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
                    className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <HeartIcon className="w-6 h-6" />
                  </Link>

                  {/* Cart Icon - Only show when logged in */}
                  <Link
                    href="/cart"
                    className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <ShoppingCartIcon className="w-6 h-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute top-0 right-0 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>

                  {/* User Avatar - Only show when logged in */}
                  <button
                    onClick={() => setShowProfile(true)}
                    className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <UserIcon className="w-6 h-6" />
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
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
