import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/BackButton';

export default function InventoryHistoryPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const [page, setPage] = useState(1);

  // Fetch history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['inventory-history', id, page],
    queryFn: () => adminAPI.getInventoryHistory(id as string, { page, limit: 20 }),
    enabled: !!id && !authLoading,
  });

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading history...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!historyData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">History not found</p>
          <Link href="/admin/inventory" className="text-indigo-600 hover:underline mt-4 inline-block">
            Back to Inventory
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { product, currentStock, alerts, transactions, pagination } = historyData.data;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'restock':
        return '📦';
      case 'sale':
        return '🛒';
      case 'adjustment':
        return '⚙️';
      case 'return':
        return '↩️';
      default:
        return '📋';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'restock':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sale':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'return':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
            <h1 className="text-3xl font-bold">Stock History</h1>
            <p className="text-gray-600 mt-1">Complete transaction history</p>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          {product.images?.[0] && (
            <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={product.images[0]}
                alt={product.name?.en || 'Product'}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Product Details */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {product.name?.en || 'Product'}
            </h2>
            <p className="text-gray-600 mb-3">SKU: {product.sku}</p>

            {/* Current Stock Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-700 mb-1">Available</div>
                <div className="text-2xl font-bold text-green-900">
                  {currentStock.available}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-700 mb-1">Reserved</div>
                <div className="text-2xl font-bold text-yellow-900">
                  {currentStock.reserved}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-700 mb-1">Sold</div>
                <div className="text-2xl font-bold text-blue-900">
                  {currentStock.sold}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-1">Threshold</div>
                <div className="text-2xl font-bold text-gray-900">
                  {alerts.lowStockThreshold}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold">Transaction History</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {transactions.length} of {pagination.total} transactions
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction: any, index: number) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Icon & Type */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${getTransactionColor(transaction.type)}`}>
                      <span className="text-xl">{getTransactionIcon(transaction.type)}</span>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${getTransactionColor(transaction.type)}`}>
                            {transaction.type.toUpperCase()}
                          </span>
                          <span className={`text-lg font-bold ${transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity}
                          </span>
                        </div>

                        <p className="text-gray-900 font-medium mb-1">
                          {transaction.reason}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {transaction.performedBy && (
                            <span>
                              👤 {transaction.performedBy.name || transaction.performedBy.email}
                            </span>
                          )}
                          <span>
                            📅 {new Date(transaction.timestamp).toLocaleString()}
                          </span>
                          {transaction.order && (
                            <Link
                              href={`/admin/orders/${transaction.order}`}
                              className="text-indigo-600 hover:underline"
                            >
                              🛍️ View Order
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📊 Summary:</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-blue-700 mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-blue-900">{pagination.total}</div>
          </div>
          <div>
            <div className="text-blue-700 mb-1">Current Available Stock</div>
            <div className="text-2xl font-bold text-blue-900">{currentStock.available}</div>
          </div>
          <div>
            <div className="text-blue-700 mb-1">Lifetime Sales</div>
            <div className="text-2xl font-bold text-blue-900">{currentStock.sold}</div>
          </div>
        </div>
      </div>
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
