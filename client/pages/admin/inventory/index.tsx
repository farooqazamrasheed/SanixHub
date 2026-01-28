import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI, productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminInventoryUpdates } from '@/hooks/useInventoryUpdates';
import { useProductUpdates } from '@/hooks/useProductUpdates';

export default function AdminInventoryPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [stockValue, setStockValue] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [realtimeUpdate, setRealtimeUpdate] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const queryClient = useQueryClient();

  // Real-time admin inventory updates via WebSocket
  useAdminInventoryUpdates();

  // Real-time product updates via WebSocket
  useProductUpdates((updatedProduct) => {
    console.log('📦 Real-time product update received (inventory view):', updatedProduct);
    queryClient.invalidateQueries({ queryKey: ['admin-products-inventory'] });
  });

  // Listen for real-time bulk update events
  useEffect(() => {
    const socket = require('@/lib/socket').getSocket();
    if (!socket) return;

    const handleBulkComplete = (data: any) => {
      setRealtimeUpdate({
        show: true,
        message: `${data.updated} products updated by another admin`
      });

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setRealtimeUpdate({ show: false, message: '' });
      }, 5000);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-inventory'] });
    };

    const handleProductUpdated = (data: any) => {
      console.log('📦 Product updated in real-time:', data);
      // Refresh inventory data
      queryClient.invalidateQueries({ queryKey: ['admin-products-inventory'] });
    };

    socket.on('inventory:bulk-complete', handleBulkComplete);
    socket.on('inventory:product-updated', handleProductUpdated);

    return () => {
      socket.off('inventory:bulk-complete', handleBulkComplete);
      socket.off('inventory:product-updated', handleProductUpdated);
    };
  }, [queryClient]);

  // Debounce search input - auto-search after 500ms of no typing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Fetch low stock products
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['admin-inventory-low-stock'],
    queryFn: adminAPI.getLowStock,
  });

  // Fetch all products for inventory management
  const { data: allProductsData, isLoading: allProductsLoading } = useQuery({
    queryKey: ['admin-products-inventory'],
    queryFn: () => productsAPI.getAll({ limit: 100 }),
  });

  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: ({ productId, data }: any) =>
      adminAPI.updateInventory(productId, data),
    onSuccess: () => {
      toast.success('Inventory updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-inventory'] });
      setEditingProduct(null);
      setStockValue('');
      setLowStockThreshold('');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update inventory';
      toast.error(errorMessage);
      console.error('Inventory update error:', error);
    },
  });

  const lowStockProducts = lowStockData?.data?.products || [];
  const allProducts = allProductsData?.data?.products || [];

  // Filter products based on search and filters
  const filteredProducts = allProducts.filter((product: any) => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      product.name?.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name?.ur?.includes(searchQuery) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    // Stock filter
    const stock = product.stock || 0;
    const threshold = product.lowStockThreshold || 10;
    let matchesStockFilter = true;

    if (stockFilter === 'out-of-stock') {
      matchesStockFilter = stock === 0;
    } else if (stockFilter === 'low-stock') {
      matchesStockFilter = stock > 0 && stock <= threshold;
    } else if (stockFilter === 'in-stock') {
      matchesStockFilter = stock > threshold;
    }

    return matchesSearch && matchesStockFilter;
  });

  const handleUpdateInventory = (product: any) => {
    setEditingProduct(product);
    setStockValue(product.stock?.toString() || '0');
    setLowStockThreshold(product.lowStockThreshold?.toString() || '10');
  };

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    updateInventoryMutation.mutate({
      productId: editingProduct._id,
      data: {
        stock: Number(stockValue),
        lowStockThreshold: Number(lowStockThreshold),
      },
    });
  };

  const getStockStatus = (product: any) => {
    if (!product.stock || product.stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    }
    if (product.stock <= (product.lowStockThreshold || 10)) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  // Show loading state for auth check
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

  return (
    <AdminLayout>
      {/* Real-time Update Notification */}
      {realtimeUpdate.show && (
        <div className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg p-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold">Real-time Update</p>
              <p className="text-sm text-green-100">{realtimeUpdate.message}</p>
            </div>
            <button
              onClick={() => setRealtimeUpdate({ show: false, message: '' })}
              className="flex-shrink-0 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                LIVE
              </span>
            </div>
            <p className="text-gray-600 mt-1">Monitor and manage product stock levels in real-time</p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Link
              href="/admin/inventory/bulk-update"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              📦 Bulk Update
            </Link>
            <Link
              href="/admin/inventory/import-export"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              📄 Import/Export
            </Link>
            <Link
              href="/admin/inventory/reports"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              📊 Reports
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar - Real-time auto-search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type to search by product name or SKU..."
                className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {allProductsLoading && searchInput && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            {searchInput && (
              <p className="text-xs text-gray-500 mt-1">
                Searching automatically as you type...
              </p>
            )}
          </div>

          {/* Stock Filter */}
          <div className="md:w-64">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setStockFilter('all');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredProducts.length} of {allProducts.length} products
          {searchQuery && ` for "${searchQuery}"`}
        </div>
      </div>

      {/* Inventory Update Modal/Form */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Update Inventory</h2>
            <div className="mb-4">
              <p className="font-semibold">{editingProduct.name?.en}</p>
              <p className="text-sm text-gray-500">SKU: {editingProduct.sku}</p>
            </div>

            <form onSubmit={handleSubmitUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  required
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get alerts when stock falls below this number
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updateInventoryMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setStockValue('');
                    setLowStockThreshold('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} with low stock
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Some products need restocking soon
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Low Stock Alert</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockProducts.map((product: any) => {
                    const status = getStockStatus(product);
                    return (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.images?.[0]?.url && (
                              <div className="flex-shrink-0 h-10 w-10 relative mr-3">
                                <Image
                                  src={product.images[0].url}
                                  alt={product.name?.en}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.name?.en}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{product.stock || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.lowStockThreshold || 10}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateInventory(product)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Update
                            </button>
                            <Link
                              href={`/admin/inventory/history/${product._id}`}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              History
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All Products Inventory */}
      <div>
        <h2 className="text-xl font-bold mb-4">All Products</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {allProductsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading inventory...</p>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p>No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                          <p className="text-lg font-medium">No products found</p>
                          <p className="mt-1">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product: any) => {
                    const status = getStockStatus(product);
                    return (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.images?.[0]?.url && (
                              <div className="flex-shrink-0 h-10 w-10 relative mr-3">
                                <Image
                                  src={product.images[0].url}
                                  alt={product.name?.en}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/admin/products/edit/${product._id}`}
                                className="text-sm font-medium text-gray-900 hover:text-primary-600"
                              >
                                {product.name?.en}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          PKR {product.price?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{product.stock || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateInventory(product)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Update
                            </button>
                            <Link
                              href={`/admin/inventory/history/${product._id}`}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              History
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Feature Cards at Bottom */}
      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <Link
          href="/admin/inventory/bulk-update"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
              📦
            </div>
            <h3 className="text-lg font-bold">Bulk Update</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Update stock levels for multiple products at once. Perfect for supplier deliveries.
          </p>
        </Link>

        <Link
          href="/admin/inventory/import-export"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              📄
            </div>
            <h3 className="text-lg font-bold">Import/Export</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Export inventory to CSV or import bulk updates from spreadsheets.
          </p>
        </Link>

        <Link
          href="/admin/inventory/reports"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
            <h3 className="text-lg font-bold">Reports</h3>
          </div>
          <p className="text-gray-600 text-sm">
            View analytics, insights, and send low stock alerts to admin.
          </p>
        </Link>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin'])),
    },
  };
};
