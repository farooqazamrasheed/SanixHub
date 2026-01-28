import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import DashboardStats from '@/components/admin/DashboardStats';
import LiveStatsGrid from '@/components/admin/LiveStatsGrid';
import ActivityFeed from '@/components/admin/ActivityFeed';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useDashboardUpdates } from '@/hooks/useDashboardUpdates';
import { useAdminOrderUpdates } from '@/hooks/useOrderUpdates';
import { useAdminInventoryUpdates } from '@/hooks/useInventoryUpdates';
import LiveIndicator from '@/components/LiveIndicator';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiPackage, FiAlertTriangle, FiUsers, FiActivity } from 'react-icons/fi';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminDashboard() {
  const { isLoading: authLoading } = useAdminAuth();
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
    enabled: !authLoading,
  });

  // Real-time updates
  const { liveStats, recentActivity, isSubscribed, broadcastMessage: sendBroadcast, refreshStats } = useDashboardUpdates();
  const { newOrderCount, resetCount } = useAdminOrderUpdates();
  useAdminInventoryUpdates(); // Subscribe to inventory updates

  const stats = liveStats || data?.data;
  
  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleBroadcast = () => {
    if (broadcastMessage.trim()) {
      sendBroadcast(broadcastMessage, 'info');
      setBroadcastMessage('');
      setShowBroadcast(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header with Live Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <LiveIndicator showText={true} />
              {isSubscribed && (
                <span className="text-sm text-green-600 font-medium">
                  Real-time updates active
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FiActivity className="w-4 h-4" />
              Refresh Stats
            </button>
            
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📢 Broadcast Message
            </button>
          </div>
        </div>

        {/* Broadcast Input */}
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send message to all users:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBroadcast()}
                placeholder="Type your announcement..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleBroadcast}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
              <button
                onClick={() => setShowBroadcast(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* New Orders Alert */}
      {newOrderCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-3xl">
                🔔
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {newOrderCount} New {newOrderCount === 1 ? 'Order' : 'Orders'}!
                </h3>
                <p className="text-green-100">Click to view and manage</p>
              </div>
            </div>
            <Link
              href="/admin/orders"
              onClick={() => resetCount()}
              className="px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              View Orders →
            </Link>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Import LiveStatsGrid component */}
          <LiveStatsGrid stats={stats} isLive={isSubscribed} />

          {/* Quick Access Links */}
          <div className="mt-8 mb-6">
            <h2 className="text-xl font-bold mb-4">📊 Analytics & Reports</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                href="/admin/analytics"
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-white"
              >
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-3xl mr-4">
                    📈
                  </div>
                  <h3 className="text-xl font-bold">Sales Analytics</h3>
                </div>
                <p className="text-white text-opacity-90 text-sm">
                  Revenue, orders, and business metrics
                </p>
              </Link>

              <Link
                href="/admin/inventory/reports"
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-white"
              >
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-3xl mr-4">
                    📊
                  </div>
                  <h3 className="text-xl font-bold">Inventory Reports</h3>
                </div>
                <p className="text-white text-opacity-90 text-sm">
                  Stock analysis and top sellers
                </p>
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="mb-6">
            <ActivityFeed activities={recentActivity} maxItems={10} />
          </div>

          {/* Management Tools */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">🛠️ Management Tools</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/admin/products" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl mr-3">📦</div>
                  <h3 className="font-bold">Products</h3>
                </div>
                <p className="text-gray-600 text-sm">Manage catalog & pricing</p>
              </Link>

              <Link href="/admin/orders" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl mr-3">🛒</div>
                  <h3 className="font-bold">Orders</h3>
                </div>
                <p className="text-gray-600 text-sm">Process & fulfill orders</p>
              </Link>

              <Link href="/admin/inventory" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl mr-3">📋</div>
                  <h3 className="font-bold">Inventory</h3>
                </div>
                <p className="text-gray-600 text-sm">Monitor stock levels</p>
              </Link>

              <Link href="/admin/users" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-xl mr-3">👥</div>
                  <h3 className="font-bold">Users</h3>
                </div>
                <p className="text-gray-600 text-sm">Manage customer accounts</p>
              </Link>

              <Link href="/admin/categories" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl mr-3">📁</div>
                  <h3 className="font-bold">Categories</h3>
                </div>
                <p className="text-gray-600 text-sm">Organize products</p>
              </Link>

              <Link href="/admin/brands" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-xl mr-3">🏷️</div>
                  <h3 className="font-bold">Brands</h3>
                </div>
                <p className="text-gray-600 text-sm">Manage product brands</p>
              </Link>

              <Link href="/admin/reviews" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl mr-3">⭐</div>
                  <h3 className="font-bold">Reviews</h3>
                </div>
                <p className="text-gray-600 text-sm">Moderate reviews</p>
              </Link>

              <Link href="/admin/coupons" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-xl mr-3">🎫</div>
                  <h3 className="font-bold">Coupons</h3>
                </div>
                <p className="text-gray-600 text-sm">Discount codes</p>
              </Link>

              <Link href="/admin/settings" className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl mr-3">⚙️</div>
                  <h3 className="font-bold">Settings</h3>
                </div>
                <p className="text-gray-600 text-sm">Store configuration</p>
              </Link>
            </div>
          </div>

          {/* Advanced Tools */}
          <div>
            <h2 className="text-xl font-bold mb-4">⚡ Advanced Tools</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/admin/inventory/bulk-update" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-2xl mb-2">📦</div>
                  <div className="font-semibold text-sm">Bulk Update</div>
                </div>
              </Link>
              <Link href="/admin/inventory/import-export" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-semibold text-sm">Import/Export</div>
                </div>
              </Link>
              <Link href="/admin/email-management" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-2xl mb-2">📧</div>
                  <div className="font-semibold text-sm">Email</div>
                </div>
              </Link>
              <Link href="/wishlist" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-2xl mb-2">💝</div>
                  <div className="font-semibold text-sm">Wishlist</div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  // Check authentication here if needed
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin'])),
    },
  };
};
