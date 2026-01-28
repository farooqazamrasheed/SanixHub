import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiHeart, FiEye, FiShoppingCart, FiCheck } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAuthStore } from '@/store/useAuthStore';
import { wishlistAPI, cartAPI } from '@/lib/api';
import StarRating from './StarRating';
import toast from 'react-hot-toast';

interface ProductImage {
  url: string;
  isPrimary?: boolean;
}

interface ProductPricing {
  basePrice: number;
  salePrice?: number;
}

interface ProductInventory {
  quantity?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

interface ProductBrand {
  _id: string;
  name: { en: string };
  slug?: string;
}

interface ProductStats {
  rating?: number;
  reviewCount?: number;
}

interface Product {
  _id: string;
  name: { en: string };
  slug: string;
  productId?: string;
  images: ProductImage[];
  pricing: ProductPricing;
  inventory?: ProductInventory;
  stock?: number;
  brand?: ProductBrand | string;
  stats?: ProductStats;
  isNew?: boolean;
  isFeatured?: boolean;
  size?: string;
  description?: { en: string };
  shortDescription?: { en: string };
}

interface ProductCardListProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export default function ProductCardList({ product, onQuickView }: ProductCardListProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const { addItem, setCart } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const price = product.pricing?.salePrice || product.pricing?.basePrice || 0;
  const hasDiscount = product.pricing?.salePrice && product.pricing.salePrice < product.pricing.basePrice;
  const discountPercent = hasDiscount 
    ? Math.round(((product.pricing.basePrice - product.pricing.salePrice) / product.pricing.basePrice) * 100)
    : 0;
  const isOutOfStock = (product.inventory?.quantity || product.inventory?.stockQuantity || product.stock) === 0;
  const currentStock = product.inventory?.quantity || product.inventory?.stockQuantity || product.stock || 0;
  const isLowStock = currentStock > 0 && currentStock <= (product.inventory?.lowStockThreshold || 5);

  const inWishlist = isInWishlist(product._id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock || isAddingToCart) return;

    setIsAddingToCart(true);

    try {
      if (isAuthenticated) {
        const response = await cartAPI.addItem({ productId: product._id, quantity: 1 }) as any;
        
        if (response.success) {
          const cartItems = response.data.cart.items.map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
          }));
          setCart(cartItems);
          
          toast.success('Added to cart!');
          setAddedToCart(true);
          setTimeout(() => setAddedToCart(false), 2000);
        }
      } else {
        addItem({
          product: product,
          quantity: 1,
        });
        
        toast.success('Added to cart!');
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      }
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      
      if (error.response?.data?.error?.code === 'INSUFFICIENT_STOCK') {
        toast.error('Not enough stock available');
      } else {
        toast.error('Failed to add to cart');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inWishlist) {
      removeFromWishlist(product._id);
      
      if (isAuthenticated) {
        try {
          await wishlistAPI.removeFromWishlist(product._id);
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error) {
          console.error('Failed to remove from backend wishlist:', error);
        }
      }
      
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        productId: product._id,
        name: product.name.en,
        price: price,
        image: primaryImage?.url || '/placeholder.png',
        slug: product.slug,
        stock: currentStock,
      });
      
      if (isAuthenticated) {
        try {
          await wishlistAPI.addToWishlist(product._id);
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error: any) {
          console.error('Failed to add to backend wishlist:', error);
        }
      }
      
      toast.success('Added to wishlist!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <Link href={`/products/${product.slug}`}>
        <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex items-center gap-4 p-4">
          {/* Product Image */}
          <div className="relative w-32 h-32 flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
            <Image
              src={primaryImage?.url || '/placeholder.png'}
              alt={product.name.en}
              fill
              className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNew && (
                <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                  NEW
                </span>
              )}
              {hasDiscount && (
                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {/* Brand */}
                {product.brand && (
                  <div className="inline-block bg-primary-600 text-white px-2 py-0.5 rounded text-[9px] font-semibold uppercase mb-1">
                    {typeof product.brand === 'string' ? product.brand : product.brand.name.en}
                  </div>
                )}
                
                {/* Product Name */}
                <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary-600 transition-colors">
                  {product.name.en}
                </h3>
              </div>

              {/* Quick Actions */}
              <motion.div
                initial={false}
                animate={{
                  opacity: isHovered ? 1 : 0,
                }}
                className="flex gap-1"
              >
                {onQuickView && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleQuickView}
                    className="bg-white hover:bg-primary-600 hover:text-white text-gray-700 p-1.5 rounded-full shadow-md transition-all"
                    title="Quick View"
                  >
                    <FiEye className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWishlist}
                  className={`p-1.5 rounded-full shadow-md transition-all ${
                    inWishlist
                      ? 'bg-red-500 text-white'
                      : 'bg-white hover:bg-red-500 hover:text-white text-gray-700'
                  }`}
                  title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <FiHeart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-current' : ''}`} />
                </motion.button>
              </motion.div>
            </div>

            {/* Description */}
            {product.shortDescription?.en && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {product.shortDescription.en}
              </p>
            )}

            {/* Size and Rating */}
            <div className="flex items-center gap-3 mb-2">
              {product.size && (
                <div className="text-xs text-gray-600">
                  Size: <span className="font-semibold text-gray-800">{product.size}</span>
                </div>
              )}
              <div className="flex items-center">
                <StarRating rating={product.stats?.rating || 0} size="sm" />
              </div>
              {isLowStock && (
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-semibold">
                  Only {currentStock} left
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 mb-2">
              {hasDiscount && (
                <span className="text-gray-400 line-through text-xs">
                  PKR {product.pricing.basePrice.toLocaleString()}
                </span>
              )}
              <span className={`font-bold text-lg ${hasDiscount ? 'text-blue-600' : 'text-primary-600'}`}>
                PKR {price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <div className="flex-shrink-0">
            <motion.button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart}
              whileHover={{ scale: (isOutOfStock || isAddingToCart) ? 1 : 1.05 }}
              whileTap={{ scale: (isOutOfStock || isAddingToCart) ? 1 : 0.95 }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                isOutOfStock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isAddingToCart
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-wait'
                  : addedToCart
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
              }`}
            >
              {isAddingToCart ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Adding...
                </>
              ) : addedToCart ? (
                <>
                  <FiCheck className="w-4 h-4" />
                  Added!
                </>
              ) : (
                <>
                  <FiShoppingCart className="w-4 h-4" />
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
