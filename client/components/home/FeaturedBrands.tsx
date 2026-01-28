import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
}

export default function FeaturedBrands() {
  const { data: brandsData, isLoading } = useQuery({
    queryKey: ['featured-brands'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/brands?limit=8`
      );
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    }
  });

  const brands = brandsData?.data?.brands || [];

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Premium Brands</h2>
            <p className="text-gray-600 text-lg">
              Trusted brands delivering quality products
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Premium Brands</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover products from world-class brands we've carefully selected for quality and reliability
          </p>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          {brands.slice(0, 12).map((brand: Brand) => (
            <Link
              key={brand._id}
              href={`/brands/${brand.slug}`}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 group flex flex-col items-center justify-center"
            >
              {brand.image ? (
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="h-24 w-full object-contain mb-3 group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="h-24 w-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-bold text-primary-600">
                    {brand.name.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-center text-sm group-hover:text-primary-600 transition-colors">
                {brand.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {brand.productCount} {brand.productCount === 1 ? 'Product' : 'Products'}
              </p>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        {brands.length > 12 && (
          <div className="text-center">
            <Link
              href="/brands"
              className="inline-flex items-center gap-2 btn btn-primary"
            >
              View All Brands
              <FiArrowRight />
            </Link>
          </div>
        )}

        {/* Trust Banner */}
        <div className="mt-12 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Quality Guaranteed</h3>
          <p className="text-primary-100 max-w-2xl mx-auto">
            Every brand on our platform is carefully vetted to ensure you receive authentic, high-quality products
          </p>
        </div>
      </div>
    </section>
  );
}
