import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePricingStore } from '@/store/usePricingStore';
import { usePricingUpdates } from '@/hooks/usePricingUpdates';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiClock, FiTag, FiLayers } from 'react-icons/fi';

const PricingPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'individual' | 'brand' | 'category'>('brand');
  const [mounted, setMounted] = useState(false);
  const { stats, history = [], loadStats, loadHistory } = usePricingStore();
  
  // Initialize WebSocket updates (optional - won't break if socket not ready)
  usePricingUpdates();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadStats().catch(err => console.error('Failed to load stats:', err));
      loadHistory({ limit: 5 }).catch(err => console.error('Failed to load history:', err));
    }
  }, [mounted]);

  const tabs = [
    { id: 'individual', label: 'Individual Products', icon: FiTag },
    { id: 'brand', label: 'By Brand', icon: FiDollarSign },
    { id: 'category', label: 'By Category', icon: FiLayers },
  ];

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Bulk Pricing Management</h1>
          <p className="text-gray-600">Manage product prices efficiently with bulk operations</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiClock className="text-blue-600 text-2xl" />
              </div>
              <span className="text-sm text-gray-500">Last 24h</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.last24Hours?.changes || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Price Changes</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.last24Hours?.productsAffected || 0} products affected
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FiTrendingUp className="text-green-600 text-2xl" />
              </div>
              <span className="text-sm text-gray-500">Last 7 days</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.last7Days?.changes || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Changes</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats?.last7Days?.productsAffected || 0} products affected
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiDollarSign className="text-purple-600 text-2xl" />
              </div>
              <span className="text-sm text-gray-500">Impact</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${Math.abs(stats?.last24Hours?.totalImpact || 0).toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 mt-1">24h Revenue Impact</p>
            <p className={`text-xs mt-2 ${(stats?.last24Hours?.totalImpact || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats?.last24Hours?.totalImpact || 0) >= 0 ? '↑' : '↓'} ${Math.abs(stats?.last24Hours?.totalImpact || 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FiTrendingDown className="text-orange-600 text-2xl" />
              </div>
              <span className="text-sm text-gray-500">All Time</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalOperations || 0}
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Operations</p>
            <p className="text-xs text-gray-500 mt-2">Since beginning</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="text-lg" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'individual' && (
              <div className="text-center py-12">
                <FiTag className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Individual Product Pricing</h3>
                <p className="text-gray-500 mb-6">Update prices for individual products from the products list</p>
                <button
                  onClick={() => handleNavigate('/admin/products')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Products
                </button>
              </div>
            )}

            {activeTab === 'brand' && (
              <div className="text-center py-12">
                <FiDollarSign className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Brand Bulk Pricing</h3>
                <p className="text-gray-500 mb-6">Update prices for all products in a brand at once</p>
                <button
                  onClick={() => handleNavigate('/admin/pricing/by-brand')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Brand Pricing
                </button>
              </div>
            )}

            {activeTab === 'category' && (
              <div className="text-center py-12">
                <FiLayers className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Category Bulk Pricing</h3>
                <p className="text-gray-500 mb-6">Update prices for all products in a category at once</p>
                <button
                  onClick={() => handleNavigate('/admin/pricing/by-category')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Category Pricing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Price Changes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">📊 Recent Price Changes</h2>
              <button
                onClick={() => handleNavigate('/admin/pricing/history')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {!history || history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No recent price changes</p>
              </div>
            ) : (
              history.slice(0, 5).map((item) => (
                <div key={item._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded
                          ${item.type === 'brand' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'category' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'}
                        `}>
                          {item.type.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{item.targetName}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {item.direction === 'increase' ? '↑' : '↓'} {item.changeValue}
                        {item.changeType === 'percentage' ? '%' : ' USD'} • {item.totalProductsAffected} products
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {item.changedBy?.name} • {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`
                        px-3 py-1 text-xs font-medium rounded-full
                        ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                          item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          item.status === 'failed' ? 'bg-red-100 text-red-700' :
                          item.status === 'undone' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700'}
                      `}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleNavigate('/admin/pricing/by-brand')}
            className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <FiDollarSign className="text-3xl mb-3" />
            <h3 className="text-lg font-semibold mb-2">Update by Brand</h3>
            <p className="text-sm text-blue-100">Bulk update all products in a brand</p>
          </button>

          <button
            onClick={() => handleNavigate('/admin/pricing/by-category')}
            className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <FiLayers className="text-3xl mb-3" />
            <h3 className="text-lg font-semibold mb-2">Update by Category</h3>
            <p className="text-sm text-purple-100">Bulk update all products in a category</p>
          </button>

          <button
            onClick={() => handleNavigate('/admin/pricing/history')}
            className="p-6 bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl"
          >
            <FiClock className="text-3xl mb-3" />
            <h3 className="text-lg font-semibold mb-2">View History</h3>
            <p className="text-sm text-gray-100">See all past price changes</p>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PricingPage;
