'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Upload } from 'lucide-react';
import ProfileCropModal from '@/components/ProfileCropModal';
import ScrollAnimated from '@/components/ScrollAnimated';

// Password validation helper
function validatePassword(password: string): string | null {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('upper case letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('lower case letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('symbol');
  }
  
  if (errors.length > 0) {
    if (errors.length === 1) {
      return `Password must be ${errors[0]}.`;
    } else if (errors.length === 2) {
      return `Password must be ${errors[0]} and include a ${errors[1]}.`;
    } else if (errors.length === 3) {
      return `Password must be ${errors[0]} and include ${errors[1]}, and a ${errors[2]}.`;
    } else if (errors.length === 4) {
      return `Password must be ${errors[0]} and include ${errors[1]}, ${errors[2]}, and a ${errors[3]}.`;
    } else {
      return `Password must be ${errors[0]} and include ${errors.slice(1, -1).join(', ')}, and a ${errors[errors.length - 1]}.`;
    }
  }
  
  return null;
}

function getPasswordRules(): string[] {
  return [
    'Minimum 8 characters',
    'Must contain at least one uppercase letter',
    'Must contain at least one lowercase letter',
    'Must contain at least one number',
    'Must contain at least one symbol',
  ];
}

export default function ProfilePage() {
  const { user, updateUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line: '',
    district: '',
    city: '',
    province: '',
    postal_code: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Initialize form data
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone ? user.phone.replace(/^\+62/, '') : '',
      address_line: user.address_line || '',
      district: user.district || '',
      city: user.city || '',
      province: user.province || '',
      postal_code: user.postal_code || '',
    });

    // Set profile picture preview
    if (user.profile_pic) {
      if (user.profile_pic.startsWith('http')) {
        setPreview(user.profile_pic);
      } else if (user.profile_pic.includes('profile_pics')) {
        setPreview(`/profile_pics/${user.profile_pic.split('/').pop()}`);
      } else {
        setPreview(`http://localhost:8000/storage/${user.profile_pic}`);
      }
    }
  }, [user, router, authLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const fileType = file.type.toLowerCase();
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileType) || !['.jpg', '.jpeg', '.png'].includes(extension)) {
        showToast('Only JPG and PNG image files are allowed for profile photos.', 'error');
        e.target.value = ''; // Reset input
        return;
      }
      
      // File size validation removed - allow larger files
      
      const imageUrl = URL.createObjectURL(file);
      setCropImageSrc(imageUrl);
      setShowCropModal(true);
    }
  };

  const handleCropSave = async (croppedImageUrl: string) => {
    setLoading(true);
    try {
      // Convert the cropped image URL to a File object
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      // Validate file type
      if (!blob.type || !['image/jpeg', 'image/jpg', 'image/png'].includes(blob.type.toLowerCase())) {
        showToast('Only JPG and PNG image files are allowed for profile photos.', 'error');
        setLoading(false);
        setShowCropModal(false);
        return;
      }
      
      // Determine file extension based on blob type
      const extension = blob.type.includes('png') ? '.png' : '.jpg';
      const file = new File([blob], `profile-pic${extension}`, { type: blob.type });
      
      // Get username from user data
      const username = user?.name || 'user';
      
      // Get old filename if exists
      let oldFilename: string | null = null;
      if (user?.profile_pic && user.profile_pic.includes('profile_pics')) {
        oldFilename = user.profile_pic.split('/').pop() || null;
      }
      
      // Upload profile picture immediately
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('username', username);
      if (oldFilename) {
        uploadFormData.append('oldFilename', oldFilename);
      }
      
      const uploadResponse = await fetch('/api/upload-profile', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }
      
      const uploadData = await uploadResponse.json();
      const profilePicPath = uploadData.path;
      
      // Update profile picture in backend immediately - include required fields
      const submitData = new FormData();
      submitData.append('profile_pic_path', profilePicPath);
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      if (formData.phone) {
        submitData.append('phone', formData.phone.startsWith('+62') ? formData.phone : `+62${formData.phone}`);
      }
      if (formData.address_line) submitData.append('address_line', formData.address_line);
      if (formData.district) submitData.append('district', formData.district);
      if (formData.city) submitData.append('city', formData.city);
      if (formData.province) submitData.append('province', formData.province);
      if (formData.postal_code) submitData.append('postal_code', formData.postal_code);
      
      // Don't set Content-Type header - axios will set it automatically with boundary
      await api.put('/profile', submitData);
      
      // Refresh user data
      const meResponse = await api.get('/me');
      const updatedUser = meResponse.data;
      updateUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update local state
      setProfilePicture(file);
      setPreview(`/profile_pics/${uploadData.filename}`);
      
      showToast('Profile picture updated successfully', 'success');
    } catch (error: any) {
      console.error('Error saving profile picture:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save profile picture';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setShowCropModal(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Update profile via backend API (profile picture is already saved when cropped)
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      
      // Combine phone number with +62 and validate
      if (formData.phone && formData.phone.trim()) {
        const phoneNumber = formData.phone.replace(/^\+62/, '').replace(/^62/, '').replace(/^0/, '');
        if (phoneNumber.length < 8) {
          showToast('Phone number must have at least 8 digits', 'error');
          setLoading(false);
          return;
        }
        submitData.append('phone', `+62${phoneNumber}`);
      } else {
        submitData.append('phone', '');
      }
      
      submitData.append('address_line', formData.address_line || '');
      submitData.append('district', formData.district || '');
      submitData.append('city', formData.city || '');
      submitData.append('province', formData.province || '');
      submitData.append('postal_code', formData.postal_code || '');
      
      // Don't send profile_pic_path here since it's already saved when cropped

      const response = await api.put('/profile', submitData);

      // Refresh user data from backend to ensure consistency
      const meResponse = await api.get('/me');
      const updatedUser = meResponse.data;
      updateUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update form data with the refreshed user data
      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone ? updatedUser.phone.replace(/^\+62/, '') : '',
        address_line: updatedUser.address_line || '',
        district: updatedUser.district || '',
        city: updatedUser.city || '',
        province: updatedUser.province || '',
        postal_code: updatedUser.postal_code || '',
      });
      
      // Update preview if profile pic changed
      if (updatedUser.profile_pic) {
        if (updatedUser.profile_pic.startsWith('http')) {
          setPreview(updatedUser.profile_pic);
        } else if (updatedUser.profile_pic.includes('profile_pics')) {
          setPreview(`/profile_pics/${updatedUser.profile_pic.split('/').pop()}`);
        } else {
          setPreview(`http://localhost:8000/storage/${updatedUser.profile_pic}`);
        }
      }
      
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
      setProfilePicture(null);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate password
    const passwordError = validatePassword(passwordData.password);
    if (passwordError) {
      showToast(passwordError, 'error');
      setLoading(false);
      return;
    }

    if (passwordData.password !== passwordData.password_confirmation) {
      showToast('Passwords do not match', 'error');
      setLoading(false);
      return;
    }

    try {
      await api.post('/profile/change-password', {
        current_password: passwordData.current_password,
        password: passwordData.password,
        password_confirmation: passwordData.password_confirmation,
      });
      showToast('Password changed successfully', 'success');
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <ScrollAnimated direction="fade" delay={0.1}>
          <div className="mb-8">
            <h1 className="text-4xl font-header font-bold text-gray-900 mb-2">My Account</h1>
            <div className="h-1 w-20 bg-black"></div>
          </div>
        </ScrollAnimated>

        <ScrollAnimated direction="up" delay={0.2}>
          <div className="flex flex-col md:flex-row gap-8 mb-8 items-stretch">
          {/* Left Column - Profile Card */}
          <div className="bg-white rounded-xl shadow-md p-6 w-full md:w-auto md:min-w-[320px] flex-shrink-0">
            <div className="flex flex-col items-center">
              {/* Profile Picture */}
              <div className="relative mb-3">
                {preview ? (
                  <img
                    src={preview}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initialDiv = parent.querySelector('.profile-initial');
                        if (initialDiv) {
                          (initialDiv as HTMLElement).style.display = 'flex';
                        }
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`profile-initial w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-3xl font-bold ${preview ? 'hidden' : 'flex'}`}
                >
                  {userInitial}
                </div>
              </div>

              {/* User Name & Email */}
              <h2 className="text-xl font-header font-bold text-gray-900 mb-1">{user.name}</h2>
              <p className="text-sm text-gray-600 mb-4 font-body">{user.email}</p>

              {/* Change Photo Button */}
              <label className="inline-flex items-center gap-2 px-5 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors cursor-pointer font-body text-sm">
                <Upload className="w-4 h-4" />
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Right Column - Personal Information */}
          <div className="bg-white rounded-xl shadow-md p-6 flex-1">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-header font-bold text-gray-900">Personal Information</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors font-body text-sm"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data
                      setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        phone: user.phone ? user.phone.replace(/^\+62/, '') : '',
                        address_line: user.address_line || '',
                        district: user.district || '',
                        city: user.city || '',
                        province: user.province || '',
                        postal_code: user.postal_code || '',
                      });
                      setProfilePicture(null);
                      if (user.profile_pic) {
                        if (user.profile_pic.startsWith('http')) {
                          setPreview(user.profile_pic);
                        } else if (user.profile_pic.includes('profile_pics')) {
                          setPreview(`/profile_pics/${user.profile_pic.split('/').pop()}`);
                        } else {
                          setPreview(`http://localhost:8000/storage/${user.profile_pic}`);
                        }
                      }
                    }}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors font-body text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 font-body text-sm"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Alexandra Sterling"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="alex.sterling@email.com"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Phone Number - Split into two inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value="(+62)"
                      disabled
                      className="w-28 pl-10 pr-3 py-3 rounded-xl border-2 border-gray-300 bg-gray-100 text-gray-600 font-body"
                    />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="81234567890"
                      minLength={8}
                      pattern="[0-9]{8,}"
                      className={`w-full px-4 py-3 rounded-xl border-2 font-body ${
                        isEditing
                          ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                          : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Address Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Address Line
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="address_line"
                    value={formData.address_line}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Jl. Golf Barat III No.14"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  District
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Arcamanik"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Bandung"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Province
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="West Java"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Postal Code
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="150600"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-body ${
                      isEditing
                        ? 'bg-white border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-header font-bold text-gray-900">Change Password</h2>
          </div>
          
          {/* Password Rules Helper Text */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2 font-body">Password requirements:</p>
            <ul className="text-sm text-gray-600 space-y-1 font-body">
              {getPasswordRules().map((rule, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-black focus:border-black font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-black focus:border-black font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-body">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-black focus:border-black font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Update Password Button */}
            <div className="w-full md:w-1/3">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
        </ScrollAnimated>
      </div>
      <Footer />

      {/* Profile Crop Modal */}
      <ProfileCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={cropImageSrc}
        onSave={handleCropSave}
      />
    </main>
  );
}
