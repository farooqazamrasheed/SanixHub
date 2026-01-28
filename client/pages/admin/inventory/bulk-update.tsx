import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI, productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { useInventoryUpdates, useAdminInventoryUpdates } from '@/hooks/useInventoryUpdates';
import { useProductUpdates } from '@/hooks/useProductUpdates';

interface BulkUpdate {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  newStock: number;
  lowStockThreshold?: number;
  updateType?: 'set' | 'increase' | 'decrease';
  adjustmentAmount?: number;
}

export default function BulkUpdateInventoryPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [updates, setUpdates] = useState<BulkUpdate[]>([]);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');
  const [bulkUpdateType, setBulkUpdateType] = useState<'set' | 'increase' | 'decrease'>('set');
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState<number>(0);
  const [bulkThresholdValue, setBulkThresholdValue] = useState<number>(10);
  const [bulkProgress, setBulkProgress] = useState<{show: boolean, current: number, total: number, productName: string}>({
    show: false,
    current: 0,
    total: 0,
    productName: ''
  });

  // Real-time admin inventory updates via WebSocket
  useAdminInventoryUpdates();

  // Additional product updates hook
  useProductUpdates((updatedProduct) => {
    console.log('📦 Real-time product update (bulk update page)');
    queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
  });

  // Listen for bulk progress updates
  useEffect(() => {
    const socket = require('@/lib/socket').getSocket();
    if (!socket) return;

    const handleBulkProgress = (data: any) => {
      setBulkProgress({
        show: true,
        current: data.completed,
        total: data.total,
        productName: data.currentProduct
      });

      // Hide progress when complete
      if (data.completed === data.total) {
        setTimeout(() => {
          setBulkProgress({ show: false, current: 0, total: 0, productName: '' });
        }, 2000);
      }
    };

    socket.on('inventory:bulk-progress', handleBulkProgress);

    return () => {
      socket.off('inventory:bulk-progress', handleBulkProgress);
    };
  }, []);

  // Fetch all products using admin API
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: async () => {
      console.log('🔍 Fetching products for bulk update...');
      const result = await adminAPI.getAllProducts({ limit: 500 });
      console.log('📦 Products API Response:', result);
      console.log('📦 Products Data Structure:', {
        hasSuccess: !!result?.success,
        hasData: !!result?.data,
        hasProducts: !!result?.data?.products,
        productsCount: result?.data?.products?.length || 0,
      });
      return result;
    },
    enabled: !authLoading,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.bulkUpdateInventory(data),
    onSuccess: (response: any) => {
      console.log('✅ Bulk update response:', response);
      
      const result = response.data || response;
      const updated = result.updated || result.success || 0;
      const failed = result.failed || 0;
      const errors = result.errors || [];
      
      if (updated > 0) {
        toast.success(`Successfully updated ${updated} product(s)!`, {
          duration: 4000,
          icon: '✅',
        });
      }
      if (failed > 0) {
        toast.error(`Failed to update ${failed} product(s)`, {
          duration: 5000,
        });
        console.error('Bulk update errors:', errors);
      }
      
      // Refresh all inventory-related queries
      queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
      
      // Clear the queue and reason
      setUpdates([]);
      setReason('');
    },
    onError: (error: any) => {
      console.error('❌ Bulk update error:', error);
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.response?.data?.message ||
                          'Failed to bulk update inventory';
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  // Fix: axios interceptor already unwraps response.data, so productsData is already { success, data }
  const allProducts = productsData?.data?.products || [];
  
  // Helper function to get stock from product
  // Match inventory page logic - use root level stock first
  const getStock = (product: any) => {
    return product.stock || 
           product.inventory?.stockQuantity || 
           product.inventory?.quantity || 0;
  };

  // Helper function to get threshold from product
  // Match inventory page logic - use root level threshold with fallback
  const getThreshold = (product: any) => {
    return product.lowStockThreshold || 
           product.inventory?.lowStockThreshold || 10;
  };
  
  // Debug logging
  console.log('🔍 Bulk Update Debug:', {
    authLoading,
    isLoading,
    hasError: !!error,
    hasProductsData: !!productsData,
    productsDataKeys: productsData ? Object.keys(productsData) : [],
    allProductsLength: allProducts.length,
  });

  // Debug: Log stock statistics
  const stockStats = {
    total: allProducts.length,
    lowStock: allProducts.filter((p: any) => {
      const stock = getStock(p);
      const threshold = getThreshold(p);
      return stock > 0 && stock <= threshold;
    }).length,
    outOfStock: allProducts.filter((p: any) => getStock(p) === 0).length,
    inStock: allProducts.filter((p: any) => {
      const stock = getStock(p);
      const threshold = getThreshold(p);
      return stock > threshold;
    }).length,
  };
  
  console.log('📊 Stock Statistics:', stockStats);
  console.log('📊 Sample Products (first 3):', allProducts.slice(0, 3).map((p: any) => ({
    name: p.name?.en,
    stock: getStock(p),
    threshold: getThreshold(p),
    isLowStock: getStock(p) > 0 && getStock(p) <= getThreshold(p),
  })));

  // Filter products based on search and status
  const filteredProducts = allProducts.filter((product: any) => {
    const matchesSearch = searchQuery === '' ||
      product.name?.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const stock = getStock(product);
    const threshold = getThreshold(product);
    
    if (filterStatus === 'low') {
      const isLowStock = stock > 0 && stock <= threshold;
      // Debug log for low stock filter
      if (allProducts.indexOf(product) < 3) {
        console.log(`🔍 Low Stock Filter Debug [${product.name?.en}]:`, {
          stock,
          threshold,
          isLowStock,
          condition: `${stock} > 0 && ${stock} <= ${threshold}`,
        });
      }
      return isLowStock;
    } else if (filterStatus === 'out') {
      return stock === 0;
    }
    
    return true;
  });

  const handleAddToUpdate = (product: any) => {
    // Check if already added
    if (updates.find(u => u.productId === product._id)) {
      toast.error('Product already added to update list');
      return;
    }

    const stock = getStock(product);
    const threshold = getThreshold(product);
    
    setUpdates([
      ...updates,
      {
        productId: product._id,
        productName: product.name?.en || 'Unknown',
        sku: product.sku || 'N/A',
        currentStock: stock,
        newStock: stock,
        lowStockThreshold: threshold,
        updateType: 'set',
        adjustmentAmount: 0,
      },
    ]);
  };

  const handleAddAllFiltered = () => {
    const newUpdates = filteredProducts
      .filter((product: any) => !updates.find(u => u.productId === product._id))
      .map((product: any) => {
        const stock = getStock(product);
        const threshold = getThreshold(product);
        
        return {
          productId: product._id,
          productName: product.name?.en || 'Unknown',
          sku: product.sku || 'N/A',
          currentStock: stock,
          newStock: stock,
          lowStockThreshold: threshold,
          updateType: 'set' as const,
          adjustmentAmount: 0,
        };
      });
    
    if (newUpdates.length === 0) {
      toast.error('All filtered products are already added');
      return;
    }
    
    setUpdates([...updates, ...newUpdates]);
    toast.success(`Added ${newUpdates.length} products to update queue`);
  };

  const handleApplyBulkAdjustment = () => {
    if (updates.length === 0) {
      toast.error('No products in update queue');
      return;
    }

    setUpdates(updates.map(u => {
      let newStock = u.currentStock;
      
      if (bulkUpdateType === 'set') {
        newStock = bulkAdjustmentValue;
      } else if (bulkUpdateType === 'increase') {
        newStock = u.currentStock + bulkAdjustmentValue;
      } else if (bulkUpdateType === 'decrease') {
        newStock = Math.max(0, u.currentStock - bulkAdjustmentValue);
      }
      
      return {
        ...u,
        newStock,
        updateType: bulkUpdateType,
        adjustmentAmount: bulkAdjustmentValue,
      };
    }));
    
    toast.success(`Applied ${bulkUpdateType} adjustment to ${updates.length} products`);
  };

  const handleApplyBulkThreshold = () => {
    if (updates.length === 0) {
      toast.error('No products in update queue');
      return;
    }

    setUpdates(updates.map(u => ({
      ...u,
      lowStockThreshold: bulkThresholdValue,
    })));
    
    toast.success(`Applied threshold ${bulkThresholdValue} to ${updates.length} products`);
  };

  const handleClearAll = () => {
    if (confirm(`Remove all ${updates.length} products from update queue?`)) {
      setUpdates([]);
      toast.success('Update queue cleared');
    }
  };

  const handleRemoveFromUpdate = (productId: string) => {
    setUpdates(updates.filter(u => u.productId !== productId));
  };

  const handleUpdateValue = (productId: string, field: string, value: number) => {
    // Validate: prevent negative values
    if (value < 0) {
      toast.error('Stock value cannot be negative');
      return;
    }
    
    // Validate: prevent unreasonably high values
    if (value > 999999) {
      toast.error('Stock value too high (max: 999,999)');
      return;
    }
    
    setUpdates(
      updates.map(u =>
        u.productId === productId ? { ...u, [field]: value } : u
      )
    );
  };

  const handleSubmitBulkUpdate = () => {
    if (updates.length === 0) {
      toast.error('Please add at least one product to update');
      return;
    }

    const payload = {
      updates: updates.map(u => ({
        productId: u.productId,
        stock: u.newStock,
        lowStockThreshold: u.lowStockThreshold,
      })),
      reason: reason.trim() || 'Bulk stock update', // Optional with default
    };

    bulkUpdateMutation.mutate(payload);
  };

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
            {isLoading && !authLoading && (
              <p className="mt-2 text-sm text-gray-500">Fetching inventory data...</p>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to Load Products</h2>
            <p className="text-gray-600 mb-4">
              {(error as any)?.message || 'Unable to fetch products from the server.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-4">
              <p className="text-sm text-red-800 font-mono">
                {JSON.stringify(error, null, 2)}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show warning if no products found
  if (!isLoading && allProducts.length === 0) {
    return (
      <AdminLayout>
        <div className="mb-4">
          <BackButton href="/admin/inventory" label="Back to Inventory" variant="primary" />
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-yellow-600 text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h2>
            <p className="text-gray-600 mb-4">
              There are no products in the system to update. Please add some products first.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Debug Info:</strong><br/>
                Auth Loading: {authLoading ? 'Yes' : 'No'}<br/>
                Data Loading: {isLoading ? 'Yes' : 'No'}<br/>
                Products Data: {productsData ? 'Exists' : 'Null'}<br/>
                Products Array: {allProducts ? 'Exists' : 'Null'}
              </p>
            </div>
            <Link href="/admin/products/create">
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Add Products
              </button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin/inventory" label="Back to Inventory" variant="primary" />
      </div>

      {/* Real-time Progress Indicator */}
      {bulkProgress.show && (
        <div className="mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              <div>
                <div className="font-semibold text-lg">
                  Updating Products... {bulkProgress.current}/{bulkProgress.total}
                </div>
                <div className="text-sm text-indigo-100">
                  Currently updating: {bulkProgress.productName}
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📦 Bulk Stock Update</h1>
            <p className="text-gray-600 mt-1">Update multiple products at once with ease</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{allProducts.length}</div>
              <div className="text-xs text-gray-500">Total Products</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-600">
                {allProducts.filter((p: any) => {
                  const stock = getStock(p);
                  const threshold = getThreshold(p);
                  return stock > 0 && stock <= threshold;
                }).length}
              </div>
              <div className="text-xs text-gray-500">Low Stock</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">
                {allProducts.filter((p: any) => getStock(p) === 0).length}
              </div>
              <div className="text-xs text-gray-500">Out of Stock</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Product Selection */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              🔍 Select Products
            </h2>
            <button
              onClick={handleAddAllFiltered}
              disabled={filteredProducts.length === 0}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              ✓ Add All ({filteredProducts.length})
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setFilterStatus('low')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'low'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilterStatus('out')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'out'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Out of Stock
            </button>
          </div>

          {/* Product List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-gray-500 font-medium">No products found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredProducts.map((product: any) => {
                const stock = getStock(product);
                const threshold = getThreshold(product);
                const isLowStock = stock > 0 && stock <= threshold;
                const isOutOfStock = stock === 0;
                
                return (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{product.name?.en}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className={`text-xs font-semibold ${
                          isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {isOutOfStock ? '⚠️ Out of Stock' : isLowStock ? '⚡ Low Stock: ' + stock : '✓ Stock: ' + stock}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToUpdate(product)}
                      disabled={updates.some(u => u.productId === product._id)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                      {updates.some(u => u.productId === product._id) ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Update Queue */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              📝 Update Queue 
              {updates.length > 0 && (
                <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                  {updates.length}
                </span>
              )}
            </h2>
            {updates.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-all"
              >
                🗑️ Clear All
              </button>
            )}
          </div>

          {updates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p>No products added yet</p>
              <p className="text-sm mt-1">Add products from the left panel</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  ⚡ Bulk Actions
                </h3>
                
                {/* Stock Adjustment */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Adjust Stock for All Products
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={bulkUpdateType}
                      onChange={(e) => setBulkUpdateType(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="set">Set to</option>
                      <option value="increase">Increase by</option>
                      <option value="decrease">Decrease by</option>
                    </select>
                    <input
                      type="number"
                      value={bulkAdjustmentValue}
                      onChange={(e) => setBulkAdjustmentValue(parseInt(e.target.value) || 0)}
                      min="0"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter value"
                    />
                    <button
                      onClick={handleApplyBulkAdjustment}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Threshold Adjustment */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Set Low Stock Threshold for All
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bulkThresholdValue}
                      onChange={(e) => setBulkThresholdValue(parseInt(e.target.value) || 10)}
                      min="0"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Threshold value"
                    />
                    <button
                      onClick={handleApplyBulkThreshold}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Update List */}
              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {updates.map((update) => (
                  <div
                    key={update.productId}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-800">{update.productName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">SKU: {update.sku}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromUpdate(update.productId)}
                        className="text-red-600 hover:text-white hover:bg-red-600 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Current Stock
                        </label>
                        <input
                          type="number"
                          value={update.currentStock}
                          disabled
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          New Stock *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={update.newStock}
                            onChange={(e) =>
                              handleUpdateValue(
                                update.productId,
                                'newStock',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500 ${
                              update.newStock !== update.currentStock
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-300'
                            }`}
                          />
                          {update.newStock !== update.currentStock && (
                            <div className="absolute -right-1 -top-1">
                              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-indigo-600 rounded-full">
                                {update.newStock > update.currentStock ? '↑' : '↓'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Show change indicator */}
                    {update.newStock !== update.currentStock && (
                      <div className="mt-2 text-xs">
                        <span className={`font-medium ${
                          update.newStock > update.currentStock ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {update.newStock > update.currentStock ? '+' : ''}
                          {update.newStock - update.currentStock} units
                        </span>
                      </div>
                    )}

                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        value={update.lowStockThreshold}
                        onChange={(e) =>
                          handleUpdateValue(
                            update.productId,
                            'lowStockThreshold',
                            parseInt(e.target.value) || 10
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Update <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Monthly supplier restock, Physical count adjustment (optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default reason
                </p>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitBulkUpdate}
                disabled={bulkUpdateMutation.isPending || updates.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                {bulkUpdateMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  `🚀 Update ${updates.length} Product${updates.length > 1 ? 's' : ''}`
                )}
              </button>
            </>
          )}
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
