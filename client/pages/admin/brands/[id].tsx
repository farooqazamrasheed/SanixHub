import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import toast from 'react-hot-toast';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { 
  FiEdit2, FiTrash2, FiPlus, FiSearch, 
  FiPackage, FiTrendingUp, FiDollarSign, FiShoppingCart,
  FiX, FiCheck
} from 'react-icons/fi';

interface Product {
  _id: string;
  productId: string;
  name: { en: string; ur?: string };
  sku: string;
  price: number;
  inventory: { stockQuantity: number };
  category?: { name: { en: string } };
  image?: string;
  isActive: boolean;
}

export default function BrandDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchProducts, setSearchProducts] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'in' | 'low' | 'out'>('all');

  // Fetch brand details
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: ['admin-brand', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch brand');
      return res.json();
    },
    enabled: !authLoading && !!id
  });

  // Fetch brand products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}/products`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: !authLoading && !!id
  });

  // Fetch available products (not assigned to this brand)
  const { data: availableProductsData, isLoading: availableLoading } = useQuery({
    queryKey: ['available-products', id, searchProducts],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchProducts) params.append('search', searchProducts);
      params.append('excludeBrand', id as string);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch available products');
      return res.json();
    },
    enabled: showAssignModal && !authLoading && !!id
  });

  // Fetch brand analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['brand-analytics', id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !authLoading && !!id
  });

  // Assign products mutation
  const assignMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}/assign-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({ productIds })
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to assign products');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Products assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['brand-products', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand', id] });
      queryClient.invalidateQueries({ queryKey: ['brand-analytics', id] });
      setShowAssignModal(false);
      setSelectedProducts([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Remove product mutation
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}/remove-product/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to remove product');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Product removed from brand');
      queryClient.invalidateQueries({ queryKey: ['brand-products', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-brand', id] });
      queryClient.invalidateQueries({ queryKey: ['brand-analytics', id] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleAssignProducts = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    assignMutation.mutate(selectedProducts);
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    if (confirm(`Remove "${productName}" from this brand?`)) {
      removeMutation.mutate(productId);
    }
  };

  if (authLoading || brandLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const brand = brandData?.data?.brand;
  const products = productsData?.data?.products || [];
  const analytics = analyticsData?.data || {};
  const availableProducts = availableProductsData?.data?.products || [];

  // Apply filters
  const filteredProducts = products.filter((product: Product) => {
    if (filterCategory && product.category?.name?.en !== filterCategory) return false;
    
    const stock = product.inventory?.stockQuantity || 0;
    if (filterStock === 'in' && stock <= 10) return false;
    if (filterStock === 'low' && (stock === 0 || stock > 10)) return false;
    if (filterStock === 'out' && stock > 0) return false;
    
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map((p: Product) => p.category?.name?.en).filter(Boolean)));

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <BackButton 
          href="/admin/brands" 
          label="Back to Brands" 
          variant="primary"
          className="mb-4"
        />

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {brand?.image && (
              <img
                src={brand.image}
                alt={brand.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{brand?.name}</h1>
              <p className="text-gray-600 mt-1">{brand?.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">ID: {brand?.brandId}</span>
                <span className="text-sm text-gray-500">Slug: {brand?.slug}</span>
                {brand?.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAssignModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus /> Assign Products
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiPackage className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                PKR {(analytics.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiDollarSign className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiShoppingCart className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Product Price</p>
              <p className="text-2xl font-bold text-gray-900">
                PKR {(analytics.avgPrice || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FiTrendingUp className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock (&gt;10)</option>
              <option value="low">Low Stock (1-10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {(filterCategory || filterStock !== 'all') && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterCategory('');
                  setFilterStock('all');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            Products ({filteredProducts.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No products found. Assign products to this brand to get started.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product: Product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {(product.image || (product as any).images?.[0]?.url) && (
                          <img
                            src={product.image || (product as any).images?.[0]?.url}
                            alt={typeof product.name === 'string' ? product.name : product.name?.en || 'Product'}
                            className="h-10 w-10 rounded object-cover mr-3"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{typeof product.name === 'string' ? product.name : product.name?.en || 'Unknown Product'}</div>
                          <div className="text-xs text-gray-500">{(product as any).productId || product._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.sku || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.category?.name?.en || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      PKR {((product as any).price || (product as any).pricing?.basePrice || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        (product.inventory?.stockQuantity || 0) === 0
                          ? 'text-red-600'
                          : (product.inventory?.stockQuantity || 0) <= 10
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {product.inventory?.stockQuantity || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/admin/products/edit/${product._id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <FiEdit2 className="inline" />
                      </Link>
                      <button
                        onClick={() => handleRemoveProduct(product._id, product.name.en)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiX className="inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Products Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Assign Products to {brand?.name}</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedProducts([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchProducts}
                    onChange={(e) => setSearchProducts(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Selected Count */}
              {selectedProducts.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    {selectedProducts.length} product(s) selected
                  </p>
                </div>
              )}

              {/* Products List */}
              <div className="max-h-[400px] overflow-y-auto mb-4">
                {availableLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading products...</div>
                ) : availableProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No available products found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableProducts.map((product: Product) => (
                      <label
                        key={product._id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product._id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                            }
                          }}
                          className="rounded"
                        />
                        {(product.image || (product as any).images?.[0]?.url) && (
                          <img
                            src={product.image || (product as any).images?.[0]?.url}
                            alt={typeof product.name === 'string' ? product.name : product.name?.en || 'Product'}
                            className="h-10 w-10 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{typeof product.name === 'string' ? product.name : product.name?.en || 'Unknown Product'}</div>
                          <div className="text-xs text-gray-500">SKU: {product.sku || 'N/A'} | Stock: {product.inventory?.stockQuantity || 0}</div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          PKR {((product as any).price || (product as any).pricing?.basePrice || 0).toLocaleString()}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedProducts([]);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignProducts}
                  disabled={assignMutation.isPending || selectedProducts.length === 0}
                  className="btn btn-primary"
                >
                  {assignMutation.isPending
                    ? 'Assigning...'
                    : `Assign ${selectedProducts.length} Product(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin']))
    }
  };
};
