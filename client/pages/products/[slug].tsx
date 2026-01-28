import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { productsAPI, cartAPI, reviewAPI, wishlistAPI } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartSync } from '@/hooks/useCartSync';
import { useWishlistUpdates } from '@/hooks/useWishlistUpdates';
import { useProductPriceUpdates } from '@/hooks/useProductPriceUpdates';
import StarRating from '@/components/StarRating';
import ReviewList from '@/components/ReviewList';
import WriteReviewModal from '@/components/WriteReviewModal';
import RatingDistribution from '@/components/RatingDistribution';
import RatingSummary from '@/components/RatingSummary';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';
import { FiHeart, FiShoppingCart, FiTruck, FiShield, FiRefreshCw, FiStar } from 'react-icons/fi';

export default function ProductDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filterByRating, setFilterByRating] = useState<number | null>(null);
  const { addItem, setCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  
  // Real-time WebSocket sync
  useCartSync();
  useWishlistUpdates();
  
  // Real-time price updates
  useProductPriceUpdates((data) => {
    // If the price update is for this product, invalidate query to refetch
    if (productData?.data?.product?._id === data.productId) {
      console.log('💰 Price updated for current product, refetching...');
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      toast.success('Product price has been updated!', {
        icon: '💰',
        duration: 3000
      });
    }
  });

  // Fetch product
  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsAPI.getBySlug(slug as string),
    enabled: !!slug,
  });

  // Fetch related products
  const { data: relatedData } = useQuery({
    queryKey: ['related', productData?.data?.product?._id],
    queryFn: () => productsAPI.getRelated(productData.data.product._id),
    enabled: !!productData?.data?.product?._id,
  });

  const product = productData?.data?.product;
  const relatedProducts = relatedData?.data?.products || [];
  const inWishlist = product ? isInWishlist(product._id) : false;

  // Fetch wishlist from backend to check if product is in wishlist
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistAPI.getWishlist(),
    enabled: isAuthenticated,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Add to cart mutation for authenticated users
  const addToCartMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) => cartAPI.addItem(data),
    onSuccess: (response) => {
      // Update local cart with backend data
      if (response.data?.cart) {
        setCart(response.data.cart.items);
      }
      toast.success(`Added ${quantity} item(s) to cart!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to add to cart';
      toast.error(errorMessage);
    }
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    // Validate stock before adding
    if (product.inventory?.trackInventory && !product.inventory?.allowBackorder) {
      if (product.inventory.stockQuantity === 0) {
        toast.error('This product is currently out of stock');
        return;
      }
      
      if (quantity > product.inventory.stockQuantity) {
        toast.error(`Only ${product.inventory.stockQuantity} items available in stock`);
        return;
      }
    }
    
    console.log('🛒 Adding to cart:', { product, quantity });
    
    // If authenticated, save to backend first (it will validate stock)
    if (isAuthenticated) {
      console.log('🔐 User is authenticated, saving to backend...');
      addToCartMutation.mutate({
        productId: product._id,
        quantity: quantity
      });
    } else {
      // For guest users, add to local store
      addItem({ product, quantity });
      toast.success(`Added ${quantity} item(s) to cart!`);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      router.push(`/login?redirect=${router.asPath}`);
      return;
    }

    try {
      console.log('💗 Wishlist toggle clicked for product:', product._id);
      if (isInWishlist(product._id)) {
        console.log('🗑️ Product is in wishlist, removing...');
        try {
          // Call backend API to remove from wishlist
          const response = await wishlistAPI.removeFromWishlist(product._id);
          console.log('✅ Backend response (remove):', response);
          // Update local store immediately for instant UI feedback
          removeFromWishlist(product._id);
          // WebSocket will sync the full data
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
          toast.error('Failed to remove from wishlist');
        }
      } else {
        console.log('➕ Product not in wishlist, adding...');
        try {
          // Call backend API to add to wishlist
          const response = await wishlistAPI.addToWishlist(product._id);
          console.log('✅ Backend response (add):', response);
          // Update local store immediately for instant UI feedback
          addToWishlist({
            productId: product._id,
            name: product.name.en,
            price: product.pricing.salePrice || product.pricing.basePrice,
            image: product.images[0]?.url || '',
            slug: product.slug
          });
          // WebSocket will sync the full data
        } catch (error) {
          console.error('Failed to add to wishlist:', error);
          toast.error('Failed to add to wishlist');
        }
      }
    } catch (error: any) {
      console.error('❌ Wishlist error:', error);
      console.error('Error details:', {
        response: error.response,
        message: error.message,
        data: error.response?.data,
        status: error.response?.status
      });
      
      // Check if it's actually an error or if wishlist was updated successfully
      if (error.response?.data?.success) {
        console.log('⚠️ False positive error - wishlist was updated successfully');
        return; // Don't show error toast if operation succeeded
      }
      
      // Handle specific error codes
      if (error.response?.data?.error?.code === 'ALREADY_IN_WISHLIST') {
        console.log('ℹ️ Product already in wishlist - not showing error');
        toast.info('Product is already in your wishlist', {
          icon: 'ℹ️',
          duration: 2000
        });
        return;
      }
      
      if (error.response?.data?.error?.code === 'PRODUCT_NOT_FOUND') {
        toast.error('Product not found or no longer available');
        return;
      }
      
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update wishlist';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-custom py-12">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-200 h-96 rounded-lg"></div>
              <div className="space-y-4">
                <div className="bg-gray-200 h-8 rounded w-3/4"></div>
                <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                <div className="bg-gray-200 h-32 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container-custom py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </Layout>
    );
  }

  const price = product.pricing.salePrice || product.pricing.basePrice;
  const hasDiscount = product.pricing.salePrice && product.pricing.salePrice < product.pricing.basePrice;
  const inStock = product.inventory?.stockQuantity > 0;

  return (
    <>
      <NextSeo
        title={`${product.name.en} - SanixHub`}
        description={product.shortDescription?.en || product.description.en}
        openGraph={{
          images: [{ url: product.images[0]?.url || '' }],
        }}
      />

      <Layout>
        <div className="bg-gray-50 py-8">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/products" label="Back to Products" variant="ghost" />
            </div>

            {/* Breadcrumb */}
            <nav className="text-sm mb-6">
              <Link href="/" className="text-primary-600 hover:underline">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/products" className="text-primary-600 hover:underline">Products</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-600">{product.name.en}</span>
            </nav>

            {/* Product Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Images */}
                <div>
                  <div className="relative h-96 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    {product.images[selectedImage]?.url && (
                      <Image
                        src={product.images[selectedImage].url}
                        alt={product.name.en}
                        fill
                        className="object-contain p-4"
                      />
                    )}
                    {hasDiscount && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg text-lg font-bold">
                        -{product.pricing.discount}% OFF
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Gallery */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {product.images.map((img: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden ${
                            selectedImage === index ? 'border-primary-600' : 'border-gray-200'
                          }`}
                        >
                          <Image
                            src={img.url}
                            alt={`${product.name.en} ${index + 1}`}
                            width={80}
                            height={80}
                            className="object-contain p-1"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div>
                  <h1 className="text-3xl font-bold mb-4">{product.name.en}</h1>
                  {product.name.ur && (
                    <p className="text-xl text-gray-600 font-urdu mb-4">{product.name.ur}</p>
                  )}

                  {/* Product ID & SKU */}
                  <div className="flex gap-4 mb-4 text-sm">
                    {product.productId && (
                      <div className="flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-lg">
                        <span className="text-gray-600">Product ID:</span>
                        <span className="font-mono font-semibold text-primary-700">{product.productId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-mono font-semibold text-gray-900">{product.sku}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(product.stats.rating) ? 'text-yellow-400 text-xl' : 'text-gray-300 text-xl'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-600">
                      {product.stats.rating.toFixed(1)} ({product.stats.reviewCount} reviews)
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {hasDiscount && (
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-gray-400 line-through text-2xl">
                          PKR {product.pricing.basePrice.toLocaleString()}
                        </span>
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
                          Save PKR {(product.pricing.basePrice - price).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="text-4xl font-bold text-primary-600">
                      PKR {price.toLocaleString()}
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="mb-6">
                    {inStock ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">In Stock ({product.inventory?.stockQuantity || 0} available)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  {inStock && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">
                        Quantity
                        {product.inventory?.trackInventory && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Max: {product.inventory?.stockQuantity || 999})
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 border rounded-lg hover:bg-gray-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={product.inventory?.stockQuantity || 999}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const maxStock = product.inventory?.trackInventory ? (product.inventory?.stockQuantity || 999) : 999;
                            setQuantity(Math.max(1, Math.min(maxStock, val)));
                          }}
                          className="w-20 text-center border rounded-lg py-2"
                        />
                        <button
                          onClick={() => setQuantity(Math.min(product.inventory?.stockQuantity || 999, quantity + 1))}
                          className="w-10 h-10 border rounded-lg hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={handleAddToCart}
                      disabled={!inStock}
                      className="flex-1 btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FiShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={!inStock}
                      className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Buy Now
                    </button>
                    
                    {/* Wishlist Button */}
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 border-2 rounded-lg transition-all duration-300 ${
                        isInWishlist(product._id)
                          ? 'bg-red-50 border-red-500 text-red-500 hover:bg-red-100'
                          : 'border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={isInWishlist(product._id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <FiHeart 
                        className={`w-6 h-6 transition-all duration-300 ${
                          isInWishlist(product._id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-semibold">{product.sku}</span>
                    </div>
                    {product.category && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <Link href={`/products?category=${product.category._id}`} className="text-primary-600 hover:underline">
                          {product.category.name?.en || product.category.name || 'Unknown'}
                        </Link>
                      </div>
                    )}
                    {product.brand && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Brand:</span>
                        <span className="font-semibold text-gray-900">{product.brand}</span>
                      </div>
                    )}
                    {product.size && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-semibold text-gray-900">{product.size}</span>
                      </div>
                    )}
                    {product.manufacturer && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="font-semibold text-gray-900">{product.manufacturer}</span>
                      </div>
                    )}
                    {product.origin && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Origin:</span>
                        <span className="font-semibold text-gray-900">{product.origin}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs: Description, Specifications, Reviews */}
            <div className="bg-white rounded-lg shadow-md mb-8">
              {/* Tab Headers */}
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`px-6 py-4 font-semibold ${
                      activeTab === 'description'
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveTab('specifications')}
                    className={`px-6 py-4 font-semibold ${
                      activeTab === 'specifications'
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Specifications
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-6 py-4 font-semibold flex items-center gap-2 ${
                      activeTab === 'reviews'
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FiStar className="w-4 h-4" />
                    Reviews
                    <span className="text-sm">({product.stats.reviewCount || 0})</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'description' && (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">{product.description.en}</p>
                  </div>
                )}

                {activeTab === 'specifications' && (
                  <div>
                    {product.specifications && product.specifications.length > 0 ? (
                      <table className="w-full">
                        <tbody>
                          {product.specifications.map((spec: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="py-3 font-semibold w-1/3">{spec.key.en}</td>
                              <td className="py-3">{spec.value.en}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-600">No specifications available</p>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    {/* Reviews Header with Write Review Button */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Customer Reviews</h3>
                      {isAuthenticated && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="btn btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                          <FiStar className="w-4 h-4" />
                          Write a Review
                        </button>
                      )}
                    </div>

                    {/* Rating Summary Cards */}
                    <div className="mb-8">
                      <RatingSummary stats={product.stats} />
                    </div>

                    {/* Rating Distribution and Reviews */}
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Left: Rating Distribution - 25% */}
                      <div className="w-full lg:w-1/4 flex-shrink-0">
                        <RatingDistribution 
                          stats={product.stats} 
                          onFilterByRating={setFilterByRating}
                          selectedRating={filterByRating}
                        />
                      </div>

                      {/* Right: Reviews List - 75% */}
                      <div className="w-full lg:w-3/4 flex-1">
                        <ReviewList 
                          productId={product._id}
                          filterByRating={filterByRating}
                          onFilterChange={setFilterByRating}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Write Review Modal */}
            <WriteReviewModal
              isOpen={showReviewModal}
              onClose={() => setShowReviewModal(false)}
              productId={product._id}
              productName={product.name.en}
            />

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Related Products</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {relatedProducts.slice(0, 4).map((related: any) => (
                    <RelatedProductCard key={related._id} product={related} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}


function RelatedProductCard({ product }: any) {
  const price = product.pricing.salePrice || product.pricing.basePrice;
  const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
        <div className="relative h-40 bg-gray-100">
          {primaryImage?.url && (
            <Image
              src={primaryImage.url}
              alt={product.name.en}
              fill
              className="object-contain p-2"
            />
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name.en}</h3>
          <p className="text-primary-600 font-bold">PKR {price.toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
