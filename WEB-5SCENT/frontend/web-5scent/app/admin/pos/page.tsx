'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import Image from 'next/image';
import {
  ChevronDownIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

interface Product {
  product_id: number;
  name: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
  image_thumb?: string;
  image_thumb_50ml?: string;
}

interface CartItem {
  product_id: number;
  name: string;
  size: '30ml' | '50ml';
  quantity: number;
  price: number;
  subtotal: number;
  image_url?: string;
}

interface PaymentMethod {
  label: string;
  value: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { label: 'Cash', value: 'Cash' },
  { label: 'QRIS', value: 'QRIS' },
  { label: 'Virtual Account', value: 'Virtual Account' },
];

export default function POSToolPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+62');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Get current date
  const currentDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Search products
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get('/admin/pos/products/search', {
        params: { q: query },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search products:', error);
      showToast('Failed to search products', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select product
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setQuantity(1);
  };

  // Add to cart
  const handleAddToCart = () => {
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }

    const price =
      selectedSize === '30ml'
        ? selectedProduct.price_30ml
        : selectedProduct.price_50ml;

    const itemExists = cart.find(
      (item) =>
        item.product_id === selectedProduct.product_id && item.size === selectedSize
    );

    if (itemExists) {
      setCart(
        cart.map((item) =>
          item.product_id === selectedProduct.product_id &&
          item.size === selectedSize
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * price,
              }
            : item
        )
      );
    } else {
      const imageUrl = selectedSize === '50ml' 
        ? selectedProduct.image_thumb_50ml 
        : selectedProduct.image_thumb;
      
      setCart([
        ...cart,
        {
          product_id: selectedProduct.product_id,
          name: selectedProduct.name,
          size: selectedSize,
          quantity,
          price,
          subtotal: quantity * price,
          image_url: imageUrl,
        },
      ]);
    }

    showToast('Item added to cart', 'success');
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Remove from cart
  const handleRemoveFromCart = (product_id: number, size: string) => {
    setCart(cart.filter((item) => !(item.product_id === product_id && item.size === size)));
    showToast('Item removed from cart', 'info');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const change =
    paymentMethod === 'Cash' && cashReceived
      ? parseFloat(cashReceived) - subtotal
      : 0;

  // Handle phone input
  const handlePhoneChange = (value: string) => {
    if (!value.startsWith('+62')) {
      value = '+62';
    }
    if (value.length <= 18) {
      setCustomerPhone(value);
    }
  };

  // Handle download receipt
  const handleDownloadReceipt = async (transactionId: string) => {
    try {
      const response = await api.get(
        `/admin/pos/transactions/${transactionId}/receipt`,
        { responseType: 'blob' }
      );
      
      // Get transaction data to construct filename with customer name
      const transactionResponse = await api.get(`/admin/pos/transactions/${transactionId}`);
      const transaction = transactionResponse.data;
      
      // Create filename: pos-receipt-{transaction_id}-{customer_name}
      const sanitizedName = transaction.customer_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `pos-receipt-${transaction.transaction_id}-${sanitizedName}.pdf`;
      
      console.log('Downloading receipt with filename:', filename);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast('Receipt downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      showToast('Failed to download receipt', 'error');
    }
  };

  // Submit transaction
  const handleSubmitTransaction = async () => {
    // Validation
    if (!customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }

    if (customerPhone.length < 10 || !/^\+62[0-9]{8,12}$/.test(customerPhone)) {
      showToast('Please enter valid phone number (+62xxxxxxxxx)', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    if (paymentMethod === 'Cash' && !cashReceived) {
      showToast('Please enter cash received amount', 'error');
      return;
    }

    if (paymentMethod === 'Cash' && parseFloat(cashReceived) < subtotal) {
      showToast('Cash received must be greater than or equal to subtotal', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/admin/pos/transactions', {
        customer_name: customerName,
        phone: customerPhone,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'Cash' ? parseFloat(cashReceived) : null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
      });

      const transactionId = response.data.transaction_id;
      
      showToast('Transaction created successfully', 'success');
      
      // Download receipt immediately
      setTimeout(() => {
        handleDownloadReceipt(transactionId);
      }, 500);

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('+62');
      setCashReceived('');
      setPaymentMethod('Cash');
      setSelectedProduct(null);
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      const message =
        error.response?.data?.message || 'Failed to create transaction';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - 60% */}
          <div className="space-y-6 lg:col-span-2">
            {/* Product Selection Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Product Selection
              </h2>

              {/* Search Bar */}
              <div className="mb-6 flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter product ID/name"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {searchResults.map((product) => (
                        <button
                          key={product.product_id}
                          onClick={() => handleSelectProduct(product)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                        >
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            30ml: {formatCurrency(product.price_30ml)} | 50ml:{' '}
                            {formatCurrency(product.price_50ml)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="rounded-lg bg-black px-6 py-2 font-medium text-white hover:bg-gray-900"
                >
                  Search
                </button>
              </div>

              {/* Selected Product */}
              {selectedProduct && (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedProduct.name}
                    </h3>
                  </div>

                  {/* Size Selection */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Size
                    </label>
                    <div className="flex gap-2">
                      {['30ml', '50ml'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size as '30ml' | '50ml')}
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            selectedSize === size
                              ? 'border-2 border-black bg-black text-white'
                              : 'border-2 border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                          }`}
                        >
                          <div>
                            {size} - {formatCurrency(size === '30ml' ? selectedProduct.price_30ml : selectedProduct.price_50ml)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
                  >
                    + Add to Cart
                  </button>
                </div>
              )}
            </div>

            {/* Payment Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Payment Details
              </h2>

              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Customer's Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900 font-medium flex items-center">
                      +62
                    </div>
                    <input
                      type="text"
                      value={customerPhone.replace('+62', '')}
                      onChange={(e) => handlePhoneChange('+62' + e.target.value)}
                      placeholder="8xxxxxxxxx"
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <div className="relative">
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setCashReceived('');
                      }}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Cash Received - Conditional */}
                {paymentMethod === 'Cash' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Cash Received
                    </label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Subtotal and Change */}
                <div className="space-y-2 border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {paymentMethod === 'Cash' && cashReceived && (
                    <div className="flex justify-between text-gray-700">
                      <span>Change:</span>
                      <span
                        className={`font-medium ${
                          change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(change)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Download Receipt Button */}
                <button
                  onClick={handleSubmitTransaction}
                  disabled={loading || cart.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  {loading ? 'Processing...' : 'Download Receipt'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - 40% */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm h-fit">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Cart ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    {/* Product Image */}
                    {item.image_url ? (
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={`/products/${item.image_url}`}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg" />
                    )}
                    
                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.size} x {item.quantity}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() =>
                        handleRemoveFromCart(item.product_id, item.size)
                      }
                      className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
