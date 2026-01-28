import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import ImageUpload from '@/components/admin/ImageUpload';
import BackButton from '@/components/BackButton';
import { adminAPI } from '@/lib/api';
import LiveIndicator from '@/components/LiveIndicator';

export default function EditCategoryPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState({
    name: {
      en: '',
      ur: '',
    },
    description: {
      en: '',
      ur: '',
    },
    slug: '',
    parentCategory: '',
    displayOrder: 0,
    isActive: true,
  });

  const [images, setImages] = useState<any[]>([]);
  const [manualSlug, setManualSlug] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [selectedParentDepth, setSelectedParentDepth] = useState(0);

  // Fetch category details
  const { data: categoryData, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['admin-category', id],
    queryFn: () => adminAPI.getCategoryById(id as string),
    enabled: !!id,
  });

  // Fetch all categories for parent selection
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminAPI.getCategories(),
  });

  const categories = categoriesData?.data?.categories || [];
  const category = categoryData?.data?.category;

  // Calculate category depth
  const calculateDepth = (categoryId: string, cats: any[], depth = 0): number => {
    if (!categoryId || depth > 10) return depth; // Prevent infinite loops
    const cat = cats.find((c: any) => c._id === categoryId);
    if (!cat || !cat.parentCategory) return depth;
    return calculateDepth(cat.parentCategory._id || cat.parentCategory, cats, depth + 1);
  };

  // Check if a category is a descendant of another
  const isDescendant = (potentialDescendant: string, ancestor: string, cats: any[]): boolean => {
    if (!potentialDescendant || potentialDescendant === ancestor) return false;
    
    let currentId = potentialDescendant;
    let iterations = 0;
    
    while (currentId && iterations < 10) {
      const cat = cats.find((c: any) => c._id === currentId);
      if (!cat) break;
      
      const parentId = cat.parentCategory?._id || cat.parentCategory;
      if (parentId === ancestor) return true;
      
      currentId = parentId;
      iterations++;
    }
    
    return false;
  };

  // Get category path for display
  const getCategoryPath = (categoryId: string, cats: any[]): string => {
    const path: string[] = [];
    let currentId = categoryId;
    let iterations = 0;
    
    while (currentId && iterations < 10) {
      const cat = cats.find((c: any) => c._id === currentId);
      if (!cat) break;
      path.unshift(cat.name.en);
      currentId = cat.parentCategory?._id || cat.parentCategory;
      iterations++;
    }
    
    return path.length > 0 ? path.join(' → ') : 'Root';
  };

  // Get all descendants of a category
  const getDescendants = (categoryId: string, cats: any[]): string[] => {
    const descendants: string[] = [];
    
    const findChildren = (parentId: string) => {
      cats.forEach((cat: any) => {
        const catParentId = cat.parentCategory?._id || cat.parentCategory;
        if (catParentId === parentId) {
          descendants.push(cat._id);
          findChildren(cat._id);
        }
      });
    };
    
    findChildren(categoryId);
    return descendants;
  };

  // Update parent selection handler
  const handleParentChange = (parentId: string) => {
    setFormData({ ...formData, parentCategory: parentId });
    
    if (parentId) {
      const depth = calculateDepth(parentId, categories);
      setSelectedParentDepth(depth);
    } else {
      setSelectedParentDepth(0);
    }
  };

  const MAX_DEPTH = 2; // Max 3 levels (0, 1, 2)
  const willExceedDepth = selectedParentDepth >= MAX_DEPTH;
  const descendants = id ? getDescendants(id as string, categories) : [];

  // Auto-generate slug from English name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  };

  // WebSocket for real-time updates
  useEffect(() => {
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();
    
    if (!socket) {
      console.log('Socket not initialized yet');
      return;
    }

    setIsLive(true);
    
    // Listen for category updates from other admins
    const handleCategoryUpdated = (data: any) => {
      if (data.category?._id === id && data.category?._id) {
        toast.info(`⚠️ This category was just updated by another admin!`, {
          duration: 5000
        });
      }
    };
    
    socket.on('category:updated', handleCategoryUpdated);
    
    return () => {
      if (socket) {
        socket.off('category:updated', handleCategoryUpdated);
      }
      setIsLive(false);
    };
  }, [id]);

  // Populate form when category data is loaded
  useEffect(() => {
    if (category) {
      setFormData({
        name: {
          en: category.name?.en || '',
          ur: category.name?.ur || '',
        },
        description: {
          en: category.description?.en || '',
          ur: category.description?.ur || '',
        },
        slug: category.slug || '',
        parentCategory: category.parentCategory?._id || '',
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive !== undefined ? category.isActive : true,
      });

      // Set images
      if (category.image) {
        if (typeof category.image === 'string') {
          setImages([{ url: category.image, thumbnail: category.image }]);
        } else if (category.image.url) {
          setImages([{ url: category.image.url, thumbnail: category.image.thumbnail || category.image.url }]);
        }
      }
    }
  }, [category]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateCategory(id as string, data),
    onSuccess: (response) => {
      const category = response.data.category;
      toast.success(
        `✅ Category updated successfully!\nName: ${category.name?.en}\nSlug: ${category.slug}`,
        { duration: 5000 }
      );
      
      // Small delay to ensure WebSocket event is processed
      setTimeout(() => {
        router.push('/admin/categories');
      }, 500);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update category';
      const errorCode = error.response?.data?.error?.code;
      
      if (errorCode === 'DUPLICATE_SLUG') {
        toast.error('❌ This slug already exists. Please use a unique slug.');
      } else if (errorCode === 'HAS_SUBCATEGORIES') {
        toast.error('❌ Cannot modify category structure with active subcategories.');
      } else {
        toast.error(`❌ ${errorMsg}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if depth limit exceeded
    if (willExceedDepth) {
      toast.error('Cannot update category: Maximum depth limit reached');
      return;
    }
    
    // Prevent circular reference
    if (formData.parentCategory && descendants.includes(formData.parentCategory)) {
      toast.error('Cannot update category: Would create circular reference');
      return;
    }
    
    const sanitizedData = {
      ...formData,
      parentCategory: formData.parentCategory || null,
      image: images.length > 0 ? {
        url: images[0].url,
        thumbnail: images[0].thumbnail || images[0].url
      } : null,
    };
    
    updateMutation.mutate(sanitizedData);
  };

  const isLoading = updateMutation.isPending || isLoadingCategory;

  if (isLoadingCategory) {
    return (
      <AdminLayout>
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!category) {
    return (
      <AdminLayout>
        <div className="max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-red-600">Category not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <BackButton href="/admin/categories" />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
              {isLive && <LiveIndicator />}
            </div>
            <p className="text-gray-600 mt-1">Update category details with real-time sync</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* English Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name (English) *
              </label>
              <input
                type="text"
                required
                value={formData.name.en}
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData({
                    ...formData,
                    name: { ...formData.name, en: newName },
                    slug: manualSlug ? formData.slug : generateSlug(newName),
                  });
                }}
                className="input w-full"
                placeholder="e.g., Bathroom Fixtures"
              />
              <p className="text-xs text-gray-500 mt-1">
                The slug will be automatically updated from this name
              </p>
            </div>

            {/* Urdu Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name (Urdu)
              </label>
              <input
                type="text"
                value={formData.name.ur}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: { ...formData.name, ur: e.target.value },
                  })
                }
                className="input w-full font-urdu"
                placeholder="Optional"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: e.target.value });
                    setManualSlug(true);
                  }}
                  className="input w-full"
                  placeholder="e.g., bathroom-fixtures"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSlug = generateSlug(formData.name.en);
                    setFormData({ ...formData, slug: newSlug });
                    setManualSlug(false);
                  }}
                  className="btn btn-secondary whitespace-nowrap"
                  title="Regenerate slug from name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-generated from name. Click the refresh button to regenerate, or edit manually.
              </p>
            </div>

            {/* Parent Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Category
              </label>
              <select
                value={formData.parentCategory}
                onChange={(e) => handleParentChange(e.target.value)}
                className={`input w-full ${willExceedDepth ? 'border-red-500' : ''}`}
              >
                <option value="">None (Root Category - Level 0)</option>
                {categories
                  .filter((cat: any) => cat._id !== id)
                  .map((cat: any) => {
                    const depth = calculateDepth(cat._id, categories);
                    const isMaxDepth = depth >= MAX_DEPTH;
                    const isSelfOrDescendant = cat._id === id || descendants.includes(cat._id);
                    const isDisabled = isMaxDepth || isSelfOrDescendant;
                    
                    let disabledReason = '';
                    if (cat._id === id) disabledReason = ' (Cannot select self)';
                    else if (isSelfOrDescendant) disabledReason = ' (Cannot select descendant - would create circular reference)';
                    else if (isMaxDepth) disabledReason = ' (Max depth reached)';
                    
                    return (
                      <option 
                        key={cat._id} 
                        value={cat._id}
                        disabled={isDisabled}
                        style={{ 
                          paddingLeft: `${depth * 12}px`,
                          color: isDisabled ? '#9ca3af' : 'inherit'
                        }}
                      >
                        {depth > 0 ? '└─ '.repeat(depth) : ''}
                        {cat.parentCategory ? '🏷️' : '📁'} {cat.name.en}
                        {disabledReason || ` (Level ${depth})`}
                      </option>
                    );
                  })}
              </select>
              
              {/* Category path display */}
              {formData.parentCategory && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-semibold text-blue-900 mb-1">
                    📍 Category will be moved under:
                  </p>
                  <p className="text-sm text-blue-800">
                    {getCategoryPath(formData.parentCategory, categories)} → <strong>{formData.name.en || category?.name?.en}</strong>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Depth: Level {selectedParentDepth + 1} of {MAX_DEPTH + 1}
                  </p>
                </div>
              )}
              
              {/* Descendants warning */}
              {descendants.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs font-semibold text-yellow-900 mb-1">
                    ⚠️ This category has {descendants.length} subcategories
                  </p>
                  <p className="text-sm text-yellow-800">
                    Cannot select any of its subcategories as parent (would create circular reference).
                    Moving this category will also affect all its subcategories.
                  </p>
                </div>
              )}
              
              {/* Depth warning */}
              {willExceedDepth && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs font-semibold text-red-900 mb-1">
                    ⚠️ Maximum Depth Reached
                  </p>
                  <p className="text-sm text-red-800">
                    Cannot move category here. Maximum nesting depth is {MAX_DEPTH + 1} levels.
                    Please select a different parent or convert to root category.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                Select a parent category or leave empty for root. Cannot select self or descendants.
                Maximum nesting: {MAX_DEPTH + 1} levels.
              </p>
            </div>

            {/* English Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (English)
              </label>
              <textarea
                value={formData.description.en}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: { ...formData.description, en: e.target.value },
                  })
                }
                className="input w-full"
                rows={4}
                placeholder="Describe this category..."
              />
            </div>

            {/* Urdu Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Urdu)
              </label>
              <textarea
                value={formData.description.ur}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: { ...formData.description, ur: e.target.value },
                  })
                }
                className="input w-full font-urdu"
                rows={4}
                placeholder="Optional"
              />
            </div>

            {/* Category Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Image
              </label>
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={1}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a category image (optional). Recommended size: 400x400px
              </p>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
                className="input w-full"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower numbers appear first. Use this to control the order of categories.
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (visible to customers)
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/categories')}
                className="btn"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || willExceedDepth}
                title={willExceedDepth ? 'Cannot update: Maximum depth reached' : 'Update category'}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Category'
                )}
              </button>
            </div>
          </form>
        </div>
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
