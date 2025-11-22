'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProductGrid from '@/components/ProductGrid';
import Footer from '@/components/Footer';

function ProductsContent() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const bestSeller = searchParams.get('best_seller') === 'true';

  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-header font-bold text-gray-900 mb-8">
          {search ? `Search Results for "${search}"` :
           category ? `${category} Fragrances` :
           bestSeller ? 'Best Sellers' :
           'All Products'}
        </h1>
        <ProductGrid search={search || undefined} category={category || undefined} bestSeller={bestSeller} />
      </div>
      <Footer />
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
