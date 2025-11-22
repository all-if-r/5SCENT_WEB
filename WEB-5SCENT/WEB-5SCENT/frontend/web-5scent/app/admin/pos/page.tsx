'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

interface Product {
  product_id: number;
  name: string;
  price_30ml: number;
  price_50ml: number;
  stock_30ml: number;
  stock_50ml: number;
}

interface CartItem {
  product_id: number;
  size: '30ml' | '50ml';
  quantity: number;
  product: Product;
  price: number;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<'30ml' | '50ml'>('30ml');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.info(`[POSPage] Fetching products from: ${api.defaults.baseURL}/products`);
      const response = await api.get('/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      setProducts(response.data.data || response.data);
      console.info('[POSPage] Products fetched successfully:', response.data);
    } catch (error: any) {
      console.error('[POSPage] Error details:', {
        message: error.message,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      showToast('Failed to load products. Check console for details.', 'error');
    }
  };

  const addToCart = () => {
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }

    const product = products.find(p => p.product_id === selectedProduct);
    if (!product) return;

    const stock = selectedSize === '30ml' ? product.stock_30ml : product.stock_50ml;
    if (stock < quantity) {
      showToast('Insufficient stock', 'error');
      return;
    }

    const price = selectedSize === '30ml' ? product.price_30ml : product.price_50ml;
    const existingIndex = cart.findIndex(
      item => item.product_id === product.product_id && item.size === selectedSize
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: product.product_id,
        size: selectedSize,
        quantity,
        product,
        price,
      }]);
    }

    setQuantity(1);
  };

  const removeFromCart = (productId: number, size: '30ml' | '50ml') => {
    setCart(cart.filter(item => !(item.product_id === productId && item.size === size)));
  };

  const updateQuantity = (productId: number, size: '30ml' | '50ml', newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(cart.map(item =>
      item.product_id === productId && item.size === size
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    if (!customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }

    setLoading(true);
    try {
      console.info('[POSPage] Creating transaction:', { customer_name: customerName, items_count: cart.length });
      const response = await api.post('/admin/pos/transactions', {
        customer_name: customerName,
        items: cart.map(item => ({
          product_id: item.product_id,
          size: item.size,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });

      console.info('[POSPage] Transaction completed:', response.data);
      showToast('Transaction completed successfully', 'success');
      
      // Reset
      setCart([]);
      setCustomerName('');
      setSelectedProduct(null);
      setQuantity(1);
      fetchProducts();
    } catch (error: any) {
      console.error('[POSPage] Transaction error details:', {
        message: error.message,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      showToast(error.response?.data?.message || 'Transaction failed. Check console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-header font-bold mb-2">Point of Sale</h1>
          <Link href="/admin/dashboard" className="text-primary-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Product</h2>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <select
                  value={selectedProduct || ''}
                  onChange={(e) => setSelectedProduct(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedSize('30ml')}
                    className={`px-4 py-2 border-2 rounded-lg ${
                      selectedSize === '30ml'
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-gray-300'
                    }`}
                  >
                    30ml
                  </button>
                  <button
                    onClick={() => setSelectedSize('50ml')}
                    className={`px-4 py-2 border-2 rounded-lg ${
                      selectedSize === '50ml'
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-gray-300'
                    }`}
                  >
                    50ml
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={addToCart}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add to Cart
              </button>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-4">Cart</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={`${item.product_id}-${item.size}`} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">{item.size} - {formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                        className="w-8 h-8 border rounded"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1)}
                        className="w-8 h-8 border rounded"
                      >
                        +
                      </button>
                      <p className="w-24 text-right font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product_id, item.size)}
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Payment</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2">Total</p>
                <p className="text-3xl font-bold text-primary-600">{formatCurrency(calculateTotal())}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="QRIS">QRIS</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Complete Transaction'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
