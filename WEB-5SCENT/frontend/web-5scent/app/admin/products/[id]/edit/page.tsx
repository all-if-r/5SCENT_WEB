'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_50ml: number;
}

interface Product {
  product_id: number;
  name: string;
  description: string;
  category: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  top_notes: string;
  middle_notes: string;
  base_notes: string;
  images: ProductImage[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    top_notes: '',
    middle_notes: '',
    base_notes: '',
    category: 'Day',
    price_30ml: '',
    price_50ml: '',
    stock_30ml: '',
    stock_50ml: '',
  });

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null]);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${productId}`);
      const productData = response.data;
      
      setProduct(productData);
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        top_notes: productData.top_notes || '',
        middle_notes: productData.middle_notes || '',
        base_notes: productData.base_notes || '',
        category: productData.category || 'Day',
        price_30ml: productData.price_30ml?.toString() || '',
        price_50ml: productData.price_50ml?.toString() || '',
        stock_30ml: productData.stock_30ml?.toString() || '',
        stock_50ml: productData.stock_50ml?.toString() || '',
      });

      if (productData.images) {
        setExistingImages(productData.images);
        const previews = [null, null, null, null];
        productData.images.forEach((img: ProductImage) => {
          if (img.is_50ml === 1) {
            previews[0] = img.image_url;
          } else if (!previews[1]) {
            previews[1] = img.image_url;
          } else if (!previews[2]) {
            previews[2] = img.image_url;
          } else if (!previews[3]) {
            previews[3] = img.image_url;
          }
        });
        setImagePreviews(previews);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newImages = [...uploadedImages];
      newImages[index] = file;
      setUploadedImages(newImages);

      const reader = new FileReader();
      reader.onload = (event) => {
        const previews = [...imagePreviews];
        previews[index] = event.target?.result as string;
        setImagePreviews(previews);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);

      const updateData = new FormData();
      updateData.append('name', formData.name);
      updateData.append('description', formData.description);
      updateData.append('top_notes', formData.top_notes);
      updateData.append('middle_notes', formData.middle_notes);
      updateData.append('base_notes', formData.base_notes);
      updateData.append('category', formData.category);
      updateData.append('price_30ml', formData.price_30ml);
      updateData.append('price_50ml', formData.price_50ml);
      updateData.append('stock_30ml', formData.stock_30ml);
      updateData.append('stock_50ml', formData.stock_50ml);
      updateData.append('_method', 'PUT');

      // Create slug from product name
      const perfumeSlug = formData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Handle image uploads with proper naming and slot identification
      const imageSlotMap: { [key: number]: string } = {
        0: `${perfumeSlug}50ml`,   // 50ml primary
        1: `${perfumeSlug}30ml`,   // 30ml secondary
        2: `additional${perfumeSlug}1`, // Additional 1
        3: `additional${perfumeSlug}2`, // Additional 2
      };

      uploadedImages.forEach((image, index) => {
        if (image) {
          updateData.append('images', image);
          updateData.append(`image_slot[${index}]`, index.toString());
          updateData.append(`image_name[${index}]`, imageSlotMap[index]);
        }
      });

      await api.post(`/admin/products/${productId}`, updateData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Product updated successfully', 'success');
      router.push('/admin/products');
    } catch (err) {
      console.error('Error updating product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading product...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Product</h2>
              <p className="text-sm text-gray-600 mt-1">Update product information</p>
            </div>
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <form id="edit-product-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* General Information Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the fragrance..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Fragrance Profile Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Fragrance Profile</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Top Notes
                  </label>
                  <input
                    type="text"
                    name="top_notes"
                    value={formData.top_notes}
                    onChange={handleInputChange}
                    placeholder="e.g., Bergamot, Black Pepper"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Middle Notes
                  </label>
                  <input
                    type="text"
                    name="middle_notes"
                    value={formData.middle_notes}
                    onChange={handleInputChange}
                    placeholder="e.g., Rose, Jasmine, Violet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Base Notes
                  </label>
                  <input
                    type="text"
                    name="base_notes"
                    value={formData.base_notes}
                    onChange={handleInputChange}
                    placeholder="e.g., Oud, Amber, Vanilla"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Classification & Inventory Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Classification & Inventory</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  >
                    <option value="Day">Day Perfume</option>
                    <option value="Night">Night Perfume</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Price 30ml (Rp)
                    </label>
                    <input
                      type="number"
                      name="price_30ml"
                      value={formData.price_30ml}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Price 50ml (Rp)
                    </label>
                    <input
                      type="number"
                      name="price_50ml"
                      value={formData.price_50ml}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Stock Quantity 30 ml
                    </label>
                    <input
                      type="number"
                      name="stock_30ml"
                      value={formData.stock_30ml}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Stock Quantity 50 ml
                    </label>
                    <input
                      type="number"
                      name="stock_50ml"
                      value={formData.stock_50ml}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Media Management Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Images (Max 4)</h3>

              <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((index) => {
                  const slotLabel = 
                    index === 0 ? '50ml - Image 1 (Primary)' :
                    index === 1 ? '30ml - Image 2 (Secondary)' :
                    index === 2 ? 'Additional - Image 3' :
                    'Additional - Image 4';

                  return (
                    <div key={index}>
                      <p className="text-xs font-medium text-gray-700 mb-2">{slotLabel}</p>
                      <label className="flex flex-col items-center justify-center w-full aspect-square border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
                        {imagePreviews[index] ? (
                          <div className="relative w-full h-full">
                            <img
                              src={imagePreviews[index] as string}
                              alt={`Product ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-start justify-end p-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const previews = [...imagePreviews];
                                  previews[index] = null;
                                  setImagePreviews(previews);
                                  const newImages = [...uploadedImages];
                                  newImages[index] = null as any;
                                  setUploadedImages(newImages.filter(Boolean));
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete image"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            <span className="text-xs text-gray-600">Upload</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => handleImageUpload(e, index)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Upload images: 50ml primary, 30ml secondary, and 2 additional images (PNG, JPG - max. 10MB each).
              </p>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="flex-1 px-6 py-2 border border-gray-300 text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-product-form"
              disabled={submitting}
              className="flex-1 px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
