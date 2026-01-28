import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShoppingCart, FiHeart, FiMinus, FiPlus, FiCheck, FiZoomIn, FiZoomOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAuthStore } from '@/store/useAuthStore';
import { wishlistAPI } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface QuickViewModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, isInWishlist, removeItem: removeFromWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!product) return null;

  const price = product.pricing.salePrice || product.pricing.basePrice;
  const hasDiscount = product.pricing.salePrice && product.pricing.salePrice < product.pricing.basePrice;
  const discountPercent = hasDiscount 
    ? Math.round(((product.pricing.basePrice - product.pricing.salePrice) / product.pricing.basePrice) * 100)
    : 0;
  const isOutOfStock = product.inventory?.quantity === 0;
  const isLowStock = product.inventory?.quantity > 0 && product.inventory?.quantity <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    addItem({
      product: product,
      quantity: quantity,
    });

    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      onClose();
    }, 1500);
  };

  const incrementQuantity = () => {
    if (product.inventory?.quantity && quantity < product.inventory.quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const handleWishlist = async () => {
    const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0];
    const price = product.pricing.salePrice || product.pricing.basePrice;
    
    if (isInWishlist(product._id)) {
      // Remove from local store
      removeFromWishlist(product._id);
      
      // If authenticated, also remove from backend
      if (isAuthenticated) {
        try {
          await wishlistAPI.removeFromWishlist(product._id);
          // Trigger wishlist update event
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error) {
          console.error('Failed to remove from backend wishlist:', error);
        }
      }
    } else {
      // Add to local store first
      addToWishlist({
        productId: product._id,
        name: product.name.en,
        price: price,
        image: primaryImage?.url || '/placeholder.png',
        slug: product.slug,
      });
      
      // If authenticated, also add to backend
      if (isAuthenticated) {
        try {
          await wishlistAPI.addToWishlist(product._id);
          // Trigger wishlist update event
          window.dispatchEvent(new Event('wishlistUpdated'));
        } catch (error: any) {
          // If already in wishlist, that's fine
          if (error.response?.data?.error?.code !== 'ALREADY_IN_WISHLIST') {
            console.error('Failed to add to backend wishlist:', error);
          }
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 p-2 rounded-full shadow-lg transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>

              <div className="grid md:grid-cols-2 gap-8 p-8">
                {/* Left Side - Images */}
                <div>
                  {/* Main Image with Zoom */}
                  <div className="relative group">
                    <div 
                      className="relative h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden mb-4 cursor-crosshair"
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                    >
                      <Image
                        src={product.images[selectedImageIndex]?.url || '/placeholder.png'}
                        alt={product.name.en}
                        fill
                        className={`object-contain p-8 transition-transform duration-300 ${
                          isZoomed ? 'scale-150' : 'scale-100'
                        }`}
                        style={
                          isZoomed
                            ? {
                                transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                              }
                            : undefined
                        }
                      />
                      
                      {/* Enhanced Badges */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {product.isNew && (
                          <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm flex items-center gap-1"
                          >
                            <span>✨</span> NEW
                          </motion.span>
                        )}
                        {hasDiscount && (
                          <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm"
                          >
                            -{discountPercent}% OFF
                          </motion.span>
                        )}
                      </div>

                      {/* Zoom Indicator */}
                      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-opacity">
                        {isZoomed ? (
                          <>
                            <FiZoomOut className="w-4 h-4" />
                            <span className="text-xs">Zoomed</span>
                          </>
                        ) : (
                          <>
                            <FiZoomIn className="w-4 h-4" />
                            <span className="text-xs">Hover to zoom</span>
                          </>
                        )}
                      </div>

                      {/* Navigation Arrows */}
                      {product.images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <FiChevronLeft className="w-6 h-6" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <FiChevronRight className="w-6 h-6" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Image Counter */}
                    {product.images.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        {selectedImageIndex + 1} / {product.images.length}
                      </div>
                    )}
                  </div>

                  {/* Enhanced Thumbnail Images */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                      {product.images.map((img: any, idx: number) => (
                        <motion.button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === idx
                              ? 'border-primary-600 shadow-lg ring-2 ring-primary-200'
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                        >
                          <Image
                            src={img.url}
                            alt={`${product.name.en} - ${idx + 1}`}
                            fill
                            className="object-contain p-2"
                          />
                          {selectedImageIndex === idx && (
                            <div className="absolute inset-0 bg-primary-600/10" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side - Product Info */}
                <div className="flex flex-col">
                  {/* Brand */}
                  {product.brand?.name && (
                    <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                      {product.brand.name.en}
                    </p>
                  )}

                  {/* Product Name */}
                  <h2 className="text-3xl font-bold mb-2 text-gray-900">
                    {product.name.en}
                  </h2>

                  {/* Product ID */}
                  {product.productId && (
                    <p className="text-sm text-gray-500 mb-4">
                      Product ID: {product.productId}
                    </p>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= Math.round(product.stats.rating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-700 font-semibold">
                      {product.stats.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      ({product.stats.reviewCount} reviews)
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b">
                    <div className="flex items-center gap-3">
                      {hasDiscount && (
                        <span className="text-gray-400 line-through text-xl">
                          PKR {product.pricing.basePrice.toLocaleString()}
                        </span>
                      )}
                      <span className={`font-bold text-3xl ${hasDiscount ? 'text-red-600' : 'text-primary-600'}`}>
                        PKR {price.toLocaleString()}
                      </span>
                    </div>
                    {hasDiscount && (
                      <p className="text-green-600 font-semibold mt-1">
                        You save PKR {(product.pricing.basePrice - price).toLocaleString()} ({discountPercent}% off)
                      </p>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="mb-6">
                    {isOutOfStock ? (
                      <span className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-semibold">
                        Only {product.inventory.quantity} left in stock!
                      </span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-lg font-semibold">
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {product.description?.en && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2 text-gray-900">Description</h3>
                      <p className="text-gray-600 line-clamp-3">
                        {product.description.en}
                      </p>
                    </div>
                  )}

                  {/* Category */}
                  {product.category?.name && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600">
                        Category: <span className="text-primary-600 font-semibold">{product.category.name.en}</span>
                      </p>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  {!isOutOfStock && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold mb-2 text-gray-900">
                        Quantity
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border-2 border-gray-300 rounded-lg">
                          <button
                            onClick={decrementQuantity}
                            className="p-3 hover:bg-gray-100 transition-colors"
                            disabled={quantity <= 1}
                          >
                            <FiMinus className="w-5 h-5" />
                          </button>
                          <span className="px-6 py-3 font-semibold text-lg">
                            {quantity}
                          </span>
                          <button
                            onClick={incrementQuantity}
                            className="p-3 hover:bg-gray-100 transition-colors"
                            disabled={product.inventory?.quantity && quantity >= product.inventory.quantity}
                          >
                            <FiPlus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 mt-auto">
                    <motion.button
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      whileHover={{ scale: isOutOfStock ? 1 : 1.02 }}
                      whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
                      className={`flex-1 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-lg shadow-lg ${
                        isOutOfStock
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : addedToCart
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                          : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
                      }`}
                    >
                      {addedToCart ? (
                        <>
                          <FiCheck className="w-6 h-6" />
                          Added to Cart!
                        </>
                      ) : (
                        <>
                          <FiShoppingCart className="w-6 h-6" />
                          Add to Cart
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      onClick={handleWishlist}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-4 border-2 rounded-xl transition-all duration-200 shadow-lg ${
                        isInWishlist(product._id)
                          ? 'border-red-500 bg-red-50 text-red-500'
                          : 'border-gray-300 hover:border-red-500 hover:bg-red-50'
                      }`}
                      title={isInWishlist(product._id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <FiHeart className={`w-6 h-6 ${isInWishlist(product._id) ? 'fill-current' : ''}`} />
                    </motion.button>
                  </div>

                  {/* View Full Details Link */}
                  <Link
                    href={`/products/${product.slug}`}
                    className="block text-center mt-4 text-primary-600 hover:text-primary-700 font-semibold underline"
                  >
                    View Full Details →
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
