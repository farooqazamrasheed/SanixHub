import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiEye, FiShoppingCart, FiCheck, FiTrendingDown, FiPackage } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAuthStore } from '@/store/useAuthStore';
import { wishlistAPI, cartAPI } from '@/lib/api';
import StarRating from './StarRating';
import { useProductUpdates } from '@/hooks/useProductUpdates';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
}

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  variant?: 'default' | 'compact' | 'large';
  showRealTimeUpdates?: boolean;
}

export default function ProductCard({ 
  product: initialProduct, 
  onQuickView, 
  variant = 'default',
  showRealTimeUpdates = true
}: ProductCardProps) {
  const [product, setProduct] = useState(initialProduct);
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [priceDropAlert, setPriceDropAlert] = useState<{ oldPrice: number; newPrice: number } | null>(null);
  const [stockAlert, setStockAlert] = useState<{ type: 'low' | 'out' | 'back' } | null>(null);
  
  const { addItem, setCart } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  
  // Sync product with initial product when it changes
  useEffect(() => {
    setProduct(initialProduct);
  }, [initialProduct]);

  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const secondaryImage = product.images?.[1] || primaryImage;
  const price = product.pricing?.salePrice || product.pricing?.basePrice || 0;
  const hasDiscount = product.pricing?.salePrice && product.pricing.salePrice < product.pricing.basePrice;
  const discountPercent = hasDiscount 
    ? Math.round(((product.pricing.basePrice - product.pricing.salePrice) / product.pricing.basePrice) * 100)
    : 0;
  const isOutOfStock = (product.inventory?.quantity || product.inventory?.stockQuantity || product.stock) === 0;
  const currentStock = product.inventory?.quantity || product.inventory?.stockQuantity || product.stock || 0;
  const isLowStock = currentStock > 0 && currentStock <= (product.inventory?.lowStockThreshold || 5);

  const inWishlist = isInWishlist(product._id);

  // Real-time product updates handler
  const handleProductUpdate = useCallback((data: any) => {
    console.log('🔄 Product update received:', data);
    
    setProduct((prevProduct) => {
      const updated = { ...prevProduct };
      
      // Update stock
      if (data.stock !== undefined) {
        if (!updated.inventory) updated.inventory = {};
        updated.inventory.quantity = data.stock;
        updated.inventory.stockQuantity = data.stock;
        updated.stock = data.stock;
        
        // Show stock alert
        if (data.stock === 0) {
          setStockAlert({ type: 'out' });
          setTimeout(() => setStockAlert(null), 5000);
        } else if (data.isLowStock) {
          setStockAlert({ type: 'low' });
          setTimeout(() => setStockAlert(null), 5000);
        } else if (prevProduct.inventory?.quantity === 0 && data.stock > 0) {
          setStockAlert({ type: 'back' });
          setTimeout(() => setStockAlert(null), 5000);
        }
      }
      
      // Update price
      if (data.price !== undefined && data.oldPrice !== undefined) {
        if (!updated.pricing) {
          updated.pricing = { basePrice: data.price, salePrice: data.price };
        }
        updated.pricing.salePrice = data.price;
        
        // Show price drop alert
        if (data.price < data.oldPrice) {
          setPriceDropAlert({ oldPrice: data.oldPrice, newPrice: data.price });
          setTimeout(() => setPriceDropAlert(null), 6000);
        }
      }
      
      return updated;
    });
  }, []);

  // Subscribe to real-time updates
  useProductUpdates(
    showRealTimeUpdates ? product._id : undefined,
    handleProductUpdate
  );

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock || isAddingToCart) return;

    setIsAddingToCart(true);

    try {
      // If authenticated, add to backend cart
      if (isAuthenticated) {
        const response = await cartAPI.addItem({ productId: product._id, quantity: 1 }) as any;
        
        if (response.success) {
          // Update local store with backend data
          const cartItems = response.data.cart.items.map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
          }));
          setCart(cartItems);
          
          toast.success('Added to cart!');
          showNotification('success', 'Added to cart!');
          setAddedToCart(true);
          setTimeout(() => setAddedToCart(false), 2000);
        }
      } else {
        // Guest user - add to local store only
        addItem({
          product: product,
          quantity: 1,
        });
        
        toast.success('Added to cart!');
        showNotification('success', 'Added to cart!');
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      }
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      
      if (error.response?.data?.error?.code === 'INSUFFICIENT_STOCK') {
        toast.error('Not enough stock available');
        showNotification('error', 'Not enough stock available');
      } else {
        toast.error('Failed to add to cart');
        showNotification('error', 'Failed to add to cart');
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
    
    console.log('🩷 Wishlist clicked!', {
      productId: product._id,
      productName: product.name.en,
      inWishlist,
      isAuthenticated
    });
    
    if (inWishlist) {
      // Remove from wishlist
      console.log('➖ Removing from wishlist...');
      removeFromWishlist(product._id);
      
      // If authenticated, also remove from backend
      if (isAuthenticated) {
        try {
          console.log('🔄 Removing from backend...');
          const response = await wishlistAPI.removeFromWishlist(product._id);
          console.log('✅ Removed from backend:', response);
          // Trigger wishlist update event
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error) {
          console.error('❌ Failed to remove from backend wishlist:', error);
        }
      }
      
      toast.success('Removed from wishlist');
      showNotification('success', 'Removed from wishlist');
    } else {
      // Add to local store first (for immediate UI feedback)
      console.log('➕ Adding to local wishlist...');
      addToWishlist({
        productId: product._id,
        name: product.name.en,
        price: price,
        image: primaryImage?.url || '/placeholder.png',
        slug: product.slug,
        stock: currentStock,
      });
      console.log('✅ Added to local storage');
      
      // If authenticated, also add to backend
      if (isAuthenticated) {
        try {
          console.log('🔄 Adding to backend...', product._id);
          const response = await wishlistAPI.addToWishlist(product._id);
          console.log('✅ Added to backend:', response);
          // Trigger wishlist update event
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error: any) {
          console.error('❌ Failed to add to backend wishlist:', error);
          // If already in wishlist, that's fine
          if (error.response?.data?.error?.code === 'ALREADY_IN_WISHLIST') {
            console.log('ℹ️ Already in backend wishlist');
          } else {
            console.error('❌ Backend error details:', error.response?.data);
          }
          // Keep in local store even if backend fails
        }
      } else {
        console.log('⚠️ Not authenticated - only saved to local storage');
      }
      
      toast.success('Added to wishlist!');
      showNotification('success', 'Added to wishlist!');
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-semibold whitespace-nowrap ${
              notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Drop Alert */}
      <AnimatePresence>
        {priceDropAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold whitespace-nowrap flex items-center gap-2"
          >
            <FiTrendingDown className="w-4 h-4" />
            Price dropped! Save PKR {(priceDropAlert.oldPrice - priceDropAlert.newPrice).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Alert */}
      <AnimatePresence>
        {stockAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-semibold whitespace-nowrap flex items-center gap-2 ${
              stockAlert.type === 'out' ? 'bg-red-500' : 
              stockAlert.type === 'low' ? 'bg-orange-500' : 
              'bg-green-500'
            }`}
          >
            <FiPackage className="w-4 h-4" />
            {stockAlert.type === 'out' ? 'Out of stock!' : 
             stockAlert.type === 'low' ? `Only ${currentStock} left!` : 
             'Back in stock!'}
          </motion.div>
        )}
      </AnimatePresence>

      <Link href={`/products/${product.slug}`} className="block">
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 relative group-hover:scale-[1.01]">
          {/* Image Container */}
          <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            {/* Primary Image with Zoom Effect */}
            <div className="relative w-full h-full">
              <Image
                src={primaryImage?.url || '/placeholder.png'}
                alt={product.name.en}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-contain p-4 transition-all duration-500 ${
                  isHovered && secondaryImage !== primaryImage 
                    ? 'opacity-0 scale-110' 
                    : 'opacity-100 scale-100 group-hover:scale-110'
                }`}
              />
              
              {/* Secondary Image on Hover with Zoom */}
              {secondaryImage !== primaryImage && (
                <Image
                  src={secondaryImage?.url || '/placeholder.png'}
                  alt={product.name.en}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className={`object-contain p-4 transition-all duration-500 ${
                    isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                  }`}
                />
              )}
            </div>

            {/* Enhanced Badges with Animation */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
              {product.isNew && (
                <motion.span
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 backdrop-blur-sm"
                >
                  <span className="text-xs">✨</span> NEW
                </motion.span>
              )}
              {hasDiscount && (
                <motion.span
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm"
                >
                  -{discountPercent}% OFF
                </motion.span>
              )}
              {product.isFeatured && (
                <motion.span
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm"
                >
                  ⭐ Featured
                </motion.span>
              )}
            </div>

            {/* Enhanced Stock Badge with Real-time Updates */}
            {isOutOfStock && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20"
              >
                <div className="text-center">
                  <span className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-lg text-lg font-bold shadow-2xl block">
                    Out of Stock
                  </span>
                  <p className="text-white text-sm mt-2">Add to wishlist for updates</p>
                </div>
              </motion.div>
            )}
            {isLowStock && !isOutOfStock && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute bottom-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm flex items-center gap-1 z-10"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  🔥
                </motion.span>
                Only {currentStock} left!
              </motion.div>
            )}

            {/* Brand Badge - Bottom Left */}
            {product.brand && !isLowStock && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-3 left-3 bg-primary-600 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold shadow-md uppercase tracking-wide z-10"
              >
                {typeof product.brand === 'string' ? product.brand : product.brand.name.en}
              </motion.div>
            )}

            {/* Quick Actions - Enhanced with Icons */}
            <motion.div
              initial={false}
              animate={{
                opacity: isHovered ? 1 : 0,
                x: isHovered ? 0 : 20,
              }}
              transition={{ duration: 0.3 }}
              className="absolute top-3 right-3 flex flex-col gap-2"
            >
              {onQuickView && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleQuickView}
                  className="bg-white/90 backdrop-blur-sm hover:bg-primary-600 hover:text-white text-gray-700 p-2 rounded-full shadow-lg transition-all duration-200 group/btn"
                  title="Quick View"
                >
                  <FiEye className="w-4 h-4 group-hover/btn:animate-pulse" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleWishlist}
                className={`backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 ${
                  inWishlist
                    ? 'bg-red-500 text-white'
                    : 'bg-white/90 hover:bg-red-500 hover:text-white text-gray-700'
                }`}
                title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <FiHeart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
              </motion.button>
            </motion.div>

            {/* Image Gallery Indicators - Enhanced */}
            {product.images && product.images.length > 1 && (
              <motion.div
                initial={false}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  y: isHovered ? 0 : 10,
                }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full"
              >
                {product.images.slice(0, 4).map((img, idx: number) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.2 }}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                      idx === imageIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/60 hover:bg-white/80'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageIndex(idx);
                    }}
                  />
                ))}
              </motion.div>
            )}

          </div>

          {/* Product Info */}
          <div className="p-3">
            {/* Product Name - Increased font size */}
            <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200 min-h-[2.5rem]">
              {product.name.en}
            </h3>

            {/* Size and Rating - Same Line */}
            <div className="flex items-center justify-between mb-2">
              {/* Size - Left */}
              {product.size ? (
                <div className="text-sm text-gray-600 font-medium">
                  Size: <span className="text-gray-800 font-semibold">{product.size}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Size: N/A
                </div>
              )}
              
              {/* Rating - Right */}
              <div className="flex items-center">     
                <StarRating rating={product.stats?.rating || 0} size="sm" />
              </div>
            </div>

            {/* Price with improved visual hierarchy - Better spacing */}
            <div className="mb-2 bg-gray-50 -mx-3 px-3 py-2">
              <div className="flex items-baseline gap-1.5 flex-wrap">
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

            {/* Enhanced Add to Cart Button with Loading State */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart}
              whileHover={{ scale: (isOutOfStock || isAddingToCart) ? 1 : 1.02 }}
              whileTap={{ scale: (isOutOfStock || isAddingToCart) ? 1 : 0.98 }}
              className={`w-full py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
                isOutOfStock
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isAddingToCart
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-wait'
                  : addedToCart
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-primary-200'
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
                  Added to Cart!
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
