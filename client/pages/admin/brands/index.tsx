import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import BrandStats from '@/components/admin/BrandStats';
import ImageUpload from '@/components/admin/ImageUpload';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiRefreshCw, FiEye } from 'react-icons/fi';
import Link from 'next/link';
import { useProductUpdates } from '@/hooks/useProductUpdates';

interface Brand {
  _id: string;
  brandId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  website?: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BrandsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Real-time product updates (affects brand product counts)
  useProductUpdates((updatedProduct) => {
    console.log('📦 Real-time product update (brands view)');
    queryClient.invalidateQueries({ queryKey: ['brands'] });
  });
  const [searchInput, setSearchInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [logoImages, setLogoImages] = useState<Array<{url: string; thumbnail?: string}>>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    website: '',
    isActive: true
  });

  // Debounce search input - auto-search after 500ms
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Fetch brands
  const { data: brandsData, isLoading } = useQuery({
    queryKey: ['admin-brands', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    },
    enabled: !authLoading
  });


  // Create brand mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(data)
        }
      );
      if (!res.ok) {
        const error = await res.json();
        console.error('Brand creation error:', error);
        // Show detailed error message
        const errorMsg = error.error?.message || error.message || 'Failed to create brand';
        throw new Error(errorMsg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Brand created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand-stats'] });
      closeModal();
    },
    onError: (error: Error) => {
      console.error('Brand creation failed:', error);
      toast.error(error.message || 'Failed to create brand');
    }
  });

  // Update brand mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(data)
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to update brand');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Brand updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand-stats'] });
      closeModal();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete brand mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to delete brand');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Brand deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Sync counts mutation
  const syncCountsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/sync-counts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to sync counts');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Product counts synchronized');
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand-stats'] });
    },
    onError: () => {
      toast.error('Failed to sync counts');
    }
  });

  const openCreateModal = () => {
    setEditingBrand(null);
    setLogoImages([]);
    setFormData({
      name: '',
      description: '',
      image: '',
      website: '',
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    // Convert string to object format expected by ImageUpload
    setLogoImages(brand.image ? [{url: brand.image, thumbnail: brand.image}] : []);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      image: brand.image || '',
      website: brand.website || '',
      isActive: brand.isActive
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setLogoImages([]);
    setFormData({
      name: '',
      description: '',
      image: '',
      website: '',
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Brand name is required');
      return;
    }
    
    // Prepare data - convert empty strings to undefined for optional fields
    const submitData: any = {
      name: formData.name.trim(),
      isActive: formData.isActive
    };
    
    // Only include optional fields if they have values
    if (formData.description && formData.description.trim()) {
      submitData.description = formData.description.trim();
    }
    
    if (formData.website && formData.website.trim()) {
      submitData.website = formData.website.trim();
    }
    
    // Use uploaded image if available, otherwise use existing image (only if not empty)
    const imageUrl = logoImages.length > 0 ? logoImages[0].url : formData.image;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      submitData.image = imageUrl.trim();
    }
    
    console.log('Submitting brand data:', submitData);
    
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (brand: Brand) => {
    if (brand.productCount > 0) {
      toast.error(`Cannot delete brand. ${brand.productCount} product(s) are using this brand.`);
      return;
    }

    if (confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      deleteMutation.mutate(brand._id);
    }
  };

  if (authLoading || isLoading) {
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

  const brands = brandsData?.data?.brands || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Brand Management</h1>
            <p className="text-gray-600 mt-1">Manage product brands</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => syncCountsMutation.mutate()}
              disabled={syncCountsMutation.isPending}
              className="btn btn-outline flex items-center gap-2"
            >
              <FiRefreshCw className={syncCountsMutation.isPending ? 'animate-spin' : ''} />
              Sync Counts
            </button>
            <button
              onClick={openCreateModal}
              className="btn btn-primary flex items-center gap-2"
            >
              <FiPlus /> Add Brand
            </button>
          </div>
        </div>

        {/* Brand Statistics */}
        <BrandStats className="mt-6" />
      </div>

      {/* Search - Real-time auto-search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Type to search brands..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchInput && (
          <p className="text-xs text-gray-500 mt-1">
            Searching automatically as you type...
          </p>
        )}
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No brands found. Create your first brand to get started.
                  </td>
                </tr>
              ) : (
                brands.map((brand: Brand) => (
                  <tr key={brand._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {brand.image ? (
                          <img
                            src={brand.image}
                            alt={brand.name}
                            className="h-12 w-12 rounded-lg object-cover mr-3 border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center mr-3"><svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div><div><div class="text-sm font-medium text-gray-900">' + brand.name + '</div><div class="text-sm text-gray-500">' + brand.slug + '</div></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                          <div className="text-sm text-gray-500">{brand.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-700 font-semibold" title={brand.brandId}>
                        {brand.brandId}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {brand.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {brand.productCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          brand.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          Visit
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/brands/${brand._id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="View Products"
                      >
                        <FiEye className="inline" />
                      </Link>
                      <button
                        onClick={() => openEditModal(brand)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit Brand"
                      >
                        <FiEdit2 className="inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand)}
                        disabled={brand.productCount > 0}
                        className={`${
                          brand.productCount > 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={brand.productCount > 0 ? 'Cannot delete - has products' : 'Delete Brand'}
                      >
                        <FiTrash2 className="inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingBrand ? 'Edit Brand' : 'Create Brand'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Brand Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    required
                    placeholder="e.g., AquaPure"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input w-full"
                    rows={3}
                    placeholder="Brief description of the brand..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Image
                  </label>
                  <ImageUpload
                    images={logoImages}
                    onImagesChange={setLogoImages}
                    maxImages={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a brand image (optional). Recommended size: 400x400px
                  </p>
                  {logoImages.length === 0 && formData.image && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Current image:</p>
                      <img 
                        src={formData.image} 
                        alt="Current image" 
                        className="h-20 w-20 rounded object-cover border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="input w-full"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn btn-primary"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingBrand
                      ? 'Update Brand'
                      : 'Create Brand'}
                  </button>
                </div>
              </form>
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
