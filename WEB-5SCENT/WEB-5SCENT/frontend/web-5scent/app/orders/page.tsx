'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProfileModal from '@/components/ProfileModal';
import { useAuth } from '@/contexts/AuthContext';

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-header font-bold text-gray-900 mb-8">My Orders</h1>
        <ProfileModal onClose={() => router.push('/')} />
      </div>
      <Footer />
    </main>
  );
}



