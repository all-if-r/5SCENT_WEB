'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!adminLoading && !admin) {
      router.push('/admin/login');
    }
  }, [admin, adminLoading, router]);

  // Initialize form with admin data
  useEffect(() => {
    if (admin) {
      setFullName(admin.name || '');
      setEmail(admin.email || '');
    }
  }, [admin]);

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (admin) {
      setFullName(admin.name || '');
      setEmail(admin.email || '');
    }
    setIsEditingProfile(false);
  };

  const handleSaveChanges = async () => {
    if (!fullName.trim() || !email.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (!email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/admin/profile', { 
        name: fullName, 
        email: email 
      });
      // Update localStorage with the new admin data
      localStorage.setItem('admin', JSON.stringify({
        ...admin,
        name: fullName,
        email: email,
      }));
      showToast('Profile updated successfully', 'success');
      setIsEditingProfile(false);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
      // Reset form on error
      if (admin) {
        setFullName(admin.name || '');
        setEmail(admin.email || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/admin/change-password', { 
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      showToast('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Section - Left */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-black">Profile Information</h3>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
                    >
                      Edit Profile
                    </button>
                  )}
                  {isEditingProfile && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Profile Form */}
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg transition-all ${
                        isEditingProfile
                          ? 'bg-white focus:outline-none focus:ring-2 focus:ring-black'
                          : 'bg-gray-50 text-gray-700 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg transition-all ${
                        isEditingProfile
                          ? 'bg-white focus:outline-none focus:ring-2 focus:ring-black'
                          : 'bg-gray-50 text-gray-700 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {/* Save Changes Button */}
                {isEditingProfile && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSaveChanges}
                      disabled={isLoading}
                      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              {/* Password Section - Right */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-black mb-6">Change Password</h3>

                {/* Password Form */}
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showCurrentPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showNewPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Update Password Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}