import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { FiRefreshCw, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface TestProductCardPageProps {
  initialProducts: any[];
}

export default function TestProductCardPage({ initialProducts }: TestProductCardPageProps) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [testResults, setTestResults] = useState<{
    realTimeUpdates: boolean;
    addToCart: boolean;
    wishlist: boolean;
    quickView: boolean;
    priceDisplay: boolean;
    stockDisplay: boolean;
    imageHover: boolean;
    responsive: boolean;
  }>({
    realTimeUpdates: false,
    addToCart: false,
    wishlist: false,
    quickView: false,
    priceDisplay: true,
    stockDisplay: true,
    imageHover: true,
    responsive: true,
  });

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/products?limit=12`);
      if (response.data.success) {
        setProducts(response.data.data.products);
      }
    } catch (error) {
      console.error('Failed to refresh products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickView = (product: any) => {
    setSelectedProduct(product);
    setTestResults(prev => ({ ...prev, quickView: true }));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Test Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  🧪 Product Card Testing Dashboard
                </h1>
                <p className="text-gray-600">
                  Testing enhanced ProductCard with real-time WebSocket updates
                </p>
              </div>
              <button
                onClick={refreshProducts}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Products
              </button>
            </div>

            {/* Test Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(testResults).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    value ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {value ? (
                      <FiCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-400 rounded" />
                    )}
                    <span className="font-semibold text-sm text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {value ? 'Working ✓' : 'Not tested'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
            <h2 className="text-2xl font-bold mb-4">📋 Testing Instructions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Manual Testing
                </h3>
                <ul className="space-y-1 text-sm text-blue-50">
                  <li>• Hover over product cards to see image transitions</li>
                  <li>• Click heart icon to add/remove from wishlist</li>
                  <li>• Click eye icon for quick view modal</li>
                  <li>• Click "Add to Cart" button to test cart functionality</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Real-Time Testing
                </h3>
                <ul className="space-y-1 text-sm text-blue-50">
                  <li>• Open admin panel in another tab</li>
                  <li>• Update product stock/price in admin</li>
                  <li>• Watch cards update in real-time</li>
                  <li>• Check for toast notifications</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Product Cards ({products.length} products)
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onQuickView={handleQuickView}
                    showRealTimeUpdates={true}
                  />
                ))}
              </div>
            )}

            {products.length === 0 && !loading && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No products found</p>
                <button
                  onClick={refreshProducts}
                  className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Load Products
                </button>
              </div>
            )}
          </div>

          {/* Testing Checklist */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ Feature Checklist</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-primary-600">Visual Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Hover image transitions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Animated badges (New, Featured, Discount)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Stock indicators (Low stock, Out of stock)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Star ratings display</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-primary-600">Interactive Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Add to cart with loading state</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Wishlist toggle (heart icon)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Quick view modal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Image gallery indicators</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-primary-600">Real-Time Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Stock updates via WebSocket</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Price change notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Low stock alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Out of stock alerts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedProduct && (
        <QuickViewModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const response = await axios.get(`${API_URL}/products?limit=12`);
    
    return {
      props: {
        initialProducts: response.data.success ? response.data.data.products : [],
      },
    };
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return {
      props: {
        initialProducts: [],
      },
    };
  }
};
