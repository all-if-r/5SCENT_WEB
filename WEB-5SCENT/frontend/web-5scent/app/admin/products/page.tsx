'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FaStar } from 'react-icons/fa6';

interface ProductImage {
  image_id: number;
  product_id: number;
  image_url: string;
  is_50ml: number;
  is_additional: number;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  product_id: number;
  name: string;
  category: string;
  description: string;
  average_rating?: number;
  ratings_avg_stars?: number | string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  top_notes: string;
  middle_notes: string;
  base_notes: string;
  review_count?: number;
  ratings_count?: number;
  images: ProductImage[];
}

interface ProductsData {
  products: Product[];
  total: number;
}

interface FormData {
  name: string;
  description: string;
  top_notes: string;
  middle_notes: string;
  base_notes: string;
  category: string;
  price_30ml: string;
  price_50ml: string;
  stock_30ml: string;
  stock_50ml: string;
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
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
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  // Map of slot -> image (slot 1-4)
  const [existingImagesBySlot, setExistingImagesBySlot] = useState<{ [key: number]: ProductImage | null }>({
    1: null,
    2: null,
    3: null,
    4: null,
  });
  // Set of image IDs marked for deletion
  const [imagesToDelete, setImagesToDelete] = useState<Set<number>>(new Set());

  const categories = ['All Categories', 'Day', 'Night'];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/products');
      const data: ProductsData = response.data;
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(
        (product) => product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
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
    setUploadedImages([]);
    setImagePreviews([null, null, null, null]);
    setExistingImagesBySlot({ 1: null, 2: null, 3: null, 4: null });
    setImagesToDelete(new Set());
    setModalError(null);
    setShowAddModal(true);
  };

  const openEditModal = async (product: Product) => {
    try {
      const response = await api.get(`/admin/products/${product.product_id}`);
      const productData = response.data;

      setEditingProduct(productData);
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

      // Build slot-based image map with proper slot detection
      const slotImages: { [key: number]: ProductImage | null } = { 1: null, 2: null, 3: null, 4: null };
      const previews: (string | null)[] = [null, null, null, null];

      const images = productData.images || [];

      images.forEach((img: ProductImage) => {
        let slot: number | null = null;

        if (!img.is_additional) {
          // Main images: use is_50ml flag
          slot = img.is_50ml ? 1 : 2;
        } else {
          // Additional images: extract slot from filename suffix (-1 or -2)
          const filename = img.image_url.split('/').pop() || '';
          if (filename.includes('-1.')) {
            slot = 3; // Has -1 before extension -> slot 3
          } else if (filename.includes('-2.')) {
            slot = 4; // Has -2 before extension -> slot 4
          }
        }

        if (slot) {
          slotImages[slot] = img;
          previews[slot - 1] = img.image_url;
        }
      });

      setExistingImagesBySlot(slotImages);
      setImagePreviews(previews);
      setUploadedImages([]);
      setImagesToDelete(new Set());
      setModalError(null);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading product:', error);
      setModalError('Failed to load product details');
    }
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingProduct(null);
    setExistingImagesBySlot({ 1: null, 2: null, 3: null, 4: null });
    setImagesToDelete(new Set());
    setModalError(null);
  };

  // Get the image for a specific slot, considering both existing and newly uploaded
  const getImageForSlot = (slot: number) => {
    // If a new image was uploaded for this slot, use preview
    if (uploadedImages[slot - 1]) {
      return imagePreviews[slot - 1];
    }
    // Otherwise use existing image if not marked for deletion
    const existingImage = existingImagesBySlot[slot];
    if (existingImage && !imagesToDelete.has(existingImage.image_id)) {
      return imagePreviews[slot - 1];
    }
    return null;
  };

