import { GetServerSideProps } from 'next';
import { useState, useMemo } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useDashboardUpdates } from '@/hooks/useDashboardUpdates';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Real-time dashboard updates via WebSocket
  useDashboardUpdates((updatedStats) => {
    console.log('📊 Analytics: Real-time stats update received');
    queryClient.setQueryData(['dashboard-stats'], (old: any) => ({
      ...old,
      data: updatedStats
    }));
    toast.success('Analytics updated in real-time');
  });

  // Real-time order updates via WebSocket
  useOrderUpdates((updatedOrder) => {
    console.log('📦 Analytics: Order update received', updatedOrder);
    // Invalidate orders query to refetch
    queryClient.invalidateQueries({ queryKey: ['orders-analytics'] });
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: adminAPI.getDashboard,
    enabled: !authLoading,
  });

  // Fetch inventory report
  const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory-analytics', dateRange],
    queryFn: () => adminAPI.getInventoryReports({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    enabled: !authLoading,
  });

  // Fetch orders for analytics with date range filter
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders-analytics', dateRange],
    queryFn: () => adminAPI.getAllOrders({ 
      limit: 1000,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate 
    }),
    enabled: !authLoading,
  });

  // Fetch previous period orders for comparison
  const previousPeriodRange = useMemo(() => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    
    return {
      startDate: prevStart.toISOString().split('T')[0],
      endDate: prevEnd.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const { data: previousOrdersData } = useQuery({
    queryKey: ['orders-analytics-previous', previousPeriodRange],
    queryFn: () => adminAPI.getAllOrders({ 
      limit: 1000,
      startDate: previousPeriodRange.startDate,
      endDate: previousPeriodRange.endDate 
    }),
    enabled: !authLoading,
  });

  // Extract data early (before conditional return)
  const stats = dashboardData?.data;
  const inventoryReport = inventoryData?.data;
  const orders = ordersData?.data?.orders || [];
  const previousOrders = previousOrdersData?.data?.orders || [];

  // Calculate order stats (filtered by date range)
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: any) => o.status === 'picked_up').length;
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;
  const totalRevenue = orders
    .filter((o: any) => o.status === 'picked_up')
    .reduce((sum: number, o: any) => sum + (o.pricing?.total || 0), 0);
  const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  // Calculate previous period stats for comparison
  const prevTotalOrders = previousOrders.length;
  const prevCompletedOrders = previousOrders.filter((o: any) => o.status === 'picked_up').length;
  const prevTotalRevenue = previousOrders
    .filter((o: any) => o.status === 'picked_up')
    .reduce((sum: number, o: any) => sum + (o.pricing?.total || 0), 0);
  const prevAvgOrderValue = prevCompletedOrders > 0 ? prevTotalRevenue / prevCompletedOrders : 0;

  // Calculate growth percentages
  const revenueGrowth = prevTotalRevenue > 0 
    ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1) 
    : '0';
  const ordersGrowth = prevTotalOrders > 0 
    ? ((totalOrders - prevTotalOrders) / prevTotalOrders * 100).toFixed(1) 
    : '0';
  const avgOrderGrowth = prevAvgOrderValue > 0 
    ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue * 100).toFixed(1) 
    : '0';
  const completionRateGrowth = prevTotalOrders > 0 
    ? (((completedOrders / totalOrders) - (prevCompletedOrders / prevTotalOrders)) * 100).toFixed(1) 
    : '0';

  // Prepare chart data - Revenue over time
  const revenueChartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    
    orders.filter((o: any) => o.status === 'picked_up').forEach((order: any) => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap.set(date, (dataMap.get(date) || 0) + (order.pricing?.total || 0));
    });
    
    return Array.from(dataMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days
  }, [orders]);

  // Prepare chart data - Orders by status
  const orderStatusData = useMemo(() => [
    { name: 'Placed', value: stats?.orders?.placed || 0, color: '#f59e0b' },
    { name: 'Ready', value: stats?.orders?.ready || 0, color: '#3b82f6' },
    { name: 'Picked Up', value: completedOrders, color: '#10b981' },
    { name: 'Cancelled', value: cancelledOrders, color: '#ef4444' },
  ], [stats, completedOrders, cancelledOrders]);

  // Prepare chart data - Daily orders
  const dailyOrdersData = useMemo(() => {
    const dataMap = new Map<string, number>();
    
    orders.forEach((order: any) => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap.set(date, (dataMap.get(date) || 0) + 1);
    });
    
    return Array.from(dataMap.entries())
      .map(([date, count]) => ({ date, orders: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days
  }, [orders]);

  // Manual refresh function
  const handleRefresh = () => {
    toast.loading('Refreshing analytics...');
    Promise.all([refetchDashboard(), refetchInventory(), refetchOrders()])
      .then(() => {
        toast.dismiss();
        toast.success('Analytics refreshed!');
      })
      .catch(() => {
        toast.dismiss();
        toast.error('Failed to refresh');
      });
  };

  if (authLoading || dashboardLoading || inventoryLoading || ordersLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin" label="Back to Dashboard" variant="primary" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-600 font-medium">Real-time updates active</span>
            </span>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
              setDateRange({ startDate: thirtyDaysAgo, endDate: today });
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Revenue & Orders Overview with Growth */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold">
                Rs. {totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm opacity-80">
                  {completedOrders} completed orders
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  parseFloat(revenueGrowth) >= 0 ? 'text-green-200' : 'text-red-200'
                }`}>
                  {parseFloat(revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(revenueGrowth))}%
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Average Order Value</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold">
                Rs. {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm opacity-80">
                  Per completed order
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  parseFloat(avgOrderGrowth) >= 0 ? 'text-blue-200' : 'text-red-200'
                }`}>
                  {parseFloat(avgOrderGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(avgOrderGrowth))}%
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Total Orders</h3>
                <span className="text-2xl">🛒</span>
              </div>
              <div className="text-3xl font-bold">{totalOrders}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm opacity-80">
                  {stats.orders?.today || 0} today
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  parseFloat(ordersGrowth) >= 0 ? 'text-purple-200' : 'text-red-200'
                }`}>
                  {parseFloat(ordersGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(ordersGrowth))}%
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">Completion Rate</h3>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-3xl font-bold">
                {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm opacity-80">
                  {completedOrders} of {totalOrders} orders
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${
                  parseFloat(completionRateGrowth) >= 0 ? 'text-orange-200' : 'text-red-200'
                }`}>
                  {parseFloat(completionRateGrowth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(completionRateGrowth))}%
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Revenue Trend (Last 14 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Revenue (Rs.)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Orders Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Daily Orders (Last 14 Days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyOrdersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="orders" 
                    fill="#3b82f6" 
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Status Pie Chart & Breakdown */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Orders by Status</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Order Status Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-700 mb-1">⏳ Placed</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {stats.orders?.placed || 0}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {totalOrders > 0 ? Math.round((stats.orders?.placed || 0) / totalOrders * 100) : 0}% of total
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-700 mb-1">📦 Ready</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.orders?.ready || 0}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {totalOrders > 0 ? Math.round((stats.orders?.ready || 0) / totalOrders * 100) : 0}% of total
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700 mb-1">✅ Picked Up</div>
                  <div className="text-2xl font-bold text-green-900">
                    {completedOrders}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0}% of total
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700 mb-1">❌ Cancelled</div>
                  <div className="text-2xl font-bold text-red-900">
                    {cancelledOrders}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {totalOrders > 0 ? Math.round(cancelledOrders / totalOrders * 100) : 0}% of total
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products & Inventory */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Products Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Products Overview</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Total Products</span>
                  <span className="font-bold text-gray-900">{stats.products?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Active Products</span>
                  <span className="font-bold text-green-900">{stats.products?.active || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Low Stock Items</span>
                  <span className="font-bold text-red-900">{stats.products?.lowStock || 0}</span>
                </div>
              </div>
              <Link
                href="/admin/inventory"
                className="mt-4 block text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Manage Inventory →
              </Link>
            </div>

            {/* Customers & Reviews */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Customers & Reviews</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Total Customers</span>
                  <span className="font-bold text-gray-900">{stats.customers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700">Pending Reviews</span>
                  <span className="font-bold text-yellow-900">{stats.reviews?.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">Avg. Order/Customer</span>
                  <span className="font-bold text-blue-900">
                    {stats.customers > 0 ? (stats.orders.total / stats.customers).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
              <Link
                href="/admin/reviews"
                className="mt-4 block text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Moderate Reviews →
              </Link>
            </div>
          </div>

          {/* Inventory Analytics */}
          {inventoryReport && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Inventory Analytics</h2>
                <Link
                  href="/admin/inventory/reports"
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  View Full Report →
                </Link>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Inventory Value</div>
                  <div className="text-xl font-bold text-gray-900">
                    Rs. {inventoryReport.summary?.totalValue?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700 mb-1">In Stock</div>
                  <div className="text-xl font-bold text-green-900">
                    {inventoryReport.summary?.inStock || 0}
                    <span className="text-sm ml-1">({inventoryReport.summary?.stockPercentage?.inStock || 0}%)</span>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-700 mb-1">Low Stock</div>
                  <div className="text-xl font-bold text-yellow-900">
                    {inventoryReport.summary?.lowStock || 0}
                    <span className="text-sm ml-1">({inventoryReport.summary?.stockPercentage?.lowStock || 0}%)</span>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700 mb-1">Out of Stock</div>
                  <div className="text-xl font-bold text-red-900">
                    {inventoryReport.summary?.outOfStock || 0}
                    <span className="text-sm ml-1">({inventoryReport.summary?.stockPercentage?.outOfStock || 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Products */}
              {inventoryReport.topProducts && inventoryReport.topProducts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Top 5 Best Sellers</h3>
                  <div className="space-y-2">
                    {inventoryReport.topProducts.slice(0, 5).map((product: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{product.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{product.sold} sold</div>
                          <div className="text-sm text-gray-500">{product.available} in stock</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/admin/inventory/reports"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                  📊
                </div>
                <h3 className="text-lg font-bold">Inventory Reports</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Detailed inventory analytics, stock movements, and value reports.
              </p>
            </Link>

            <Link
              href="/admin/orders"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                  🛒
                </div>
                <h3 className="text-lg font-bold">Order Management</h3>
              </div>
              <p className="text-gray-600 text-sm">
                View, process, and manage customer orders and fulfillment.
              </p>
            </Link>

            <Link
              href="/admin/products"
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                  📦
                </div>
                <h3 className="text-lg font-bold">Product Catalog</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Manage your product listings, pricing, and product information.
              </p>
            </Link>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
