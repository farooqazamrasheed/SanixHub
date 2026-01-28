import { GetServerSideProps } from 'next';
import { useState, useEffect, useMemo } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { categoriesAPI, adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import { useProductUpdates } from '@/hooks/useProductUpdates';
import LiveIndicator from '@/components/LiveIndicator';
import CategoryAccordion from '@/components/admin/CategoryAccordion';

export default function AdminCategoriesPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tree' | 'accordion'>('accordion');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [parentFilter, setParentFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Real-time product updates (affects category product counts)
  useProductUpdates((updatedProduct) => {
    console.log('📦 Real-time product update (categories view)');
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
  });

  // WebSocket real-time updates for categories
  useEffect(() => {
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();
    
    if (!socket) {
      console.log('Socket not initialized yet');
      return;
    }

    setIsLive(true);
    
    // Listen for category events
    const handleCategoryCreated = (data: any) => {
      console.log('✨ Category created:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-all'] });
      toast.success(`🎉 New category created: ${data.category?.name?.en}`, {
        duration: 4000,
        icon: '✨'
      });
    };
    
    const handleCategoryUpdated = (data: any) => {
      console.log('📝 Category updated:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-all'] });
      toast.success(`✏️ Category updated: ${data.category?.name?.en}`, {
        duration: 3000
      });
    };
    
    const handleCategoryDeleted = (data: any) => {
      console.log('🗑️ Category deleted:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-all'] });
      toast.error(`❌ Category deleted: ${data.category?.name?.en}`, {
        duration: 3000
      });
    };

    const handleCategoryReordered = (data: any) => {
      console.log('🔄 Categories reordered:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('🔄 Categories reordered', {
        duration: 2000
      });
    };
    
    socket.on('category:created', handleCategoryCreated);
    socket.on('category:updated', handleCategoryUpdated);
    socket.on('category:deleted', handleCategoryDeleted);
    socket.on('category:reordered', handleCategoryReordered);
    
    return () => {
      if (socket) {
        socket.off('category:created', handleCategoryCreated);
        socket.off('category:updated', handleCategoryUpdated);
        socket.off('category:deleted', handleCategoryDeleted);
        socket.off('category:reordered', handleCategoryReordered);
      }
      setIsLive(false);
    };
  }, [queryClient]);

  // Debounce search input - auto-search after 500ms
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Fetch categories (toggle between active and all)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories', showInactive],
    queryFn: () => categoriesAPI.getAll({ includeInactive: showInactive }),
    enabled: !authLoading,
  });

  // Fetch all categories (including inactive) to count them
  const { data: allCategoriesData } = useQuery({
    queryKey: ['admin-categories-all'],
    queryFn: () => categoriesAPI.getAll({ includeInactive: true }),
    enabled: !authLoading,
  });

  const allCategories = data?.data?.categories || [];
  const allCategoriesIncludingInactive = allCategoriesData?.data?.categories || [];

  // Count inactive categories from the complete list
  const inactiveCount = useMemo(() => {
    return allCategoriesIncludingInactive.filter((cat: any) => !cat.isActive).length;
  }, [allCategoriesIncludingInactive]);

  // Helper: Build category tree and calculate subcategory counts
  const buildCategoryTree = (cats: any[]) => {
    const categoryMap = new Map();
    const tree: any[] = [];
    
    // First pass: create map and add children array
    cats.forEach(cat => {
      categoryMap.set(cat._id, { ...cat, children: [], childrenCount: 0, depth: 0 });
    });
    
    // Second pass: build tree structure and count children
    cats.forEach(cat => {
      const categoryNode = categoryMap.get(cat._id);
      if (cat.parentCategory?._id || cat.parentCategory) {
        const parentId = cat.parentCategory?._id || cat.parentCategory;
        const parent = categoryMap.get(parentId);
        if (parent) {
          parent.children.push(categoryNode);
          categoryNode.depth = parent.depth + 1;
          // Count all descendants
          let count = 1;
          let currentParent = parent;
          while (currentParent) {
            currentParent.childrenCount = (currentParent.childrenCount || 0) + 1;
            const grandparentId = currentParent.parentCategory?._id || currentParent.parentCategory;
            currentParent = grandparentId ? categoryMap.get(grandparentId) : null;
          }
        }
      } else {
        tree.push(categoryNode);
      }
    });
    
    return { tree, categoryMap };
  };

  const { tree: categoryTree, categoryMap } = useMemo(() => {
    return buildCategoryTree(allCategories);
  }, [allCategories]);

  // Helper: Get category breadcrumb path
  const getCategoryPath = (category: any) => {
    const path: string[] = [];
    let current = category;
    
    while (current) {
      path.unshift(current.name?.en || 'Unknown');
      const parentId = current.parentCategory?._id || current.parentCategory;
      current = parentId ? categoryMap.get(parentId) : null;
    }
    
    return path.length > 0 ? path.join(' → ') : 'Root';
  };

  // Helper: Flatten tree for table view
  const flattenTree = (nodes: any[], level = 0): any[] => {
    let result: any[] = [];
    
    nodes.forEach(node => {
      result.push({ ...node, level });
      if (expandedCategories.includes(node._id) && node.children.length > 0) {
        result = result.concat(flattenTree(node.children, level + 1));
      }
    });
    
    return result;
  };

  // Filter categories based on search and parent filter
  const categories = useMemo(() => {
    let filtered = allCategories;
    
    // Apply parent filter
    if (parentFilter === 'root') {
      filtered = filtered.filter((cat: any) => !cat.parentCategory);
    } else if (parentFilter === 'subcategories') {
      filtered = filtered.filter((cat: any) => cat.parentCategory);
    } else if (parentFilter !== 'all') {
      // Filter by specific parent
      filtered = filtered.filter((cat: any) => 
        (cat.parentCategory?._id || cat.parentCategory) === parentFilter
      );
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((category: any) => {
        const nameEn = category.name?.en?.toLowerCase() || '';
        const nameUr = category.name?.ur || '';
        const slug = category.slug?.toLowerCase() || '';
        const categoryId = category.categoryId?.toLowerCase() || '';
        
        return nameEn.includes(searchLower) || 
               nameUr.includes(search) || 
               slug.includes(searchLower) ||
               categoryId.includes(searchLower);
      });
    }
    
    // If tree view, build tree structure, otherwise flatten
    if (viewMode === 'tree') {
      const { tree } = buildCategoryTree(filtered);
      return flattenTree(tree);
    }
    
    return filtered.map(cat => ({
      ...cat,
      childrenCount: categoryMap.get(cat._id)?.childrenCount || 0,
      depth: categoryMap.get(cat._id)?.depth || 0
    }));
  }, [allCategories, search, parentFilter, viewMode, expandedCategories, categoryMap]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete category');
    },
  });

  // Restore mutation (reactivate deleted category)
  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminAPI.updateCategory(id, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category restored successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to restore category');
    },
  });
  
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

  const handleEdit = (category: any) => {
    router.push(`/admin/categories/${category._id}/edit`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRestore = (id: string) => {
    if (confirm('Are you sure you want to restore this category?')) {
      restoreMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    router.push('/admin/categories/create');
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map((c: any) => c._id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedCategories.length === 0) {
      toast.error('Please select categories to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)) {
      selectedCategories.forEach(id => deleteMutation.mutate(id));
      setSelectedCategories([]);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const expandAll = () => {
    const allParentIds = allCategories
      .filter((cat: any) => {
        const node = categoryMap.get(cat._id);
        return node && node.children.length > 0;
      })
      .map((cat: any) => cat._id);
    setExpandedCategories(allParentIds);
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
              {isLive && <LiveIndicator />}
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Manage product categories with real-time updates</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Animated Toggle for showing inactive categories */}
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Show Inactive</span>
                {inactiveCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 text-xs font-semibold rounded-full bg-red-100 text-red-600 animate-fade-in">
                    {inactiveCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  showInactive ? 'bg-primary-600 shadow-lg shadow-primary-200' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                role="switch"
                aria-checked={showInactive}
                title={showInactive ? 'Hide inactive categories' : 'Show inactive categories'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                    showInactive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {showInactive && (
                <span className="text-xs text-primary-600 font-bold animate-fade-in">
                  ON
                </span>
              )}
            </div>
            <button 
              onClick={handleCreateNew} 
              className="btn btn-primary shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:-rotate-1 group w-full sm:w-auto"
            >
              <span className="inline-block group-hover:rotate-180 transition-transform duration-500">+</span> 
              <span className="hidden xs:inline ml-1">Create Category</span>
              <span className="inline xs:hidden ml-1">Create</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards with enhanced animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-primary-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 transition-all duration-300 group-hover:text-primary-700">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 transition-all duration-300 group-hover:text-primary-700 group-hover:scale-110">{allCategories.length}</p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {allCategories.filter((c: any) => c.isActive).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{inactiveCount}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Root Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {allCategories.filter((c: any) => !c.parentCategory).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Subcategories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {allCategories.filter((c: any) => c.parentCategory).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCategories.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected
              </span>
              <button
                onClick={() => setSelectedCategories([])}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
              >
                🗑️ Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Mode and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* View Mode Toggle with enhanced animations */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 animate-fade-in">View:</span>
            <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <button
                onClick={() => setViewMode('accordion')}
                className={`px-2 sm:px-3 py-1.5 rounded text-sm font-medium transition-all duration-300 transform ${
                  viewMode === 'accordion'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                } active:scale-95`}
              >
                <span className={viewMode === 'accordion' ? 'animate-bounce inline-block' : ''}>📂</span> 
                <span className="hidden sm:inline ml-1">Accordion</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 sm:px-3 py-1.5 rounded text-sm font-medium transition-all duration-300 transform ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                } active:scale-95`}
              >
                <span className={viewMode === 'table' ? 'animate-bounce inline-block' : ''}>📋</span> 
                <span className="hidden sm:inline ml-1">Table</span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-2 sm:px-3 py-1.5 rounded text-sm font-medium transition-all duration-300 transform ${
                  viewMode === 'tree'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                } active:scale-95`}
              >
                <span className={viewMode === 'tree' ? 'animate-bounce inline-block' : ''}>🌲</span> 
                <span className="hidden sm:inline ml-1">Tree</span>
              </button>
            </div>
          </div>

          {/* Parent Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">Filter:</span>
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="input-sm border-gray-300 rounded-lg text-sm w-full sm:w-auto"
            >
              <option value="all">All Categories</option>
              <option value="root">Root Only</option>
              <option value="subcategories">Subcategories Only</option>
              <optgroup label="By Parent">
                {allCategories
                  .filter((cat: any) => !cat.parentCategory)
                  .map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      └─ {cat.name.en}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Tree/Accordion View Controls */}
          {(viewMode === 'tree' || viewMode === 'accordion') && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={expandAll}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-medium text-xs transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-110 active:scale-95 hover:rotate-3"
                title="Expand all categories"
              >
                <span className="inline-block hover:animate-ping">⊞</span> 
                <span className="hidden sm:inline ml-1">Expand All</span>
              </button>
              <button
                onClick={collapseAll}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium text-xs transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-110 active:scale-95 hover:-rotate-3"
                title="Collapse all categories"
              >
                <span className="inline-block hover:animate-ping">⊟</span> 
                <span className="hidden sm:inline ml-1">Collapse All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar - Real-time auto-search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
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
          <input
            type="text"
            placeholder="Type to search categories by ID, name, or slug..."
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
        {search && (
          <p className="text-sm text-gray-600 mt-2">
            Found {categories.length} of {allCategories.length} categories
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg p-6 animate-pulse"
              style={{ 
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }}></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-8 bg-gray-300 rounded"></div>
                  <div className="w-16 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'accordion' ? (
        /* Accordion View */
        <div className="space-y-4">
          {categoryTree.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium mb-2">No categories found</p>
              <p className="text-gray-400 text-sm mb-4">
                {search ? 'Try adjusting your search filters' : 'Create your first category to get started'}
              </p>
              {!search && (
                <button onClick={handleCreateNew} className="btn btn-primary">
                  + Create Category
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Accordion Items */}
              <div className="space-y-3">
                {categoryTree.map((category) => (
                  <CategoryAccordion
                    key={category._id}
                    category={category}
                    level={0}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    expandedCategories={expandedCategories}
                    onToggleExpand={toggleCategoryExpand}
                  />
                ))}
              </div>

              {/* Summary Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm p-4 mt-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-6">
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{categoryTree.length}</strong> root {categoryTree.length === 1 ? 'category' : 'categories'}
                    </span>
                    <span className="text-gray-600">
                      <strong className="text-gray-900">{allCategories.length}</strong> total
                    </span>
                    {search && (
                      <span className="text-primary-600">
                        Filtered results
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                      setParentFilter('all');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="max-h-[600px] overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && selectedCategories.length === categories.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Hierarchy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category: any, index: number) => (
                <tr 
                  key={category._id} 
                  className={`
                    hover:bg-gradient-to-r hover:from-gray-50 hover:to-white 
                    transition-all duration-300 animate-fade-in transform hover:scale-[1.01]
                    ${selectedCategories.includes(category._id) 
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100 shadow-md ring-2 ring-primary-300' 
                      : ''
                    }
                    cursor-pointer group
                  `}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category._id)}
                      onChange={() => toggleCategorySelection(category._id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 transition-all duration-200 transform hover:scale-125 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                      {category.image?.url || category.image?.thumbnail || category.image ? (
                        <img
                          src={category.image?.url || category.image?.thumbnail || category.image}
                          alt={category.name?.en || 'Category'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            }
                          }}
                        />
                      ) : (
                        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm text-primary-600 font-semibold transition-all duration-300 group-hover:text-primary-800 group-hover:scale-105 inline-block">
                      {category.categoryId || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Indentation for tree view with animated connecting lines */}
                      {viewMode === 'tree' && category.level > 0 && (
                        <span 
                          style={{ marginLeft: `${category.level * 24}px` }} 
                          className="text-gray-400 transition-all duration-300 group-hover:text-primary-500 font-bold"
                        >
                          └─
                        </span>
                      )}
                      
                      {/* Expand/Collapse button with animation - LARGER SIZE */}
                      {category.children && category.children.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(category._id);
                          }}
                          className={`
                            w-8 h-8 flex items-center justify-center rounded-full 
                            transition-all duration-300 transform
                            ${expandedCategories.includes(category._id) 
                              ? 'bg-primary-200 text-primary-800 rotate-90 scale-110' 
                              : 'bg-gray-200 text-gray-600 rotate-0 hover:bg-primary-100'
                            }
                            hover:scale-125 hover:shadow-lg active:scale-95
                          `}
                          title={expandedCategories.includes(category._id) ? 'Collapse' : 'Expand'}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        viewMode === 'tree' && <span className="w-8"></span>
                      )}
                      
                      {/* Icon based on type with hover animation */}
                      <span className="text-lg transition-all duration-300 transform group-hover:scale-125 group-hover:rotate-12">
                        {category.parentCategory ? '🏷️' : '📁'}
                      </span>
                      
                      {/* Category name with gradient on hover */}
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2 transition-all duration-300 group-hover:text-primary-700">
                          <span className="group-hover:font-bold transition-all duration-300">
                            {category.name.en}
                          </span>
                          {/* Depth badge with animation */}
                          {category.depth > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 transition-all duration-300 group-hover:bg-primary-100 group-hover:text-primary-700 group-hover:scale-110">
                              L{category.depth}
                            </span>
                          )}
                        </div>
                        {category.name.ur && (
                          <div className="text-sm text-gray-500 font-urdu">
                            {category.name.ur}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {getCategoryPath(category)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {category.childrenCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 transition-all duration-300 hover:scale-110 hover:bg-purple-200 cursor-default">
                          {category.childrenCount} {category.childrenCount === 1 ? 'child' : 'children'}
                        </span>
                        {viewMode !== 'tree' && category.children && category.children.length > 0 && (
                          <button
                            onClick={() => setParentFilter(category._id)}
                            className="text-xs text-primary-600 hover:text-primary-800 underline"
                            title="Filter by this parent"
                          >
                            View
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full transition-all duration-300 hover:scale-110 cursor-default inline-block ${
                        category.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
                          : 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md'
                      }`}
                    >
                      {category.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {category.displayOrder}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                      {category.isActive ? (
                        <>
                          <button
                            onClick={() => handleEdit(category)}
                            className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all duration-200 transform hover:scale-110 active:scale-95 hover:-rotate-3 shadow-sm hover:shadow-md font-medium"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(category._id)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all duration-200 transform hover:scale-110 active:scale-95 hover:rotate-3 shadow-sm hover:shadow-md font-medium"
                            disabled={deleteMutation.isPending}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(category._id)}
                          className="px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md font-medium"
                          disabled={restoreMutation.isPending}
                        >
                          ♻️ Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories found</p>
            </div>
          )}
        </div>
      )}

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