  const handleDeleteExistingImage = (imageId: number, slot: number) => {
    // Mark image for deletion
    const newImagesToDelete = new Set(imagesToDelete);
    newImagesToDelete.add(imageId);
    setImagesToDelete(newImagesToDelete);

    // Clear preview
    const previews = [...imagePreviews];
    previews[slot - 1] = null;
    setImagePreviews(previews);
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
      const slot = index + 1; // Convert to 1-based slot
      const newImages = [...uploadedImages];
      newImages[index] = file;
      setUploadedImages(newImages);

      // If we're replacing a deleted image, remove it from the deletion set
      const existingImage = existingImagesBySlot[slot];
      if (existingImage && imagesToDelete.has(existingImage.image_id)) {
        const newImagesToDelete = new Set(imagesToDelete);
        newImagesToDelete.delete(existingImage.image_id);
        setImagesToDelete(newImagesToDelete);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const previews = [...imagePreviews];
        previews[index] = event.target?.result as string;
        setImagePreviews(previews);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setModalError(null);

      if (!editingProduct) return;

      // Create FormData to handle both product data and images
      const formDataPayload = new FormData();
      formDataPayload.append('name', formData.name);
      formDataPayload.append('description', formData.description);
      formDataPayload.append('top_notes', formData.top_notes || '');
      formDataPayload.append('middle_notes', formData.middle_notes || '');
      formDataPayload.append('base_notes', formData.base_notes || '');
      formDataPayload.append('category', formData.category);
      formDataPayload.append('price_30ml', formData.price_30ml);
      formDataPayload.append('price_50ml', formData.price_50ml);
      formDataPayload.append('stock_30ml', formData.stock_30ml);
      formDataPayload.append('stock_50ml', formData.stock_50ml);
      formDataPayload.append('_method', 'PUT');

      // Add uploaded images to FormData with explicit slot keys
      // Slot mapping: 0->1, 1->2, 2->3, 3->4
      uploadedImages.forEach((image, index) => {
        if (image) {
          const slotKey = `image_slot_${index + 1}`;
          formDataPayload.append(slotKey, image);
          console.log(`Adding image for slot ${index + 1}:`, image.name);
        }
      });

      console.log('Updating product with FormData');

      const updateResponse = await api.post(
        `/admin/products/${editingProduct.product_id}`,
        formDataPayload,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      console.log('Product updated:', updateResponse.data);

      // Then, handle image deletions
      if (imagesToDelete.size > 0) {
        console.log('Deleting images:', Array.from(imagesToDelete));
        for (const imageId of imagesToDelete) {
          try {
            await api.delete(`/admin/products/${editingProduct.product_id}/images/${imageId}`);
            console.log(`Deleted image ${imageId}`);
          } catch (err) {
            console.error(`Failed to delete image ${imageId}:`, err);
          }
        }
      }

      // Refresh the product list
      await fetchProducts();
      showToast(`Product "${formData.name}" updated successfully!`, 'success');
      closeModals();
    } catch (err: any) {
      console.error('Error updating product:', err);
      
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to update product';
      const errors = err.response?.data?.errors;
      
      let displayMessage = errorMessage;
      if (errors) {
        const errorList = Object.entries(errors)
          .map(([field, messages]: any) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        displayMessage = `Validation errors:\n${errorList}`;
      } else if (err.response?.data) {
        displayMessage = `Error: ${JSON.stringify(err.response.data)}`;
      }
      
      setModalError(displayMessage);
      showToast(displayMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setModalError(null);

      // Check if images are provided
      const newImagesToUpload = uploadedImages.filter(Boolean);
      if (newImagesToUpload.length === 0) {
        setModalError('Please upload at least one product image');
        showToast('Please upload at least one product image', 'error');
        setSubmitting(false);
        return;
      }

      // Create FormData with product data and images
      const formDataPayload = new FormData();
      formDataPayload.append('name', formData.name);
      formDataPayload.append('description', formData.description);
      formDataPayload.append('top_notes', formData.top_notes);
      formDataPayload.append('middle_notes', formData.middle_notes);
      formDataPayload.append('base_notes', formData.base_notes);
      formDataPayload.append('category', formData.category);
      formDataPayload.append('price_30ml', formData.price_30ml);
      formDataPayload.append('price_50ml', formData.price_50ml);
      formDataPayload.append('stock_30ml', formData.stock_30ml);
      formDataPayload.append('stock_50ml', formData.stock_50ml || formData.stock_30ml);

      // Add images with explicit slot keys (same format as update)
      uploadedImages.forEach((image, index) => {
        if (image) {
          const slotKey = `image_slot_${index + 1}`;
          formDataPayload.append(slotKey, image);
          console.log(`Adding image for slot ${index + 1}:`, image.name);
        }
      });

      console.log('Creating product with images');

      const createResponse = await api.post('/admin/products', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newProductId = createResponse.data.product_id || createResponse.data.id;

      console.log('Product created with ID:', newProductId);

      // Refresh the product list
      await fetchProducts();
      showToast(`Product "${formData.name}" created successfully!`, 'success');
      closeModals();
    } catch (err: any) {
      console.error('Error creating product:', err);
      
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to create product';
      const errors = err.response?.data?.errors;
      
      let displayMessage = errorMessage;
      if (errors) {
        const errorList = Object.entries(errors)
          .map(([field, messages]: any) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        displayMessage = `Validation errors:\n${errorList}`;
      } else if (err.response?.data) {
        displayMessage = `Error: ${JSON.stringify(err.response.data)}`;
      }
      
      setModalError(displayMessage);
      showToast(displayMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    if (editingProduct) {
      await handleUpdateProduct(e);
    } else {
      await handleCreateProduct(e);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const productName = products.find(p => p.product_id === productId)?.name || 'Product';
      await api.delete(`/admin/products/${productId}`);
      setProducts(products.filter((p) => p.product_id !== productId));
      setDeleteConfirm(null);
      showToast(`"${productName}" deleted successfully!`, 'success');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      
      // Handle 409 Conflict - product has related records
      if (error.response?.status === 409) {
        const details = error.response?.data?.details;
        let message = 'Cannot delete this product because it is linked to:';
        
        if (details?.cart_items > 0) message += `\n• ${details.cart_items} cart item(s)`;
        if (details?.wishlist_items > 0) message += `\n• ${details.wishlist_items} wishlist item(s)`;
        if (details?.order_details > 0) message += `\n• ${details.order_details} order(s)`;
        if (details?.ratings > 0) message += `\n• ${details.ratings} rating(s)`;
        if (details?.pos_items > 0) message += `\n• ${details.pos_items} POS record(s)`;
        
        message += '\n\nRemove these references first before deleting the product.';
        showToast(message, 'error');
      } else {
        showToast('Failed to delete product', 'error');
      }
    }
  };

  const getProductImage = (product: Product) => {
    const image = product.images?.[0];
    return image?.image_url || '/placeholder.jpg';
  };

  const getTotalStock = (product: Product) => {
    return (product.stock_30ml || 0) + (product.stock_50ml || 0);
  };

  const getCategoryBadgeColor = (category: string) => {
    return 'bg-white text-black border-2 border-black';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Add Product Button */}
            <button
              onClick={openAddModal}
              className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              Add Product
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="px-8 py-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No products found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.product_id}
                  className="bg-white rounded-lg border border-gray-200 p-6 flex items-center gap-6 hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                    
                    {/* Category and Rating Row */}
                    <div className="flex items-center gap-4 mb-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                          product.category
                        )}`}
                      >
                        {product.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <FaStar className="text-black text-sm" />
                        <span className="text-sm font-semibold text-gray-900">
                          {(Number(product.ratings_avg_stars) || product.average_rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-4 gap-6 text-sm mb-3">
                      <div>
                        <p className="text-gray-600 text-xs">Price 30ml</p>
                        <p className="font-semibold text-gray-900">
                          Rp {product.price_30ml?.toLocaleString('id-ID') || '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Price 50ml</p>
                        <p className="font-semibold text-gray-900">
                          Rp {product.price_50ml?.toLocaleString('id-ID') || '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Stock</p>
                        <p className="font-semibold text-gray-900">{getTotalStock(product)} units</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs">Reviews</p>
                        <p className="font-semibold text-gray-900">{product.ratings_count || product.review_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit product"
                    >
                      <PencilIcon className="w-5 h-5" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product.product_id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete product"
                    >
                      <TrashIcon className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {deleteConfirm === product.product_id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-50">
                      <div className="bg-white rounded-lg p-6 shadow-lg">
                        <p className="font-semibold text-gray-900 mb-4">
                          Delete "{product.name}"?
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.product_id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingProduct ? 'Update product information' : 'Create a new product'}
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitProduct} className="p-6 space-y-6">
              {modalError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 whitespace-pre-wrap">{modalError}</p>
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
                  required
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
                  required
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

                  <div className="grid grid-cols-3 gap-3">
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
                        required
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
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <div></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Stock 30ml
                      </label>
                      <input
                        type="number"
                        name="stock_30ml"
                        value={formData.stock_30ml}
                        onChange={handleInputChange}
                        placeholder="0"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Stock 50ml
                      </label>
                      <input
                        type="number"
                        name="stock_50ml"
                        value={formData.stock_50ml}
                        onChange={handleInputChange}
                        placeholder="0"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* Media Management Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Images (Max 4)</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Upload images: 50ml primary, 30ml secondary, and 2 additional images (PNG, JPG - max. 10MB each).
                </p>

                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((index) => {
                    const slot = index + 1; // Convert 0-based index to 1-based slot
                    const imageUrl = getImageForSlot(slot);
                    const hasExistingImage = existingImagesBySlot[slot] !== null;
                    const existingImage = existingImagesBySlot[slot];
                    
                    return (
                      <div key={slot} className="relative">
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
                          {imageUrl ? (
                            <div className="relative w-full h-full">
                              <img
                                src={imageUrl}
                                alt={`Product slot ${slot}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-start justify-end p-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (hasExistingImage && existingImage?.image_id) {
                                      // Deleting an existing image
                                      handleDeleteExistingImage(existingImage.image_id, slot);
                                    } else {
                                      // Removing a newly uploaded image
                                      const previews = [...imagePreviews];
                                      previews[index] = null;
                                      setImagePreviews(previews);
                                      const newUploaded = [...uploadedImages];
                                      newUploaded[index] = null as any;
                                      setUploadedImages(newUploaded.filter(Boolean));
                                    }
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
                            <div className="flex flex-col items-center justify-center">
                              <svg
                                className="w-6 h-6 text-gray-400 mb-2"
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
                        <p className="text-xs text-gray-500 text-center mt-1">
                          {slot === 1 ? '50ml' : slot === 2 ? '30ml' : 'Additional'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => closeModals()}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (editingProduct ? 'Updating...' : 'Creating...') : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
