'use client';

import { useState, FormEvent } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="bg-transparent py-8 -mt-20 relative z-50 pointer-events-none">
      <div className="container mx-auto px-4 pointer-events-auto">
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
          {/* Search bar - Full width with rounded edges */}
          <div className="relative bg-white rounded-2xl shadow-lg px-6 py-4">
            <input
              type="text"
              placeholder="Search your perfume..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 focus:ring-0 focus:outline-none text-base bg-transparent pl-10"
            />
            <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </form>
      </div>
    </section>
  );
}
