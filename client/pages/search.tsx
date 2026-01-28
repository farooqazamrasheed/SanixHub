import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { productsAPI, categoriesAPI } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';

export default function AdvancedSearchPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { addItem } = useCartStore();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: router.query.category || '',
    minPrice: router.query.minPrice || '',
    maxPrice: router.query.maxPrice || '',
    search: router.query.search || '',
    sort: router.query.sort || '-createdAt',
    featured: router.query.featured || '',
    isNew: router.query.isNew || '',
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  });

  // Fetch products with filters
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-search', filters],
    queryFn: () => productsAPI.getAll(filters),
  });

  const categories = categoriesData?.data?.categories || [];
  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination || {};

  useEffect(() => {
    // Update URL with filters
    const query: any = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'page' && key !== 'limit') {
        query[key] = value;
      }
    });
    if (filters.page > 1) query.page = filters.page;

    router.push({
      pathname: '/search',
      query,
    }, undefined, { shallow: true });
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      category: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      sort: '-createdAt',
      featured: '',
      isNew: '',
    });
  };

  const handleAddToCart = (product: any) => {
    addItem({
      product: product,
      quantity: 1,
    });
    toast.success('Added to cart!');
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'page' && key !== 'limit' && key !== 'sort'
  ).length;

  return (
    <Layout>
      <NextSeo
        title="Advanced Product Search - SanixHub"
        description="Search and filter through our complete product catalog"
      />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Search</h1>
          <p className="text-gray-600">
            Find exactly what you're looking for with our powerful search and filtering
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear All ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Keywords
                </label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
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

              {/* Sort Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="input w-full"
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
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.featured === 'true'}
                    onChange={(e) =>
                      handleFilterChange('featured', e.target.checked ? 'true' : '')
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Featured Products Only</span>
                </label>
              </div>

              {/* New Products Filter */}
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isNew === 'true'}
                    onChange={(e) =>
                      handleFilterChange('isNew', e.target.checked ? 'true' : '')
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">New Arrivals Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="lg:col-span-3">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isLoading ? (
                      'Loading...'
                    ) : (
                      <>
                        {pagination.total || 0} Products Found
                        {filters.search && (
                          <span className="text-gray-600 font-normal">
                            {' '}
                            for "{filters.search}"
                          </span>
                        )}
                      </>
                    )}
                  </h3>
                  {!isLoading && pagination.total > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
                  >
                    <div className="h-64 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!isLoading && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <div
                    key={product._id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group"
                  >
                    <Link href={`/products/${product.slug}`}>
                      <div className="relative h-64 bg-gray-100">
                        {product.images[0] && (
                          <Image
                            src={product.images[0].url}
                            alt={product.name.en}
                            fill
                            className="object-cover group-hover:scale-105 transition"
                          />
                        )}
                        {product.isFeatured && (
                          <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                            Featured
                          </span>
                        )}
                        {product.isNew && (
                          <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            New
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-semibold text-gray-900 mb-1 hover:text-primary-600 line-clamp-2">
                          {product.name.en}
                        </h3>
                      </Link>
                      {product.category && (
                        <p className="text-xs text-gray-500 mb-2">
                          {product.category.name.en}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        {product.pricing.compareAtPrice && (
                          <span className="text-sm text-gray-400 line-through">
                            PKR {product.pricing.compareAtPrice}
                          </span>
                        )}
                        <span className="text-lg font-bold text-primary-600">
                          PKR {product.pricing.salePrice}
                        </span>
                      </div>
                      {product.stats.averageRating > 0 && (
                        <div className="flex items-center gap-1 mb-3">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.round(product.stats.averageRating)
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-gray-600">
                            ({product.stats.totalReviews})
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn btn-primary w-full"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && products.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg
                  className="w-24 h-24 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or search terms
                </p>
                <button onClick={handleClearFilters} className="btn btn-primary">
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && products.length > 0 && pagination.pages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page === 1}
                  className="btn"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilters((prev) => ({ ...prev, page: i + 1 }))}
                      className={`px-4 py-2 rounded ${
                        pagination.page === i + 1
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                  className="btn"
                >
                  Next
                </button>
              </div>
            )}
          </main>
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
