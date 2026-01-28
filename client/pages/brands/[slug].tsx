import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { FiExternalLink, FiPackage, FiArrowLeft } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';

interface Product {
  _id: string;
  name: { en: string; ur: string };
  slug: string;
  pricing: {
    basePrice: number;
    salePrice?: number;
    discount: number;
  };
  images: Array<{ url: string; isPrimary: boolean }>;
  rating: number;
  reviewCount: number;
  inStock: boolean;
}

export default function BrandPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { t, i18n } = useTranslation('common');
  const isUrdu = i18n.language === 'ur';

  // Fetch brand details
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: ['brand', slug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/brands/${slug}`
      );
      if (!res.ok) throw new Error('Brand not found');
      return res.json();
    },
    enabled: !!slug
  });

  // Fetch brand products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', slug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products?brand=${brandData?.data?.brand?.name}`
      );
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: !!brandData?.data?.brand?.name
  });

  if (brandLoading || productsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const brand = brandData?.data?.brand;
  const products = productsData?.data?.products || [];

  if (!brand) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-3xl font-bold mb-4">Brand Not Found</h1>
          <p className="text-gray-600 mb-8">The brand you're looking for doesn't exist.</p>
          <Link href="/brands" className="btn btn-primary">
            View All Brands
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-6">
        <BackButton href="/brands" label="Back to Brands" variant="ghost" />
      </div>

      {/* Brand Header */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16 mt-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Brand Logo */}
            {brand.image ? (
              <div className="bg-white rounded-xl p-6 shadow-xl">
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="h-32 w-32 object-contain"
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-xl">
                <div className="h-32 w-32 flex items-center justify-center">
                  <span className="text-6xl font-bold text-primary-600">
                    {brand.name.charAt(0)}
                  </span>
                </div>
              </div>
            )}

            {/* Brand Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{brand.name}</h1>
              {brand.description && (
                <p className="text-primary-100 text-lg mb-4 max-w-2xl">
                  {brand.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2">
                  <FiPackage />
                  <span>{brand.productCount} Products</span>
                </div>
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white text-primary-600 rounded-full px-4 py-2 hover:bg-primary-50 transition-colors"
                  >
                    Visit Website <FiExternalLink />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Products by {brand.name}</h2>

        {products.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold mb-2">No Products Available</h3>
            <p className="text-gray-600">
              This brand doesn't have any products listed yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: Product) => {
              const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
              const displayName = isUrdu ? product.name.ur : product.name.en;
              const finalPrice = product.pricing.salePrice || product.pricing.basePrice;

              return (
                <Link
                  key={product._id}
                  href={`/products/${product.slug}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {primaryImage ? (
                      <img
                        src={primaryImage.url}
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiPackage className="text-6xl" />
                      </div>
                    )}
                    {product.pricing.discount > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                        -{product.pricing.discount}%
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {displayName}
                    </h3>

                    {/* Price */}
                    <div className="mb-3">
                      <span className="text-xl font-bold text-primary-600">
                        Rs. {finalPrice.toLocaleString()}
                      </span>
                      {product.pricing.salePrice && (
                        <span className="ml-2 text-sm text-gray-500 line-through">
                          Rs. {product.pricing.basePrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="text-sm">
                      {product.inStock ? (
                        <span className="text-green-600">✓ In Stock</span>
                      ) : (
                        <span className="text-red-600">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
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
