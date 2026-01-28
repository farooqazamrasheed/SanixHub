import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { FiSearch, FiExternalLink } from 'react-icons/fi';

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  website?: string;
  productCount: number;
}

export default function BrandsPage() {
  const [search, setSearch] = useState('');

  // Fetch brands
  const { data: brandsData, isLoading } = useQuery({
    queryKey: ['public-brands', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('isActive', 'true');
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/brands?${params}`
      );
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    }
  });

  const brands = brandsData?.data?.brands || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Brands</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover premium brands we carry. Each brand is carefully selected to ensure quality and reliability.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-24 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Brands Grid */}
        {!isLoading && brands.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {brands.map((brand: Brand) => (
              <Link
                key={brand._id}
                href={`/brands/${brand.slug}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 group"
              >
                {/* Brand Logo */}
                {brand.image ? (
                  <div className="h-24 flex items-center justify-center mb-4">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center mb-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg">
                    <span className="text-3xl font-bold text-primary-600">
                      {brand.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Brand Info */}
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary-600 transition-colors">
                  {brand.name}
                </h3>
                
                {brand.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {brand.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {brand.productCount} {brand.productCount === 1 ? 'Product' : 'Products'}
                  </span>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      Website <FiExternalLink />
                    </a>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && brands.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-2xl font-bold mb-2">No brands found</h3>
            <p className="text-gray-600">
              {search ? 'Try adjusting your search' : 'No brands available at the moment'}
            </p>
          </div>
        )}

        {/* Stats Section */}
        {!isLoading && brands.length > 0 && (
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">{brands.length}</div>
                <div className="text-primary-100">Premium Brands</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">
                  {brands.reduce((sum: number, b: Brand) => sum + b.productCount, 0)}
                </div>
                <div className="text-primary-100">Total Products</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-primary-100">Quality Guaranteed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common']))
    }
  };
};
