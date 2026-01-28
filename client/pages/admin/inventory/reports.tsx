import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useInventoryUpdates } from '@/hooks/useInventoryUpdates';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function InventoryReportsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  
  // Real-time inventory updates
  useInventoryUpdates(() => {
    console.log('📦 Inventory update (reports)');
    queryClient.invalidateQueries({ queryKey: ['inventory-report'] });
  });
  
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  
  // Pagination state for detailed view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-report', dateRange],
    queryFn: () => {
      const params: any = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      return adminAPI.getInventoryReports(params);
    },
    enabled: !authLoading,
  });

  // Trigger alert mutation
  const alertMutation = useMutation({
    mutationFn: () => adminAPI.triggerLowStockAlert(),
    onSuccess: (response: any) => {
      const result = response.data;
      if (result.emailSent) {
        toast.success(`Alert sent! ${result.count} low stock product(s)`);
      } else if (result.alreadySent) {
        toast('Alert was already sent recently (within 24 hours)', { icon: 'ℹ️' });
      } else {
        toast('No low stock products or email not configured', { icon: '⚠️' });
      }
    },
    onError: (error: any) => {
      toast.error('Failed to send alert');
      console.error(error);
    },
  });

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateReport = () => {
    refetch();
    toast.success('Report refreshed!');
  };

  const handleClearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
    setTimeout(() => refetch(), 100);
  };

  // Pagination helper functions
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to table top
    document.getElementById('detailed-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const report = reportData?.data;

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin/inventory" label="Back to Inventory" variant="primary" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Reports</h1>
            <p className="text-gray-600 mt-1">Analytics and insights</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter & Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleGenerateReport}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Generate Report
            </button>
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={handleClearDateRange}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Products</h3>
                <span className="text-2xl">📦</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {report.summary.totalProducts}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-green-700">In Stock</h3>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-3xl font-bold text-green-900">
                {report.summary.inStock}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {report.summary.stockPercentage.inStock}% of total
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-yellow-700">Low Stock</h3>
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {report.summary.lowStock}
              </div>
              <div className="text-sm text-yellow-600 mt-1">
                {report.summary.stockPercentage.lowStock}% of total
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-700">Out of Stock</h3>
                <span className="text-2xl">❌</span>
              </div>
              <div className="text-3xl font-bold text-red-900">
                {report.summary.outOfStock}
              </div>
              <div className="text-sm text-red-600 mt-1">
                {report.summary.stockPercentage.outOfStock}% of total
              </div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-8 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium mb-2 opacity-90">Total Inventory Value</h3>
                <div className="text-4xl font-bold">
                  Rs. {report.summary.totalValue.toLocaleString()}
                </div>
              </div>
              <div className="text-6xl opacity-75">💰</div>
            </div>
          </div>

          {/* Stock Distribution Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Stock Distribution</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart Visualization */}
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Simple CSS Pie Chart */}
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* In Stock - Green */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10B981"
                      strokeWidth="20"
                      strokeDasharray={`${report.summary.stockPercentage.inStock * 2.51} 251.2`}
                      strokeDashoffset="0"
                    />
                    {/* Low Stock - Orange */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#F59E0B"
                      strokeWidth="20"
                      strokeDasharray={`${report.summary.stockPercentage.lowStock * 2.51} 251.2`}
                      strokeDashoffset={`-${report.summary.stockPercentage.inStock * 2.51}`}
                    />
                    {/* Out of Stock - Red */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#EF4444"
                      strokeWidth="20"
                      strokeDasharray={`${report.summary.stockPercentage.outOfStock * 2.51} 251.2`}
                      strokeDashoffset={`-${(report.summary.stockPercentage.inStock + report.summary.stockPercentage.lowStock) * 2.51}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{report.summary.totalProducts}</div>
                      <div className="text-sm text-gray-600">Products</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium">In Stock</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-900">{report.summary.inStock}</div>
                    <div className="text-sm text-green-600">{report.summary.stockPercentage.inStock}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="font-medium">Low Stock</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-900">{report.summary.lowStock}</div>
                    <div className="text-sm text-orange-600">{report.summary.stockPercentage.lowStock}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="font-medium">Out of Stock</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-900">{report.summary.outOfStock}</div>
                    <div className="text-sm text-red-600">{report.summary.stockPercentage.outOfStock}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Transaction Analysis</h2>
            <div className="text-sm text-gray-600 mb-4">
              {report.transactions.period === 'all-time'
                ? 'All-time transactions'
                : `From ${report.transactions.period.startDate} to ${report.transactions.period.endDate}`}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {report.transactions.total}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">📦 Restocks</div>
                <div className="text-2xl font-bold text-green-900">
                  {report.transactions.byType.restock}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-1">🛒 Sales</div>
                <div className="text-2xl font-bold text-blue-900">
                  {report.transactions.byType.sale}
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-700 mb-1">↩️ Returns</div>
                <div className="text-2xl font-bold text-purple-900">
                  {report.transactions.byType.return}
                </div>
              </div>
            </div>

            {/* Transaction Type Bar Chart */}
            {report.transactions.total > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Transaction Breakdown</h3>
                
                {/* Restocks */}
                {report.transactions.byType.restock > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">📦 Restocks</span>
                      <span className="text-sm text-gray-600">
                        {report.transactions.byType.restock} ({Math.round((report.transactions.byType.restock / report.transactions.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(report.transactions.byType.restock / report.transactions.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Sales */}
                {report.transactions.byType.sale > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">🛒 Sales</span>
                      <span className="text-sm text-gray-600">
                        {report.transactions.byType.sale} ({Math.round((report.transactions.byType.sale / report.transactions.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(report.transactions.byType.sale / report.transactions.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Returns */}
                {report.transactions.byType.return > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">↩️ Returns</span>
                      <span className="text-sm text-gray-600">
                        {report.transactions.byType.return} ({Math.round((report.transactions.byType.return / report.transactions.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(report.transactions.byType.return / report.transactions.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Adjustments */}
                {report.transactions.byType.adjustment > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">🔧 Adjustments</span>
                      <span className="text-sm text-gray-600">
                        {report.transactions.byType.adjustment} ({Math.round((report.transactions.byType.adjustment / report.transactions.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-gray-400 to-gray-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(report.transactions.byType.adjustment / report.transactions.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {report.transactions.total === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found for the selected period</p>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Top 10 Best Selling Products</h2>
            
            {report.topProducts && report.topProducts.length > 0 ? (
              <>
                {/* Visual Bar Chart */}
                <div className="mb-8 space-y-4">
                  {report.topProducts.map((product: any, index: number) => {
                    const maxSold = report.topProducts[0]?.sold || 1;
                    const percentage = (product.sold / maxSold) * 100;
                    const colors = [
                      'from-yellow-400 to-yellow-600',
                      'from-gray-400 to-gray-600',
                      'from-orange-400 to-orange-600',
                      'from-blue-400 to-blue-600',
                      'from-indigo-400 to-indigo-600',
                      'from-purple-400 to-purple-600',
                      'from-pink-400 to-pink-600',
                      'from-red-400 to-red-600',
                      'from-green-400 to-green-600',
                      'from-teal-400 to-teal-600'
                    ];

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-200 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-indigo-100 text-indigo-800'
                            } font-bold text-sm`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {product.name || 'Unknown Product'}
                              </div>
                              <div className="text-xs text-gray-500">{product.sku}</div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-bold text-blue-600">{product.sold} sold</div>
                            <div className="text-xs text-gray-500">{product.available} available</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className={`bg-gradient-to-r ${colors[index]} h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            {percentage > 15 && (
                              <span className="text-xs font-bold text-white">
                                {percentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detailed Table */}
                <div className="mt-6" id="detailed-table">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Detailed View</h3>
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, report.topProducts.length)} of {report.topProducts.length} products
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Product ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Brand
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Size
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Sold
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Available
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getPaginatedData(report.topProducts).map((product: any, index: number) => {
                          const actualIndex = (currentPage - 1) * itemsPerPage + index;
                          return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                actualIndex === 0 ? 'bg-yellow-100 text-yellow-800' :
                                actualIndex === 1 ? 'bg-gray-200 text-gray-700' :
                                actualIndex === 2 ? 'bg-orange-100 text-orange-800' :
                                'bg-indigo-100 text-indigo-800'
                              }`}>
                                {actualIndex + 1}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {product.productId || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500 font-mono">{product.sku}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-700">
                                {product.brand || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {product.category || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600">
                                {product.size || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-medium text-gray-900">
                                Rs. {product.price?.toLocaleString() || '0'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-blue-600">{product.sold}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-green-600">{product.available}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              {product.available === 0 ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Out of Stock
                                </span>
                              ) : product.available < 10 ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {report.topProducts.length > itemsPerPage && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === getTotalPages(report.topProducts.length)}
                          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, report.topProducts.length)}</span> of{' '}
                            <span className="font-medium">{report.topProducts.length}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            {/* Previous Button */}
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Page Numbers */}
                            {Array.from({ length: getTotalPages(report.topProducts.length) }, (_, i) => i + 1).map((page) => {
                              const totalPages = getTotalPages(report.topProducts.length);
                              // Show first, last, current, and adjacent pages
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                      page === currentPage
                                        ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                );
                              } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                              ) {
                                return (
                                  <span
                                    key={page}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                                  >
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            })}

                            {/* Next Button */}
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === getTotalPages(report.topProducts.length)}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No sales data available yet</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => alertMutation.mutate()}
                disabled={alertMutation.isPending}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-medium transition-colors"
              >
                {alertMutation.isPending ? 'Sending...' : '📧 Send Low Stock Alert'}
              </button>
              <Link
                href="/admin/inventory/import-export"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center font-medium transition-colors"
              >
                📥 Export Report Data
              </Link>
            </div>
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
