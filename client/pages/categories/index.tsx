import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiArrowRight, FiSearch, FiMail, FiPackage, FiTag, FiFilter, FiChevronDown, FiChevronUp, FiLayout, FiList } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { categoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const { t } = useTranslation('common');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'products' | 'recent'>('name');

  // Fetch categories with real-time updates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  });

  const categories = data?.data?.categories || [];

  // WebSocket for real-time category updates
  useEffect(() => {
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();
    
    if (!socket) return;
    
    const handleCategoryCreated = (data: any) => {
      refetch();
      toast.success(`✨ New category added: ${data.category?.name?.en || 'Category'}`, { duration: 3000 });
    };
    
    const handleCategoryUpdated = (data: any) => {
      refetch();
      toast.success(`📝 Category updated: ${data.category?.name?.en || 'Category'}`, { duration: 2000 });
    };
    
    socket.on('category:created', handleCategoryCreated);
    socket.on('category:updated', handleCategoryUpdated);
    
    return () => {
      if (socket) {
        socket.off('category:created', handleCategoryCreated);
        socket.off('category:updated', handleCategoryUpdated);
      }
    };
  }, [refetch]);

  // Separate root categories and subcategories
  const rootCategories = categories.filter((cat: any) => !cat.parentCategory);
  
  // Group subcategories by parent
  const categoriesByParent = categories.reduce((acc: any, cat: any) => {
    if (cat.parentCategory) {
      const parentId = cat.parentCategory._id || cat.parentCategory;
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(cat);
    }
    return acc;
  }, {});

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Filter categories by search term
  const filteredRootCategories = rootCategories.filter((cat: any) =>
    cat.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.name.ur?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort categories
  const sortedCategories = [...filteredRootCategories].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name':
        return a.name.en.localeCompare(b.name.en);
      case 'products':
        return (categoriesByParent[b._id]?.length || 0) - (categoriesByParent[a._id]?.length || 0);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  return (
    <Layout>
      <NextSeo
        title="Categories - SanixHub"
        description="Browse all product categories at SanixHub - Your trusted source for sanitary and plumbing products"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-12 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            >
              <FiGrid className="w-3 h-3" />
              Browse by Category
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Product Categories
            </h1>
            <p className="text-base md:text-lg text-primary-100 max-w-2xl mx-auto mb-4">
              Explore our wide range of sanitary and plumbing products organized by category
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-4 text-xs md:text-sm"
            >
              <div className="flex items-center gap-1.5">
                <FiPackage className="w-4 h-4" />
                <span>{rootCategories.length} Categories</span>
              </div>
              <div className="w-1 h-3 bg-white/30"></div>
              <div className="flex items-center gap-1.5">
                <FiTag className="w-4 h-4" />
                <span>1000+ Products</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 bg-gradient-to-b from-gray-50 to-white">
        {/* Filters & Controls Bar */}
        {!isLoading && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search Bar */}
              <div className="flex-1 w-full lg:max-w-md">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Sort & View Controls */}
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* Sort Dropdown */}
                <div className="relative flex-1 lg:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none w-full lg:w-auto pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 bg-white cursor-pointer font-medium text-gray-700 transition-all"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="products">Sort by Items</option>
                    <option value="recent">Sort by Recent</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
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

            {/* Active Filters */}
            {searchTerm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 font-medium">Active filters:</span>
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full flex items-center gap-2">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-primary-900">×</button>
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {isLoading ? (
          // Loading State
          <div className="space-y-12">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
              >
                <div className="grid grid-cols-1 md:grid-cols-3">
                  <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300"></div>
                  <div className="md:col-span-2 p-8">
                    <div className="h-8 bg-gray-200 rounded-lg mb-4 w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-3 w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          // Empty State
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center"
            >
              <FiGrid className="w-16 h-16 text-gray-400" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No Categories Available</h2>
            <p className="text-gray-600 mb-8 text-lg">Categories will appear here once added by administrators.</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/" className="btn btn-primary px-8 py-3 shadow-lg inline-flex items-center gap-2">
                <FiArrowRight className="w-5 h-5 rotate-180" />
                Back to Home
              </Link>
            </motion.div>
          </motion.div>
        ) : filteredRootCategories.length === 0 ? (
          // No Results State
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center"
            >
              <FiSearch className="w-16 h-16 text-gray-400" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No Categories Found</h2>
            <p className="text-gray-600 mb-8 text-lg">Try adjusting your search terms</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <button onClick={() => setSearchTerm('')} className="btn btn-primary px-8 py-3 shadow-lg inline-flex items-center gap-2">
                Clear Search
              </button>
            </motion.div>
          </motion.div>
        ) : (
          // Categories Display
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              // Grid View
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {sortedCategories.map((category: any, index: number) => {
                  const hasSubcategories = categoriesByParent[category._id]?.length > 0;
                  const isExpanded = expandedCategories.includes(category._id);

                  return (
                    <motion.div 
                      key={category._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:border-primary-300 transition-all"
                    >
                      {/* Parent Category Card */}
                      <div className="relative group">
                        <Link href={`/categories/${category.slug}`}>
                          <motion.div 
                            whileHover={{ scale: 1.005 }}
                            className="relative bg-gradient-to-br from-white to-gray-50 overflow-hidden"
                          >
                            <div className="flex flex-col md:flex-row">
                              {/* Category Image */}
                              <div className="relative md:w-64 h-48 md:h-44 overflow-hidden flex-shrink-0">
                                {(category.image?.url || category.image?.thumbnail || category.image) ? (
                                  <>
                                    <img
                                      src={category.image?.url || category.image?.thumbnail || category.image}
                                      alt={category.name?.en || 'Category'}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center">
                                    <motion.div
                                      animate={{ 
                                        rotate: [0, 360],
                                        scale: [1, 1.1, 1]
                                      }}
                                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    >
                                      <FiGrid className="w-16 h-16 text-white/30" />
                                    </motion.div>
                                  </div>
                                )}
                                
                                {/* Category Badge */}
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", delay: index * 0.1 }}
                                  className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                                >
                                  <FiPackage className="w-4 h-4 text-primary-600" />
                                  <span className="text-xs font-bold text-gray-800">Main Category</span>
                                </motion.div>

                                {/* Subcategory Count Badge */}
                                {hasSubcategories && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: index * 0.1 + 0.1 }}
                                    className="absolute bottom-3 right-3 bg-primary-600 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                                  >
                                    <FiTag className="w-3 h-3" />
                                    <span className="text-xs font-bold">{categoriesByParent[category._id].length}</span>
                                  </motion.div>
                                )}
                              </div>

                              {/* Category Info */}
                              <div className="flex-1 p-6 flex flex-col justify-center relative">
                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-60"></div>
                                <motion.div 
                                  animate={{ 
                                    rotate: [0, 360],
                                  }}
                                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                  className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-50 to-transparent rounded-tr-full opacity-60"
                                ></motion.div>
                                
                                <div className="relative z-10">
                                  <motion.h2 
                                    className="text-lg md:text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors flex items-center gap-2"
                                  >
                                    {category.name.en}
                                    {category.name.ur && (
                                      <span className="text-sm font-urdu text-gray-500">{category.name.ur}</span>
                                    )}
                                    <motion.div
                                      animate={{ x: [0, 5, 0] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <FiArrowRight className="w-5 h-5 text-primary-600" />
                                    </motion.div>
                                  </motion.h2>
                                  
                                  {category.description?.en && (
                                    <p className="text-gray-600 mb-3 line-clamp-1 text-xs">{category.description.en}</p>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-2">
                                    {hasSubcategories && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                        <FiTag className="w-3 h-3" />
                                        {categoriesByParent[category._id].length} Subcategories
                                      </span>
                                    )}
                                    <motion.span 
                                      whileHover={{ scale: 1.05 }}
                                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-md group-hover:shadow-lg transition-shadow"
                                    >
                                      <FiGrid className="w-3.5 h-3.5" />
                                      View
                                    </motion.span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </Link>

                        {/* Expand/Collapse Button for Subcategories */}
                        {hasSubcategories && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.preventDefault();
                              toggleCategory(category._id);
                            }}
                            className="absolute bottom-4 right-4 z-20 bg-white border-2 border-primary-600 text-primary-600 p-2.5 rounded-xl shadow-lg hover:bg-primary-600 hover:text-white transition-all"
                          >
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <FiChevronDown className="w-5 h-5" />
                            </motion.div>
                          </motion.button>
                        )}
                      </div>

                      {/* Subcategories - Expandable */}
                      <AnimatePresence>
                        {hasSubcategories && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden bg-gradient-to-br from-gray-50 to-white border-t-2 border-gray-100"
                          >
                            <div className="p-6">
                              <motion.h3 
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2"
                              >
                                <div className="w-1 h-6 bg-gradient-to-b from-primary-600 to-purple-600 rounded-full"></div>
                                <FiTag className="w-5 h-5 text-primary-600" />
                                Subcategories
                              </motion.h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {categoriesByParent[category._id].map((subcat: any, subIndex: number) => (
                                  <motion.div
                                    key={subcat._id}
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: subIndex * 0.05, duration: 0.3 }}
                                  >
                                    <Link href={`/categories/${subcat.slug}`}>
                                      <motion.div
                                        whileHover={{ y: -8, scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 p-4 group border-2 border-transparent hover:border-primary-300 relative overflow-hidden"
                                      >
                                        {/* Hover Gradient Background */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                          {(subcat.image?.url || subcat.image?.thumbnail || subcat.image) ? (
                                            <div className="w-20 h-20 mb-3 rounded-xl overflow-hidden shadow-md ring-2 ring-gray-100 group-hover:ring-primary-300 transition-all">
                                              <img
                                                src={subcat.image?.url || subcat.image?.thumbnail || subcat.image}
                                                alt={subcat.name?.en || 'Subcategory'}
                                                className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-500"
                                              />
                                            </div>
                                          ) : (
                                            <motion.div 
                                              whileHover={{ rotate: 360 }}
                                              transition={{ duration: 0.6 }}
                                              className="w-20 h-20 bg-gradient-to-br from-primary-100 to-purple-100 rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-all"
                                            >
                                              <FiTag className="w-10 h-10 text-primary-600" />
                                            </motion.div>
                                          )}
                                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-primary-600 transition-colors mb-1 line-clamp-2">
                                            {subcat.name.en}
                                          </h4>
                                          {subcat.name.ur && (
                                            <p className="text-[10px] text-gray-500 font-urdu line-clamp-1">{subcat.name.ur}</p>
                                          )}
                                          
                                          {/* Animated Arrow */}
                                          <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            whileHover={{ opacity: 1, y: 0 }}
                                            className="mt-2 text-primary-600"
                                          >
                                            <FiArrowRight className="w-4 h-4" />
                                          </motion.div>
                                        </div>
                                      </motion.div>
                                    </Link>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              // List View
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {sortedCategories.map((category: any, index: number) => {
                  const hasSubcategories = categoriesByParent[category._id]?.length > 0;
                  const isExpanded = expandedCategories.includes(category._id);

                  return (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-l-4 border-primary-600"
                    >
                      <div className="flex items-center p-4 gap-4">
                        {/* Category Image */}
                        <Link href={`/categories/${category.slug}`} className="flex-shrink-0">
                          {(category.image?.url || category.image?.thumbnail || category.image) ? (
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-20 h-20 rounded-xl overflow-hidden shadow-md"
                            >
                              <img
                                src={category.image?.url || category.image?.thumbnail || category.image}
                                alt={category.name?.en || 'Category'}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                          ) : (
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md"
                            >
                              <FiGrid className="w-10 h-10 text-white" />
                            </motion.div>
                          )}
                        </Link>

                        {/* Category Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/categories/${category.slug}`}>
                            <h3 className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors mb-1">
                              {category.name.en}
                            </h3>
                          </Link>
                          {category.name.ur && (
                            <p className="text-sm text-gray-500 font-urdu mb-2">{category.name.ur}</p>
                          )}
                          {category.description?.en && (
                            <p className="text-sm text-gray-600 line-clamp-1">{category.description.en}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {hasSubcategories && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                              <FiTag className="w-3 h-3" />
                              {categoriesByParent[category._id].length}
                            </span>
                          )}
                          
                          <Link href={`/categories/${category.slug}`}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-primary-600 text-white p-2.5 rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              <FiArrowRight className="w-5 h-5" />
                            </motion.button>
                          </Link>

                          {hasSubcategories && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleCategory(category._id)}
                              className="bg-gray-100 text-gray-700 p-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <FiChevronDown className="w-5 h-5" />
                              </motion.div>
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* Subcategories */}
                      <AnimatePresence>
                        {hasSubcategories && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-gray-50 border-t"
                          >
                            <div className="p-4 pl-8">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {categoriesByParent[category._id].map((subcat: any, subIndex: number) => (
                                  <motion.div
                                    key={subcat._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: subIndex * 0.05 }}
                                  >
                                    <Link href={`/categories/${subcat.slug}`}>
                                      <motion.div
                                        whileHover={{ x: 5 }}
                                        className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-3 border border-gray-100 hover:border-primary-300"
                                      >
                                        <FiTag className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">{subcat.name.en}</p>
                                          {subcat.name.ur && (
                                            <p className="text-xs text-gray-500 font-urdu truncate">{subcat.name.ur}</p>
                                          )}
                                        </div>
                                      </motion.div>
                                    </Link>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Call to Action */}
        {!isLoading && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 rounded-2xl p-6 text-center text-white shadow-2xl relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
            
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
                className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full mb-3"
              >
                <FiSearch className="w-6 h-6" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Can't find what you're looking for?</h2>
              <p className="mb-4 text-base md:text-lg text-primary-100 max-w-2xl mx-auto">
                Use our advanced search or contact us directly - we're here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/search" className="btn bg-white text-primary-600 hover:bg-gray-100 px-6 py-2 text-base font-bold shadow-xl inline-flex items-center gap-2">
                    <FiSearch className="w-4 h-4" />
                    Advanced Search
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/contact" className="btn bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-primary-600 px-6 py-2 text-base font-bold inline-flex items-center gap-2">
                    <FiMail className="w-4 h-4" />
                    Contact Us
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
