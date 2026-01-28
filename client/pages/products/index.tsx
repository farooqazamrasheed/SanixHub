import { GetServerSideProps } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiGrid, FiList, FiShoppingCart, FiSearch, FiX, FiChevronLeft, FiChevronRight, FiPackage, FiHeart, FiStar, FiEye, FiChevronDown, FiTrendingUp, FiTag, FiDollarSign, FiRefreshCw, FiZap } from 'react-icons/fi';
import Layout from '@/components/Layout';
import FilterDrawer from '@/components/FilterDrawer';
import QuickViewModal from '@/components/QuickViewModal';
import ProductCard from '@/components/ProductCard';
import ProductCardList from '@/components/ProductCardList';
import { productsAPI, categoriesAPI, cartAPI } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProductPriceUpdates } from '@/hooks/useProductPriceUpdates';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, items: wishlistItems } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { socket, connected } = useSocket();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState(0);

  const [searchInput, setSearchInput] = useState(router.query.search || '');
  const [isTyping, setIsTyping] = useState(false);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: router.query.category || '',
    subCategory: router.query.subCategory || '',
    minPrice: '',
    maxPrice: '',
    search: router.query.search || '',
    sort: '-createdAt',
    featured: '',
    isNew: '',
    inStock: 'true', // Backend filter for stock
    brand: router.query.brand || '',
  });

  // Debounced search effect
  useEffect(() => {
    setIsTyping(true);
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
      setIsTyping(false);
    }, 500); // 500ms delay for debouncing

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Fetch products
  const productsQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsAPI.getAll(filters),
  });
  const { data: productsData, isLoading: productsLoading } = productsQuery;

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  });

  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination || {};
  const categories = categoriesData?.data?.categories || [];

  // Get unique brands from products for filter
  const brands = Array.from(new Set(products.map((p: any) => p.brand).filter(Boolean)));

  // Get subcategories based on selected category
  const subcategories = filters.category
    ? categories.filter((cat: any) => cat.parentCategory === filters.category)
    : [];
  
  // Real-time WebSocket updates for products
  useEffect(() => {
    if (!socket || !connected) return;

    console.log('📡 Setting up real-time product updates for products page');

    // Listen for inventory updates
    const handleInventoryUpdate = (data: any) => {
      console.log('📦 Inventory updated (products page):', data);
      setRealTimeUpdates(prev => prev + 1);
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product stock updated!', { icon: '📦', duration: 2000 });
    };

    // Listen for price changes
    const handlePriceChange = (data: any) => {
      console.log('💰 Price changed (products page):', data);
      setRealTimeUpdates(prev => prev + 1);
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product price updated!', { icon: '💰', duration: 2000 });
    };

    // Listen for product updates
    const handleProductUpdate = (data: any) => {
      console.log('🔄 Product updated (products page):', data);
      setRealTimeUpdates(prev => prev + 1);
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ['products'] });
    };

    socket.on('inventory:updated', handleInventoryUpdate);
    socket.on('inventory:product-updated', handleProductUpdate);
    socket.on('product:price-changed', handlePriceChange);

    return () => {
      socket.off('inventory:updated', handleInventoryUpdate);
      socket.off('inventory:product-updated', handleProductUpdate);
      socket.off('product:price-changed', handlePriceChange);
    };
  }, [socket, connected, queryClient]);

  // Legacy price updates hook (for compatibility)
  useProductPriceUpdates((data) => {
    console.log('💰 Product price updated (legacy hook), refetching product list...');
    productsQuery.refetch();
  });

  // Add to cart mutation for authenticated users
  const addToCartMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) => cartAPI.addItem(data),
    onSuccess: () => {
      toast.success('Added to cart!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add to cart');
    }
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleAddToCart = async (product: any) => {
    try {
      console.log('🛒 Adding to cart:', product);
      
      // Always add to local store first for immediate UI feedback
      addItem({ product, quantity: 1 });
      
      // If authenticated, also save to backend
      if (isAuthenticated) {
        console.log('🔐 User is authenticated, saving to backend...');
        addToCartMutation.mutate({
          productId: product._id,
          quantity: 1
        });
      } else {
        // For guest users, just show success message
        toast.success('Added to cart!');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleAddToWishlist = (product: any) => {
    const isInWishlist = wishlistItems.some((item: any) => item.product._id === product._id);
    if (!isInWishlist) {
      addToWishlist(product);
      toast.success('Added to wishlist!');
    } else {
      toast.error('Already in wishlist!');
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <>
      <NextSeo
        title="Products - SanixHub"
        description="Browse our complete range of sanitary and plumbing products"
      />

      <Layout>
        <div className="bg-gradient-to-b from-gray-50 to-white py-8 min-h-screen">
          <div className="container-custom">
            {/* Breadcrumb */}
            <motion.nav 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm mb-6 flex items-center gap-2"
            >
              <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Home
              </Link>
              <FiChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700 font-semibold">Products</span>
            </motion.nav>

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Filters Sidebar - Desktop - Compact & Collapsible */}
              <aside className="hidden lg:block lg:col-span-1">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-5 sticky top-24 border border-gray-100 max-h-[calc(100vh-7rem)] overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-100">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <FiFilter className="w-5 h-5 text-primary-600" />
                      Filters
                    </h2>
                    {(filters.search || filters.category || filters.subCategory || filters.brand || filters.minPrice || filters.maxPrice || filters.featured || filters.isNew) && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-md"
                      >
                        {[filters.search, filters.category, filters.subCategory, filters.brand, filters.minPrice, filters.maxPrice, filters.featured, filters.isNew].filter(Boolean).length}
                      </motion.span>
                    )}
                  </div>

                  {/* Search - Always Visible */}
                  <div className="mb-4">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                      {searchInput && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => setSearchInput('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <FiX className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                    {isTyping && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-primary-600 mt-1 font-medium"
                      >
                        Searching...
                      </motion.p>
                    )}
                  </div>

                  {/* Category - Collapsible */}
                  <div className="mb-3 border-b border-gray-100">
                    <button
                      onClick={() => toggleSection('category')}
                      className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FiTag className="w-4 h-4" />
                        Category
                      </span>
                      <motion.div
                        animate={{ rotate: collapsedSections.includes('category') ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FiChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {!collapsedSections.includes('category') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pb-3"
                        >
                          <select
                            value={filters.category}
                            onChange={(e) => {
                              handleFilterChange('category', e.target.value);
                              if (e.target.value !== filters.category) {
                                handleFilterChange('subCategory', '');
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">All Categories</option>
                            {categories.filter((cat: any) => !cat.parentCategory).map((cat: any) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name.en}
                              </option>
                            ))}
                          </select>

                          {/* Subcategory */}
                          {subcategories.length > 0 && (
                            <select
                              value={filters.subCategory}
                              onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mt-2"
                            >
                              <option value="">All Subcategories</option>
                              {subcategories.map((cat: any) => (
                                <option key={cat._id} value={cat._id}>
                                  {cat.name.en}
                                </option>
                              ))}
                            </select>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Price Range - Collapsible */}
                  <div className="mb-3 border-b border-gray-100">
                    <button
                      onClick={() => toggleSection('price')}
                      className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FiDollarSign className="w-4 h-4" />
                        Price Range
                      </span>
                      <motion.div
                        animate={{ rotate: collapsedSections.includes('price') ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FiChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {!collapsedSections.includes('price') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pb-3"
                        >
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Min"
                              value={filters.minPrice}
                              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                              className="w-1/2 px-2 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={filters.maxPrice}
                              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                              className="w-1/2 px-2 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Brand - Collapsible */}
                  {brands.length > 0 && (
                    <div className="mb-3 border-b border-gray-100">
                      <button
                        onClick={() => toggleSection('brand')}
                        className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <FiTag className="w-4 h-4" />
                          Brand
                        </span>
                        <motion.div
                          animate={{ rotate: collapsedSections.includes('brand') ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FiChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {!collapsedSections.includes('brand') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pb-3"
                          >
                            <select
                              value={filters.brand}
                              onChange={(e) => handleFilterChange('brand', e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">All Brands</option>
                              {brands.map((brand: string) => (
                                <option key={brand} value={brand}>
                                  {brand}
                                </option>
                              ))}
                            </select>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Sort By - Collapsible */}
                  <div className="mb-3 border-b border-gray-100">
                    <button
                      onClick={() => toggleSection('sort')}
                      className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4" />
                        Sort By
                      </span>
                      <motion.div
                        animate={{ rotate: collapsedSections.includes('sort') ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FiChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {!collapsedSections.includes('sort') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pb-3"
                        >
                          <select
                            value={filters.sort}
                            onChange={(e) => handleFilterChange('sort', e.target.value)}
                            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="-createdAt">Newest First</option>
                            <option value="createdAt">Oldest First</option>
                            <option value="pricing.salePrice">Price: Low to High</option>
                            <option value="-pricing.salePrice">Price: High to Low</option>
                            <option value="name.en">Name: A to Z</option>
                            <option value="-name.en">Name: Z to A</option>
                            <option value="-stats.averageRating">Highest Rated</option>
                            <option value="-stats.totalSales">Best Selling</option>
                          </select>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Quick Filters */}
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Quick Filters</p>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.featured === 'true'}
                        onChange={(e) =>
                          handleFilterChange('featured', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.isNew === 'true'}
                        onChange={(e) =>
                          handleFilterChange('isNew', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">New Arrivals</span>
                    </label>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.inStock === 'true'}
                        onChange={(e) =>
                          handleFilterChange('inStock', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">In Stock</span>
                    </label>
                  </div>

                  {/* Reset Filters */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSearchInput('');
                      setFilters({
                        page: 1,
                        limit: 20,
                        category: '',
                        subCategory: '',
                        brand: '',
                        minPrice: '',
                        maxPrice: '',
                        search: '',
                        sort: '-createdAt',
                        featured: '',
                        isNew: '',
                        inStock: 'true',
                      });
                    }}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all shadow-sm hover:shadow-md border border-gray-200"
                  >
                    <FiX className="w-4 h-4" />
                    Reset All Filters
                  </motion.button>
                </motion.div>
              </aside>

              {/* Mobile Filter Drawer */}
              <FilterDrawer
                isOpen={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
                activeFiltersCount={[filters.search, filters.category, filters.subCategory, filters.brand, filters.minPrice, filters.maxPrice, filters.featured, filters.isNew].filter(Boolean).length}
              >
                {/* Same filter content as desktop */}
                <div className="space-y-6">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                      <span>Search Products</span>
                      {isTyping && (
                        <span className="text-xs text-primary-600 font-normal">
                          Searching...
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Type to search..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="input pl-10 pr-10"
                      />
                      {searchInput && (
                        <button
                          onClick={() => setSearchInput('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Search by name, SKU, brand, tags, etc.
                    </p>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => {
                        handleFilterChange('category', e.target.value);
                        if (e.target.value !== filters.category) {
                          handleFilterChange('subCategory', '');
                        }
                      }}
                      className="input"
                    >
                      <option value="">All Categories</option>
                      {categories.filter((cat: any) => !cat.parentCategory).map((cat: any) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Filter */}
                  {subcategories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Subcategory
                      </label>
                      <select
                        value={filters.subCategory}
                        onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                        className="input"
                      >
                        <option value="">All Subcategories</option>
                        {subcategories.map((cat: any) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Brand Filter */}
                  {brands.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Brand
                      </label>
                      <select
                        value={filters.brand}
                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                        className="input"
                      >
                        <option value="">All Brands</option>
                        {brands.map((brand: string) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price Range (PKR)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        className="input"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sort}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                      className="input"
                    >
                      <option value="-createdAt">Newest First</option>
                      <option value="createdAt">Oldest First</option>
                      <option value="pricing.salePrice">Price: Low to High</option>
                      <option value="-pricing.salePrice">Price: High to Low</option>
                      <option value="name.en">Name: A to Z</option>
                      <option value="-name.en">Name: Z to A</option>
                      <option value="-stats.averageRating">Highest Rated</option>
                      <option value="-stats.totalSales">Best Selling</option>
                    </select>
                  </div>

                  {/* Featured Filter */}
                  <div>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={filters.featured === 'true'}
                        onChange={(e) =>
                          handleFilterChange('featured', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured Products Only</span>
                    </label>
                  </div>

                  {/* New Arrivals Filter */}
                  <div>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={filters.isNew === 'true'}
                        onChange={(e) =>
                          handleFilterChange('isNew', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">New Arrivals Only</span>
                    </label>
                  </div>

                  {/* Stock Filter */}
                  <div>
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={filters.inStock === 'true'}
                        onChange={(e) =>
                          handleFilterChange('inStock', e.target.checked ? 'true' : '')
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">In Stock Only</span>
                    </label>
                  </div>

                  {/* Reset Filters */}
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setFilters({
                        page: 1,
                        limit: 20,
                        category: '',
                        subCategory: '',
                        brand: '',
                        minPrice: '',
                        maxPrice: '',
                        search: '',
                        sort: '-createdAt',
                        featured: '',
                        isNew: '',
                        inStock: 'true',
                      });
                    }}
                    className="w-full btn btn-outline"
                  >
                    Reset Filters
                  </button>
                </div>
              </FilterDrawer>

              {/* Products Grid */}
              <main className="lg:col-span-3">
                {/* Enhanced Header with View Toggle & Real-time Status */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 mb-6"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Left: Title & Count */}
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-1 flex items-center gap-3">
                        {filters.search ? `Search: "${filters.search}"` : 'All Products'}
                        {/* Real-time Status Indicator */}
                        {connected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-400 to-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md"
                          >
                            <motion.span
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="w-2 h-2 bg-white rounded-full"
                            />
                            Live
                          </motion.span>
                        )}
                      </h1>
                      <p className="text-gray-600 text-sm flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <FiPackage className="w-4 h-4" />
                          <span className="font-semibold">{pagination.total || 0}</span> products found
                        </span>
                        {realTimeUpdates > 0 && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1 text-green-600 font-semibold"
                          >
                            <FiZap className="w-3.5 h-3.5" />
                            {realTimeUpdates} update{realTimeUpdates > 1 ? 's' : ''}
                          </motion.span>
                        )}
                      </p>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {/* Refresh Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => productsQuery.refetch()}
                        disabled={productsLoading}
                        className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-primary-50 hover:to-primary-100 text-gray-700 hover:text-primary-600 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md border border-gray-200"
                      >
                        <FiRefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </motion.button>

                      {/* Mobile Filter Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMobileFiltersOpen(true)}
                        className="lg:hidden flex-1 md:flex-initial btn btn-primary flex items-center justify-center gap-2 shadow-md"
                      >
                        <FiFilter className="w-5 h-5" />
                        Filters
                        {[filters.search, filters.category, filters.subCategory, filters.brand, filters.minPrice, filters.maxPrice, filters.featured, filters.isNew].filter(Boolean).length > 0 && (
                          <span className="bg-white text-primary-600 text-xs px-2 py-1 rounded-full font-bold">
                            {[filters.search, filters.category, filters.subCategory, filters.brand, filters.minPrice, filters.maxPrice, filters.featured, filters.isNew].filter(Boolean).length}
                          </span>
                        )}
                      </motion.button>

                      {/* View Toggle */}
                      <div className="hidden md:flex gap-2 bg-gray-100 rounded-xl p-1">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewMode('grid')}
                          className={`p-2.5 rounded-lg transition-all ${
                            viewMode === 'grid'
                              ? 'bg-white text-primary-600 shadow-md'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title="Grid View"
                        >
                          <FiGrid className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setViewMode('list')}
                          className={`p-2.5 rounded-lg transition-all ${
                            viewMode === 'list'
                              ? 'bg-white text-primary-600 shadow-md'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title="List View"
                        >
                          <FiList className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Loading State */}
                {productsLoading && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"
                      >
                        <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-56 rounded-xl mb-4"></div>
                        <div className="bg-gray-200 h-4 rounded-lg mb-3"></div>
                        <div className="bg-gray-200 h-4 rounded-lg w-2/3 mb-4"></div>
                        <div className="bg-gray-200 h-10 rounded-lg"></div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Products Display - Enhanced with ProductCard Component */}
                {!productsLoading && products.length > 0 && (
                  <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                      // Grid View - 4 Columns on Desktop
                      <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      >
                        {products.map((product: any, index: number) => (
                          <motion.div
                            key={product._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.03, duration: 0.3 }}
                          >
                            <ProductCard
                              product={product}
                              onQuickView={setQuickViewProduct}
                              showRealTimeUpdates={true}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      // List View - Using ProductCardList component
                      <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        {products.map((product: any, index: number) => (
                          <motion.div
                            key={product._id}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <ProductCardList
                              product={product}
                              onQuickView={setQuickViewProduct}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* No Results */}
                {!productsLoading && products.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 bg-white rounded-2xl shadow-lg"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center"
                    >
                      <FiPackage className="w-16 h-16 text-gray-400" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-800">No products found</h3>
                    <p className="text-gray-600 mb-6 text-lg">
                      Try adjusting your filters or search terms
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSearchInput('');
                        setFilters({
                          page: 1,
                          limit: 20,
                          category: '',
                          subCategory: '',
                          brand: '',
                          minPrice: '',
                          maxPrice: '',
                          search: '',
                          sort: '-createdAt',
                          featured: '',
                          isNew: '',
                          inStock: 'true',
                        });
                      }}
                      className="btn btn-primary px-8 py-3 shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <FiX className="w-5 h-5" />
                      Clear All Filters
                    </motion.button>
                  </motion.div>
                )}

                {/* Pagination */}
                {!productsLoading && products.length > 0 && pagination.pages > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center items-center gap-3 mt-12 bg-white p-6 rounded-2xl shadow-lg"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page === 1}
                      className="btn btn-outline disabled:opacity-50 flex items-center gap-2 font-semibold"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                      Previous
                    </motion.button>

                    <div className="flex gap-2">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <motion.button
                            key={pageNum}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleFilterChange('page', pageNum)}
                            className={`px-5 py-3 rounded-xl font-bold transition-all ${
                              filters.page === pageNum
                                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pageNum}
                          </motion.button>
                        );
                      })}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page === pagination.pages}
                      className="btn btn-outline disabled:opacity-50 flex items-center gap-2 font-semibold"
                    >
                      Next
                      <FiChevronRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                )}
              </main>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}


export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
