import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FiGrid, FiList, FiFilter, FiChevronDown, FiShoppingCart, FiStar, FiHeart, FiTag, FiPackage, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import Layout from '@/components/Layout';
import BackButton from '@/components/BackButton';
import ProductCard from '@/components/ProductCard';
import ProductCardList from '@/components/ProductCardList';
import { categoriesAPI, productsAPI } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import toast from 'react-hot-toast';

export default function CategoryPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { slug } = router.query;
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, items: wishlistItems } = useWishlistStore();

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating' | 'newest'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  // Fetch category details
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesAPI.getBySlug(slug as string),
    enabled: !!slug,
  });

  const category = categoryData?.data?.category;
  const subcategories = categoryData?.data?.subcategories || [];

  // Fetch products in this category with real-time updates
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['category-products', category?._id],
    queryFn: () => productsAPI.getAll({ category: category._id, limit: 50 }),
    enabled: !!category?._id,
  });

  const products = productsData?.data?.products || [];

  // WebSocket for real-time updates
  useEffect(() => {
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();
    
    if (!socket) return;
    
    const handleProductCreated = (data: any) => {
      if (data.product?.category === category?._id) {
        refetchProducts();
        toast.success(`✨ New product added: ${data.product?.name?.en || 'Product'}`, { duration: 3000 });
      }
    };
    
    const handleProductUpdated = (data: any) => {
      if (data.product?.category === category?._id) {
        refetchProducts();
      }
    };
    
    const handleInventoryUpdate = (data: any) => {
      refetchProducts();
    };
    
    socket.on('product:created', handleProductCreated);
    socket.on('product:updated', handleProductUpdated);
    socket.on('inventory:updated', handleInventoryUpdate);
    
    return () => {
      if (socket) {
        socket.off('product:created', handleProductCreated);
        socket.off('product:updated', handleProductUpdated);
        socket.off('inventory:updated', handleInventoryUpdate);
      }
    };
  }, [category?._id, refetchProducts]);

  // Filter and sort products
  const filteredProducts = products.filter((product: any) => {
    const price = product.pricing?.salePrice || 0;
    return price >= priceRange[0] && price <= priceRange[1];
  });

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'name':
        return a.name.en.localeCompare(b.name.en);
      case 'price-low':
        return (a.pricing?.salePrice || 0) - (b.pricing?.salePrice || 0);
      case 'price-high':
        return (b.pricing?.salePrice || 0) - (a.pricing?.salePrice || 0);
      case 'rating':
        return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-6">The category you're looking for doesn't exist.</p>
          <Link href="/categories" className="btn btn-primary">
            Browse All Categories
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <NextSeo
        title={`${category.name.en} - SanixHub`}
        description={category.description?.en || `Browse ${category.name.en} products at SanixHub`}
      />

      {/* Back Button */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <BackButton href="/categories" label="Back to Categories" variant="ghost" />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-primary-600">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/categories" className="text-gray-600 hover:text-primary-600">Categories</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-semibold">{category.name.en}</span>
          </nav>
        </div>
      </div>

      {/* Category Header - Enhanced with Animations */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-6 relative overflow-hidden">
        {/* Animated Background Patterns */}
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
          className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"
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
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Category Badge */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-2 border border-white/30"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <FiTag className="w-3 h-3" />
              </motion.div>
              <span className="font-semibold text-xs">Category</span>
            </motion.div>

            {/* Title with Stagger Animation */}
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2"
            >
              {category.name.en}
              {category.name.ur && (
                <motion.span 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base md:text-lg font-urdu text-primary-100"
                >
                  {category.name.ur}
                </motion.span>
              )}
            </motion.h1>

            {/* Description with Fade */}
            {category.description?.en && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-primary-100 max-w-2xl mb-2"
              >
                {category.description.en}
              </motion.p>
            )}

            {/* Stats with Stagger */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3 mt-2"
            >
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-1.5 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20"
              >
                <FiPackage className="w-3.5 h-3.5" />
                <span className="font-semibold">{sortedProducts.length} Products</span>
              </motion.div>
              {subcategories.length > 0 && (
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-1.5 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20"
                >
                  <FiGrid className="w-3.5 h-3.5" />
                  <span className="font-semibold">{subcategories.length} Subcategories</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Subcategories - Enhanced with Animations */}
        {subcategories.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-md border border-gray-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-primary-600 to-purple-600 rounded-full"></div>
              <h2 className="text-base font-bold text-gray-900">Subcategories</h2>
              <motion.span 
                whileHover={{ scale: 1.1 }}
                className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-bold"
              >
                {subcategories.length}
              </motion.span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {subcategories.map((subcat: any, index: number) => (
                <motion.div
                  key={subcat._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={`/categories/${subcat.slug}`}>
                    <div className="bg-white hover:bg-primary-50 rounded-lg p-3 text-center transition-all border border-gray-200 hover:border-primary-300 hover:shadow-md group">
                      <motion.p 
                        className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors"
                      >
                        {subcat.name.en}
                      </motion.p>
                      {subcat.name.ur && (
                        <p className="text-xs text-gray-500 font-urdu truncate mt-1">{subcat.name.ur}</p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Toolbar - Enhanced with Animations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 p-4 mb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Sort Section */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-3"
            >
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4 text-primary-600" />
                Sort:
              </label>
              <motion.select
                whileFocus={{ scale: 1.02 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input input-sm border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              >
                <option value="name">Name</option>
                <option value="price-low">💰 Price: Low to High</option>
                <option value="price-high">💸 Price: High to Low</option>
                <option value="rating">⭐ Top Rated</option>
                <option value="newest">🆕 Newest</option>
              </motion.select>
            </motion.div>

            {/* View Mode & Filters */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-2"
            >
              {/* Grid Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiGrid className="w-4 h-4" />
              </motion.button>

              {/* List Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiList className="w-4 h-4" />
              </motion.button>

              {/* Filters Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn-sm flex items-center gap-2 ${
                  showFilters 
                    ? 'btn-primary' 
                    : 'btn-outline'
                }`}
              >
                <motion.div
                  animate={showFilters ? { rotate: 180 } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FiFilter className="w-4 h-4" />
                </motion.div>
                Filters
                {showFilters && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-white text-primary-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <motion.div 
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  className="space-y-4"
                >
                  {/* Price Range */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800">
                      <FiDollarSign className="w-4 h-4 text-primary-600" />
                      Price Range
                    </label>
                    <div className="flex gap-3">
                      <motion.input 
                        whileFocus={{ scale: 1.02 }}
                        type="number" 
                        placeholder="Min (PKR)" 
                        value={priceRange[0]} 
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])} 
                        className="input input-sm flex-1 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                      <motion.input 
                        whileFocus={{ scale: 1.02 }}
                        type="number" 
                        placeholder="Max (PKR)" 
                        value={priceRange[1]} 
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])} 
                        className="input input-sm flex-1 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Showing: PKR {priceRange[0].toLocaleString()} - PKR {priceRange[1].toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02, x: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPriceRange([0, 100000])} 
                      className="btn btn-outline btn-sm flex-1"
                    >
                      Reset Filters
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowFilters(false)} 
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Apply
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Products */}
        <div>
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow">
              <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your filters</p>
              <button onClick={() => setPriceRange([0, 100000])} className="btn btn-primary">
                Reset Filters
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <motion.div key="grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sortedProducts.map((product: any, index: number) => (
                    <ProductCard key={product._id} product={product} index={index} />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="list" className="space-y-4">
                  {sortedProducts.map((product: any, index: number) => (
                    <ProductCardList key={product._id} product={product} index={index} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
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
