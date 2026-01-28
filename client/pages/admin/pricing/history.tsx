import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { usePricingStore } from '@/store/usePricingStore';
import { FiArrowLeft, FiClock, FiRotateCcw, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PricingHistory = () => {
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const {
    history = [],
    historyLoading,
    historyPagination,
    loadHistory,
    undoPriceChange,
    loading
  } = usePricingStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadHistory({
        type: filterType === 'all' ? undefined : filterType,
        status: filterStatus || undefined,
        page: 1,
        limit: 20
      });
    }
  }, [mounted, filterType, filterStatus]);

  const handleUndo = async (operationId: string) => {
    if (!confirm('Are you sure you want to undo this price change? All affected products will be reverted to their previous prices.')) {
      return;
    }

    try {
      await undoPriceChange(operationId);
      toast.success('Price change undone successfully!');
      // Reload history
      loadHistory({
        type: filterType === 'all' ? undefined : filterType,
        status: filterStatus || undefined,
        page: historyPagination.page,
        limit: historyPagination.limit
      });
    } catch (error) {
      toast.error('Failed to undo price change');
    }
  };

  const handlePageChange = (page: number) => {
    loadHistory({
      type: filterType === 'all' ? undefined : filterType,
      status: filterStatus || undefined,
      page,
      limit: historyPagination.limit
    });
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/pricing')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Pricing Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📜 Price Change History</h1>
          <p className="text-gray-600">View and manage all past price changes</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="brand">Brand</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="failed">Failed</option>
                <option value="undone">Undone</option>
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (!history || history.length === 0) ? (
            <div className="text-center py-12">
              <FiClock className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No price changes found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Changed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded
                            ${item.type === 'brand' ? 'bg-blue-100 text-blue-700' :
                              item.type === 'category' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'}
                          `}>
                            {item.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.targetName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {item.direction === 'increase' ? '↑' : '↓'} {item.changeValue}
                            {item.changeType === 'percentage' ? '%' : ' USD'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.totalProductsAffected}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{item.changedBy?.name}</div>
                          <div className="text-xs text-gray-500">{item.changedBy?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {mounted ? (
                            <>
                              <div className="text-sm text-gray-900">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.createdAt).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">Loading...</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.canUndo && item.status === 'completed' && (
                            <button
                              onClick={() => handleUndo(item._id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiRotateCcw />
                              Undo
                            </button>
                          )}
                          {item.undoTimeRemaining !== undefined && item.undoTimeRemaining > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Math.floor(item.undoTimeRemaining / 60)}m remaining
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyPagination.pages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing page {historyPagination.page} of {historyPagination.pages} ({historyPagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(historyPagination.page - 1)}
                      disabled={historyPagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(historyPagination.page + 1)}
                      disabled={historyPagination.page === historyPagination.pages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(PricingHistory), { ssr: false });
