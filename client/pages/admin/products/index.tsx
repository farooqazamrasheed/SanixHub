import { GetServerSideProps } from 'next';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import BulkActions from '@/components/admin/BulkActions';
import AdvancedFilters from '@/components/admin/AdvancedFilters';
import LoadingSkeleton from '@/components/admin/LoadingSkeleton';
import { productsAPI, adminAPI, categoriesAPI } from '@/lib/api';
import { exportToCSV, formatProductsForExport } from '@/utils/exportUtils';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProductUpdates } from '@/hooks/useProductUpdates';
import { useDebounce } from '@/hooks/useDebounce';
import { useSocket } from '@/hooks/useSocket';
import { useAnimationClasses } from '@/store/useAnimationPreferences';

export default function AdminProductsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatedProducts, setUpdatedProducts] = useState<Set<string>>(new Set());
  const [newProducts, setNewProducts] = useState<Set<string>>(new Set());
  const [deletedProducts, setDeletedProducts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const previousProductsRef = useRef<any[]>([]);
  
  // Debounce search term to reduce API calls
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  // Initialize Socket.IO connection
  const { socket } = useSocket();
  
  // Get animation preferences
  const {
    getAnimationClass,
    getRowHighlightClass,
    getGlowClass,
    shouldShowBadge,
    shouldAnimateToast,
  } = useAnimationClasses();

  // Real-time product updates via WebSocket
  useProductUpdates((updatedProduct) => {
    console.log('📦 Real-time product update received:', updatedProduct);
    
    // Invalidate and refetch products list
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    
    // Show notification
    toast.success(`Product "${updatedProduct.name?.en || 'Product'}" updated`);
  });

  // Fetch products with debounced search
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-products', page, debouncedSearch, filters],
    queryFn: () => productsAPI.getAll({ 
      page, 
      limit: 20, 
      search: debouncedSearch,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      featured: filters.featured,
      sort: filters.sort,
    }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    keepPreviousData: true, // Keep previous data while fetching new
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: adminAPI.bulkDeleteProducts,
    onSuccess: (response) => {
      toast.success(response.data.message);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => {
      toast.error('Failed to delete products');
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: adminAPI.bulkUpdateProducts,
    onSuccess: (response) => {
      toast.success(response.data.message);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => {
      toast.error('Failed to update products');
    },
  });

  const products = data?.data?.products || [];
  const pagination = data?.data?.pagination || {};
  const categories = categoriesData?.data?.categories || [];

  const categoryOptions = useMemo(() => 
    categories.map((cat: any) => ({
      label: cat.name.en,
      value: cat._id,
    })),
    [categories]
  );

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} product(s)?`)) {
      bulkDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const handleBulkActivate = () => {
    bulkUpdateMutation.mutate({ ids: selectedIds, updates: { isActive: true } });
  };

  const handleBulkDeactivate = () => {
    bulkUpdateMutation.mutate({ ids: selectedIds, updates: { isActive: false } });
  };

  const handleBulkFeature = () => {
    if (confirm(`Mark ${selectedIds.length} product(s) as featured?`)) {
      bulkUpdateMutation.mutate({ ids: selectedIds, updates: { isFeatured: true } });
    }
  };

  const handleBulkUnfeature = () => {
    if (confirm(`Remove featured status from ${selectedIds.length} product(s)?`)) {
      bulkUpdateMutation.mutate({ ids: selectedIds, updates: { isFeatured: false } });
    }
  };

  const handleBulkChangeCategory = () => {
    const categoryId = prompt('Enter Category ID to assign to selected products:');
    if (categoryId) {
      bulkUpdateMutation.mutate({ ids: selectedIds, updates: { category: categoryId } });
    }
  };

  const handleExport = () => {
    const formattedProducts = formatProductsForExport(products);
    exportToCSV(formattedProducts, `products-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Products exported successfully');
  };

  const handleExportSelected = () => {
    const selectedProducts = products.filter((p: any) => selectedIds.includes(p._id));
    const formattedProducts = formatProductsForExport(selectedProducts);
    exportToCSV(formattedProducts, `selected-products-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Selected products exported successfully');
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p: any) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  // Handle filter changes with search term
  const handleFilterChange = useCallback((newFilters: any) => {
    if (newFilters.search !== undefined) {
      setSearchTerm(newFilters.search);
      // Remove search from filters object as it's handled separately
      const { search, ...restFilters } = newFilters;
      setFilters(restFilters);
    } else {
      setFilters(newFilters);
    }
    setPage(1); // Reset to first page on filter change
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({});
    setPage(1);
    toast.success('Filters cleared');
  }, []);

  // Duplicate product
  const handleDuplicate = useCallback(async (productId: string, productName: string) => {
    // Confirm duplication
    if (!confirm(`Duplicate "${productName}"?\n\nThis will create a copy with:\n• Modified name (with "Copy" suffix)\n• New SKU (with "-COPY" suffix)\n• Inactive status`)) {
      return;
    }

    try {
      const { data: productData } = await adminAPI.getProductById(productId);
      const product = productData.data.product;
      
      // Create duplicate with modified name and SKU
      const timestamp = Date.now();
      const newProduct = {
        ...product,
        _id: undefined,
        productId: undefined,
        name: { 
          en: `${product.name.en} (Copy)`, 
          ur: `${product.name.ur} (کاپی)` 
        },
        slug: `${product.slug}-copy-${timestamp}`,
        sku: `${product.sku}-COPY-${timestamp.toString().slice(-4)}`, // Add timestamp to avoid SKU conflicts
        isActive: false, // Set as inactive by default
        isFeatured: false, // Reset featured status
      };
      
      await adminAPI.createProduct(newProduct);
      toast.success(`✅ Product duplicated successfully!\n"${productName}" → "${newProduct.name.en}"`, {
        duration: 4000
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to duplicate product';
      toast.error(`❌ ${errorMsg}`);
      console.error('Duplicate error:', error);
    }
  }, [queryClient]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!socket) return;

    // Listen for product created
    socket.on('product:created', (data: any) => {
      console.log('🔴 LIVE: Product created', data);
      
      // Add to new products set for animation
      setNewProducts(prev => new Set(prev).add(data.product._id));
      setTimeout(() => {
        setNewProducts(prev => {
          const updated = new Set(prev);
          updated.delete(data.product._id);
          return updated;
        });
      }, 5000);
      
      // Refresh products list
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      
      // Show notification with custom styling
      if (shouldAnimateToast()) {
        toast.success(
          <div className="flex items-center gap-3">
            <div className="text-2xl">🆕</div>
            <div>
              <p className="font-semibold">New Product Added</p>
              <p className="text-sm opacity-90">{data.product.name.en}</p>
            </div>
          </div>,
          {
            duration: 5000,
            style: {
              background: '#10b981',
              color: 'white',
              padding: '16px',
              borderRadius: '10px',
            },
          }
        );
      } else {
        toast.success(`New product added: ${data.product.name.en}`);
      }
    });

    // Listen for product updated
    socket.on('product:updated', (data: any) => {
      console.log('🔴 LIVE: Product updated', data);
      
      // Add to updated products set for animation
      setUpdatedProducts(prev => new Set(prev).add(data.product._id));
      setTimeout(() => {
        setUpdatedProducts(prev => {
          const updated = new Set(prev);
          updated.delete(data.product._id);
          return updated;
        });
      }, 5000);
      
      // Update specific product in cache
      queryClient.setQueryData(
        ['admin-products', page, debouncedSearch, filters],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              products: oldData.data.products.map((p: any) =>
                p._id === data.product._id ? data.product : p
              ),
            },
          };
        }
      );
      
      // Show notification with details
      const changes = [];
      if (data.changes?.priceChanged) changes.push('Price');
      if (data.changes?.stockChanged) changes.push('Stock');
      
      toast.success(
        <div className="flex items-center gap-3">
          <div className="text-2xl">📝</div>
          <div>
            <p className="font-semibold">Product Updated</p>
            <p className="text-sm opacity-90">{data.product.name.en}</p>
            {changes.length > 0 && (
              <p className="text-xs opacity-75 mt-1">Changed: {changes.join(', ')}</p>
            )}
          </div>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#3b82f6',
            color: 'white',
            padding: '16px',
            borderRadius: '10px',
          },
        }
      );
    });

    // Listen for product deleted
    socket.on('product:deleted', (data: any) => {
      console.log('🔴 LIVE: Product deleted', data);
      
      // Add to deleted products set for animation
      setDeletedProducts(prev => new Set(prev).add(data.productId));
      
      // Remove after animation
      setTimeout(() => {
        setDeletedProducts(prev => {
          const updated = new Set(prev);
          updated.delete(data.productId);
          return updated;
        });
        
        // Refresh list after animation
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      }, 1000);
      
      // Show notification
      toast.error(
        <div className="flex items-center gap-3">
          <div className="text-2xl">🗑️</div>
          <div>
            <p className="font-semibold">Product Deleted</p>
            <p className="text-sm opacity-90">{data.productName?.en || 'A product'}</p>
          </div>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#ef4444',
            color: 'white',
            padding: '16px',
            borderRadius: '10px',
          },
        }
      );
    });

    // Listen for bulk updates
    socket.on('products:bulkUpdated', (data: any) => {
      console.log('🔴 LIVE: Bulk products updated', data);
      
      // Mark all as updated
      data.productIds?.forEach((id: string) => {
        setUpdatedProducts(prev => new Set(prev).add(id));
      });
      
      // Clear after animation
      setTimeout(() => {
        setUpdatedProducts(new Set());
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      }, 5000);
      
      toast.success(
        <div className="flex items-center gap-3">
          <div className="text-2xl">📦</div>
          <div>
            <p className="font-semibold">Bulk Update Complete</p>
            <p className="text-sm opacity-90">{data.count} products updated</p>
          </div>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#8b5cf6',
            color: 'white',
            padding: '16px',
            borderRadius: '10px',
          },
        }
      );
    });

    // Listen for inventory updates
    socket.on('inventory:updated', (data: any) => {
      console.log('🔴 LIVE: Inventory updated', data);
      
      setUpdatedProducts(prev => new Set(prev).add(data.productId));
      setTimeout(() => {
        setUpdatedProducts(prev => {
          const updated = new Set(prev);
          updated.delete(data.productId);
          return updated;
        });
      }, 3000);
      
      // Update in cache
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    });

    return () => {
      socket.off('product:created');
      socket.off('product:updated');
      socket.off('product:deleted');
      socket.off('products:bulkUpdated');
      socket.off('inventory:updated');
    };
  }, [socket, queryClient, page, debouncedSearch, filters]);

  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (pagination.pages > page) {
      queryClient.prefetchQuery({
        queryKey: ['admin-products', page + 1, debouncedSearch, filters],
        queryFn: () => productsAPI.getAll({ 
          page: page + 1, 
          limit: 20, 
          search: debouncedSearch,
          ...filters 
        }),
      });
    }
  }, [page, debouncedSearch, filters, pagination.pages, queryClient]);

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
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/admin/products/bulk-update-all" 
            className="btn btn-outline flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Bulk Update All
          </Link>
          <Link href="/admin/products/create" className="btn btn-primary">
            + Add New Product
          </Link>
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        onFilterChange={handleFilterChange}
        categories={categoryOptions}
        showExport={true}
        onExport={handleExport}
      />
      
      {/* Filter indicators and clear button */}
      {(searchTerm || Object.keys(filters).length > 0) && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Category
              <button
                onClick={() => setFilters({ ...filters, category: undefined })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.featured && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Featured
              <button
                onClick={() => setFilters({ ...filters, featured: undefined })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onFeature={handleBulkFeature}
        onUnfeature={handleBulkUnfeature}
        onExport={handleExportSelected}
        isLoading={bulkDeleteMutation.isPending || bulkUpdateMutation.isPending}
      />

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Loading indicator for background fetching */}
        {isFetching && !isLoading && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            Updating products...
          </div>
        )}
        
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton type="table" rows={10} />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 mb-4">No products found</p>
            <Link href="/admin/products/create" className="btn btn-primary">
              Add Your First Product
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === products.length && products.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product: any) => {
                    const isNew = newProducts.has(product._id);
                    const isUpdated = updatedProducts.has(product._id);
                    const isDeleted = deletedProducts.has(product._id);
                    
                    return (
                    <tr 
                      key={product._id} 
                      className={`
                        border-b hover:bg-gray-50 transition-all duration-300
                        ${isNew ? `${getRowHighlightClass('new')} ${getAnimationClass('new', 'product')}` : ''}
                        ${isUpdated ? `${getRowHighlightClass('updated')} ${getAnimationClass('updated', 'product')}` : ''}
                        ${isDeleted ? `${getRowHighlightClass('deleted')} ${getAnimationClass('deleted', 'product')}` : ''}
                      `}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product._id)}
                          onChange={(e) => handleSelectOne(product._id, e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm text-gray-900 font-semibold">
                            {product.productId || 'N/A'}
                          </div>
                          {shouldShowBadge() && isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white live-badge shadow-lg">
                              🆕 NEW
                            </span>
                          )}
                          {shouldShowBadge() && isUpdated && !isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white live-badge shadow-lg">
                              🔴 LIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`relative w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0 ${
                            isNew ? getGlowClass('new') : ''
                          } ${
                            isUpdated ? getGlowClass('updated') : ''
                          }`}>
                            {product.images[0]?.url && (
                              <Image
                                src={product.images[0].url}
                                alt={product.name.en}
                                fill
                                className="object-contain p-1"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name.en}</p>
                            <p className="text-sm text-gray-500 font-urdu">{product.name.ur}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{product.sku}</td>
                      <td className="px-6 py-4 text-sm">{product.category?.name?.en || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`${product.brand ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {product.brand || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`${product.size ? 'text-gray-900' : 'text-gray-400'}`}>
                          {product.size || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-semibold">
                            PKR {(product.pricing.salePrice || product.pricing.basePrice).toLocaleString()}
                          </p>
                          {product.pricing.salePrice && (
                            <p className="text-gray-400 line-through text-xs">
                              PKR {product.pricing.basePrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-semibold ${
                            (product.inventory?.stockQuantity || 0) === 0
                              ? 'text-red-600'
                              : (product.inventory?.stockQuantity || 0) <= (product.inventory?.lowStockThreshold || 10)
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}
                        >
                          {product.inventory?.stockQuantity || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Product"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/admin/products/edit/${product._id}`}
                            className="text-green-600 hover:text-green-800"
                            title="Edit Product"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDuplicate(product._id, product.name.en)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Duplicate Product"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product._id, product.name.en)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Product"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{' '}
                  {pagination.total} products
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn btn-outline text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.pages}
                    className="btn btn-outline text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
