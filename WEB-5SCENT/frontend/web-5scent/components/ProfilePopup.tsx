'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon, Cog6ToothIcon, CubeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { LogoutIcon } from './LogoutIcon';

interface ProfilePopupProps {
  onClose: () => void;
}

export default function ProfilePopup({ onClose }: ProfilePopupProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutButtonHovered, setIsLogoutButtonHovered] = useState(false);
  const logoutIconRef = useRef<any>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!user) return null;

  // Get profile picture - use same logic as Navigation component for consistency
  const getProfilePicture = () => {
    if (user.profile_pic) {
      // Check if it's a full URL
      if (user.profile_pic.startsWith('http')) {
        return user.profile_pic;
      }
      // If it has a path separator, extract filename
      if (user.profile_pic.includes('/')) {
        return `/profile_pics/${user.profile_pic.split('/').pop()}`;
      }
      // Otherwise use it directly
      return `/profile_pics/${user.profile_pic}`;
    }
    return null;
  };

  const profilePic = getProfilePicture();
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  const handleMyAccount = () => {
    onClose();
    router.push('/profile');
  };

  const handleMyOrders = () => {
    onClose();
    router.push('/orders');
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Failed to logout', 'error');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      onClose();
    }
  };

  return (
    <>
      {/* Dark Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Section - Gradient Header */}
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-6">
            {/* Close Icon */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* User Identity */}
            <div className="flex items-center gap-4 mt-4">
              {/* Profile Picture */}
              <div className="relative">
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                    onError={(e) => {
                      // Fallback to initial if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initialDiv = parent.querySelector('.initial-fallback');
                        if (initialDiv) {
                          (initialDiv as HTMLElement).style.display = 'flex';
                        }
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`initial-fallback w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold ${profilePic ? 'hidden' : 'flex'}`}
                >
                  {userInitial}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg font-header">{user.name}</h3>
                <p className="text-white/80 text-sm mt-1">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Main Menu Section */}
          <div className="py-2">
            {/* My Account */}
            <button
              onClick={handleMyAccount}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <Cog6ToothIcon className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 font-body">My Account</h4>
                <p className="text-sm text-gray-500 font-body">Manage your profile and settings</p>
              </div>
            </button>

            {/* My Orders */}
            <button
              onClick={handleMyOrders}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <CubeIcon className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 font-body">My Orders</h4>
                <p className="text-sm text-gray-500 font-body">View your order history</p>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              onMouseEnter={() => setIsLogoutButtonHovered(true)}
              onMouseLeave={() => setIsLogoutButtonHovered(false)}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-red-50 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <LogoutIcon 
                  ref={logoutIconRef}
                  size={20}
                  isAnimated={isLogoutButtonHovered}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-600 font-body">Logout</h4>
                <p className="text-sm text-red-500 font-body">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="text-2xl font-semibold text-gray-900">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              Are you sure you want to log out of your account? You&apos;ll need to sign in again to access your account.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 rounded-full border border-black text-black font-semibold hover:bg-gray-50 transition-colors"
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 px-4 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoggingOut}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

