'use client';

import { Fragment, useState } from 'react';
import { Dialog, Tab } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import MyAccountTab from './profile/MyAccountTab';
import MyOrdersTab from './profile/MyOrdersTab';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
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

  if (!user) return null;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-2xl font-header font-bold">My Profile</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex border-b">
              <Tab as={Fragment}>
                {({ selected }) => (
                  <button
                    className={`px-6 py-3 font-medium ${
                      selected
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    My Account
                  </button>
                )}
              </Tab>
              <Tab as={Fragment}>
                {({ selected }) => (
                  <button
                    className={`px-6 py-3 font-medium ${
                      selected
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    My Orders
                  </button>
                )}
              </Tab>
            </Tab.List>

            <Tab.Panels className="flex-1 overflow-y-auto">
              <Tab.Panel className="p-6">
                <MyAccountTab user={user} onUpdate={updateUser} onClose={onClose} />
              </Tab.Panel>
              <Tab.Panel className="p-6">
                <MyOrdersTab />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>

          <div className="border-t p-6">
            <button
              onClick={handleLogoutClick}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </Dialog.Panel>
      </div>

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
    </Dialog>
  );
}



