import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ImageUpload from '@/components/admin/ImageUpload';
import BackButton from '@/components/BackButton';
import { adminAPI, categoriesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProductUpdates } from '@/hooks/useProductUpdates';

interface ProductForm {
  name: { en: string; ur: string };
  slug: string;
  sku: string;
  description: { en: string; ur: string };
  shortDescription: { en: string; ur: string };
  category: string;
  subCategory?: string;
  brand?: string;
  manufacturer?: string;
  origin?: string;
  size?: string;
  tags?: string[];
  pricing: {
    basePrice: number;
    salePrice: number;
  };
  inventory: {
    stockQuantity: number;
    lowStockThreshold: number;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string;
  };
  specifications: Array<{
    key: { en: string; ur: string };
    value: { en: string; ur: string };
  }>;
  seo?: {
    metaTitle?: { en: string; ur: string };
    metaDescription?: { en: string; ur: string };
    keywords?: string[];
  };
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
}

interface ImageData {
  url: string;
  thumbnail?: string;
  filename?: string;
}

export default function EditProductPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [skuCheck, setSkuCheck] = useState<{ checking: boolean; available: boolean; message: string }>({
    checking: false,
    available: true,
    message: ''
  });
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [skuSuggestions, setSkuSuggestions] = useState<string[]>([]);
  const [originalSku, setOriginalSku] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ProductForm>({
    defaultValues: {
      specifications: [{ key: { en: '', ur: '' }, value: { en: '', ur: '' } }],
      isActive: true,
      isFeatured: false,
      isNew: false,
      pricing: { basePrice: 0, salePrice: 0 },
      inventory: { stockQuantity: 0, lowStockThreshold: 10 },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'specifications',
  });

  // Watch fields for real-time updates
  const nameEn = watch('name.en');
  const sku = watch('sku');
  const categoryId = watch('category');
  const brand = watch('brand');
  const basePrice = watch('pricing.basePrice');
  const salePrice = watch('pricing.salePrice');

  // Fetch product data with proper error handling
  const { data: productData, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/id/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Product not found');
      }
      const data = await res.json();
      return data.data.product;
    },
    enabled: !!id && !authLoading,
    retry: false, // Don't retry if product doesn't exist
  });

  // Handle product not found error
  React.useEffect(() => {
    if (productError) {
      toast.error('❌ Product not found or has been deleted', { duration: 5000 });
      setTimeout(() => {
        router.push('/admin/products');
      }, 2000);
    }
  }, [productError, router]);

  // Populate form when product data is loaded (using useEffect instead of deprecated onSuccess)
  React.useEffect(() => {
    if (productData) {
      // Store original SKU for validation
      setOriginalSku(productData.sku);
      
      reset({
        name: productData.name,
        slug: productData.slug,
        sku: productData.sku,
        description: productData.description,
        shortDescription: productData.shortDescription || { en: '', ur: '' },
        category: productData.category?._id || productData.category,
        subCategory: productData.subCategory?._id || productData.subCategory || '',
        brand: productData.brand || '',
        manufacturer: productData.manufacturer || '',
        origin: productData.origin || '',
        size: productData.size || '',
        tags: Array.isArray(productData.tags) ? productData.tags.join(', ') : '',
        pricing: productData.pricing,
        inventory: productData.inventory,
        dimensions: productData.dimensions || {},
        specifications: productData.specifications?.length > 0 
          ? productData.specifications 
          : [{ key: { en: '', ur: '' }, value: { en: '', ur: '' } }],
        seo: productData.seo ? {
          metaTitle: productData.seo.metaTitle || { en: '', ur: '' },
          metaDescription: productData.seo.metaDescription || { en: '', ur: '' },
          keywords: Array.isArray(productData.seo.keywords) ? productData.seo.keywords.join(', ') : ''
        } : {},
        isActive: productData.isActive,
        isFeatured: productData.isFeatured,
        isNew: productData.isNew,
      });
      
      // Set images - handle both string URLs and image objects
      if (productData.images?.length > 0) {
        const formattedImages = productData.images.map((img: any) => {
          // If it's already an object with url property
          if (typeof img === 'object' && img.url) {
            return {
              url: img.url,
              thumbnail: img.thumbnail,
              filename: img.filename
            };
          }
          // If it's a string URL
          if (typeof img === 'string') {
            return { url: img };
          }
          // Fallback
          return { url: img };
        });
        setImages(formattedImages);
      }
    }
  }, [productData, reset]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
    enabled: !authLoading,
  });

  // Fetch subcategories based on selected category with WebSocket invalidation
  const { data: subcategoriesData, refetch: refetchSubcategories } = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => categoriesAPI.getSubcategories(categoryId),
    enabled: !!categoryId,
  });

  // Fetch brands for autocomplete
  const { data: brandsData } = useQuery({
    queryKey: ['brands-list'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands?limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch brands');
      return res.json();
    },
    enabled: !authLoading,
  });

  // Update product mutation with WebSocket notification
  const updateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateProduct(id as string, data),
    onSuccess: (response) => {
      const product = response.data.product;
      toast.success(
        `✅ Product updated successfully!\nSKU: ${product.sku}\nProduct ID: ${product.productId}`,
        { duration: 5000 }
      );
      
      // Small delay to ensure WebSocket event is processed
      setTimeout(() => {
        router.push('/admin/products');
      }, 500);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update product';
      const errorCode = error.response?.data?.error?.code;
      
      if (errorCode === 'DUPLICATE_SKU') {
        toast.error('❌ This SKU already exists. Please use a unique SKU.');
      } else if (errorCode === 'DUPLICATE_SLUG') {
        toast.error('❌ This slug already exists. Please use a unique slug.');
      } else {
        toast.error(`❌ ${errorMsg}`);
      }
    },
  });

  // Auto-generate slug from name
  const generateSlug = () => {
    if (nameEn) {
      const slug = nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  };

  // Check SKU availability with debounce and real-time WebSocket support
  const checkSkuAvailability = useCallback(async (skuValue: string) => {
    if (!skuValue || skuValue.length < 2) {
      setSkuCheck({ checking: false, available: true, message: '' });
      return;
    }

    // If SKU is the same as original, it's available (editing same product)
    if (skuValue.toUpperCase() === originalSku.toUpperCase()) {
      setSkuCheck({
        checking: false,
        available: true,
        message: '✅ Current product SKU'
      });
      return;
    }

    setSkuCheck({ checking: true, available: true, message: '🔍 Checking availability...' });

    try {
      const response = await adminAPI.checkSku(skuValue.toUpperCase());
      const { available, existingProduct } = response.data;

      setSkuCheck({
        checking: false,
        available,
        message: available 
          ? '✅ SKU is available and ready to use' 
          : `❌ SKU already used by: ${existingProduct?.name?.en || 'Another Product'} (ID: ${existingProduct?.productId || 'N/A'})`
      });
    } catch (error) {
      console.error('SKU check error:', error);
      setSkuCheck({ checking: false, available: true, message: '⚠️ Unable to verify SKU. Please try again.' });
    }
  }, [originalSku]);

  // Debounced SKU check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sku) {
        checkSkuAvailability(sku);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sku, checkSkuAvailability]);

  // WebSocket for real-time updates and SKU duplicate checks
  useEffect(() => {
    const { getSocket } = require('@/lib/socket');
    const socket = getSocket();
    
    if (!socket) {
      console.log('Socket not initialized yet');
      return;
    }
    
    // Listen for product updates (for SKU duplicate check)
    const handleProductUpdated = (data: any) => {
      console.log('Product updated:', data);
      
      // If another product was updated with the same SKU we're typing, recheck
      if (data.type === 'PRODUCT_UPDATED' && sku && data.product?.sku === sku.toUpperCase() && data.product?._id !== id) {
        checkSkuAvailability(sku);
        toast.warning(`⚠️ SKU ${sku} was just used by another admin!`, { duration: 5000 });
      }
    };
    
    // Listen for product creation (for SKU duplicate check)
    const handleProductCreated = (data: any) => {
      console.log('Product created:', data);
      
      // If a product was created with the same SKU we're typing, recheck
      if (data.type === 'PRODUCT_CREATED' && sku && data.product?.sku === sku.toUpperCase()) {
        checkSkuAvailability(sku);
        toast.warning(`⚠️ SKU ${sku} was just used by another admin!`, { duration: 5000 });
      }
    };
    
    // Listen for category creation (to refresh subcategories)
    const handleCategoryCreated = (data: any) => {
      console.log('Category created:', data);
      
      // If new category is a subcategory of the currently selected category, refresh
      if (data.category?.parentCategory === categoryId) {
        refetchSubcategories();
        toast.success(`✨ New subcategory "${data.category?.name?.en}" added!`, { duration: 3000 });
      }
    };
    
    socket.on('product:created', handleProductCreated);
    socket.on('product:updated', handleProductUpdated);
    socket.on('category:created', handleCategoryCreated);
    
    return () => {
      if (socket) {
        socket.off('product:created', handleProductCreated);
        socket.off('product:updated', handleProductUpdated);
        socket.off('category:created', handleCategoryCreated);
      }
    };
  }, [sku, categoryId, id, checkSkuAvailability, refetchSubcategories]);

  // Generate SKU suggestions
  const loadSkuSuggestions = async () => {
    try {
      const response = await adminAPI.suggestSku({
        name: nameEn,
        category: categoryId,
        brand: brand
      });
      setSkuSuggestions(response.data.suggestions || []);
      setShowSkuSuggestions(true);
    } catch (error) {
      toast.error('Failed to generate SKU suggestions');
    }
  };

  // Calculate form completion percentage
  const calculateProgress = () => {
    const fields = getValues();
    let completed = 0;
    let total = 0;

    // Basic info (40%)
    if (fields.name?.en) completed += 10;
    if (fields.name?.ur) completed += 10;
    if (fields.slug) completed += 5;
    if (fields.sku && skuCheck.available) completed += 15;
    total += 40;

    // Category & Details (20%)
    if (fields.category) completed += 10;
    if (fields.description?.en) completed += 5;
    if (fields.description?.ur) completed += 5;
    total += 20;

    // Pricing (15%)
    if (fields.pricing?.basePrice > 0) completed += 15;
    total += 15;

    // Inventory (10%)
    if (fields.inventory?.stockQuantity >= 0) completed += 10;
    total += 10;

    // Images (15%)
    if (images.length > 0) completed += 15;
    total += 15;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  // Price validation
  const priceError = salePrice && basePrice && salePrice >= basePrice 
    ? 'Sale price must be less than base price' 
    : '';
  
  const discountPercent = basePrice && salePrice && salePrice < basePrice
    ? Math.round(((basePrice - salePrice) / basePrice) * 100)
    : 0;
  
  if (authLoading || productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error page if product not found
  if (productError || (!productLoading && !productData)) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-8xl mb-6">❌</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Product Not Found</h2>
            <p className="text-gray-600 mb-2">
              The product you're trying to edit doesn't exist or has been deleted.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Product ID: <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/products')}
                className="w-full btn btn-primary"
              >
                ← Back to Products List
              </button>
              <button
                onClick={() => router.push('/admin/products/create')}
                className="w-full btn btn-secondary"
              >
                + Create New Product
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              Redirecting automatically in 2 seconds...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const categories = categoriesData?.data?.categories || [];
  const subcategories = subcategoriesData?.data?.categories || [];

  const onSubmit = (data: ProductForm) => {
    if (!skuCheck.available) {
      toast.error('Please use a unique SKU');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one product image');
      return;
    }

    // Clean up specifications
    const cleanedSpecs = data.specifications.filter(
      (spec) => spec.key.en && spec.value.en
    );

    // Parse tags
    let parsedTags: string[] = [];
    if (data.tags) {
      if (typeof data.tags === 'string') {
        parsedTags = (data.tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
      } else {
        parsedTags = data.tags as string[];
      }
    }

    // Parse SEO keywords
    let parsedKeywords: string[] = [];
    if (data.seo?.keywords) {
      if (typeof data.seo.keywords === 'string') {
        parsedKeywords = (data.seo.keywords as string).split(',').map(kw => kw.trim()).filter(Boolean);
      } else {
        parsedKeywords = data.seo.keywords as string[];
      }
    }

    // Build product data - only include fields that have values
    const productData: any = {
      name: data.name,
      slug: data.slug,
      sku: data.sku.toUpperCase(),
      description: data.description,
      category: data.category,
      pricing: {
        basePrice: parseFloat(data.pricing.basePrice.toString()),
        salePrice: data.pricing.salePrice ? parseFloat(data.pricing.salePrice.toString()) : undefined
      },
      inventory: {
        stockQuantity: parseInt(data.inventory.stockQuantity.toString()),
        lowStockThreshold: parseInt(data.inventory.lowStockThreshold.toString())
      },
      images: images.map((img) => img.url),
      specifications: cleanedSpecs,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      isNew: data.isNew
    };

    // Add optional fields only if they have values
    if (data.subCategory) productData.subCategory = data.subCategory;
    if (data.brand) productData.brand = data.brand;
    if (data.manufacturer) productData.manufacturer = data.manufacturer;
    if (data.origin) productData.origin = data.origin;
    if (data.size) productData.size = data.size;
    if (parsedTags.length > 0) productData.tags = parsedTags;
    
    if (data.shortDescription?.en || data.shortDescription?.ur) {
      productData.shortDescription = data.shortDescription;
    }

    if (data.dimensions?.length || data.dimensions?.width || data.dimensions?.height || data.dimensions?.weight) {
      productData.dimensions = {
        length: data.dimensions.length ? parseFloat(data.dimensions.length.toString()) : undefined,
        width: data.dimensions.width ? parseFloat(data.dimensions.width.toString()) : undefined,
        height: data.dimensions.height ? parseFloat(data.dimensions.height.toString()) : undefined,
        weight: data.dimensions.weight ? parseFloat(data.dimensions.weight.toString()) : undefined,
        unit: data.dimensions.unit
      };
    }

    if (data.seo?.metaTitle?.en || data.seo?.metaTitle?.ur || data.seo?.metaDescription?.en || data.seo?.metaDescription?.ur || parsedKeywords.length > 0) {
      productData.seo = {
        metaTitle: data.seo?.metaTitle,
        metaDescription: data.seo?.metaDescription,
        keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined
      };
    }

    console.log('Submitting product update data:', productData);
    updateMutation.mutate(productData);
  };

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin/products" label="Back to Products" variant="primary" />
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-gray-600 mt-1">Update product information</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Form Completion</span>
          <span className="text-sm font-bold text-primary-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              progress < 50 ? 'bg-red-500' : progress < 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {progress < 50 && '⚠️ More information needed'}
          {progress >= 50 && progress < 80 && '📝 Almost there, keep going!'}
          {progress >= 80 && progress < 100 && '✨ Looking good! Just a bit more.'}
          {progress === 100 && '🎉 Perfect! Ready to update product.'}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Product Name (English) *
                    </label>
                    <input
                      {...register('name.en', { required: 'English name is required' })}
                      onBlur={generateSlug}
                      className={`input ${errors.name?.en ? 'input-error' : ''}`}
                      placeholder="Premium Muslim Shower"
                    />
                    {errors.name?.en && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.en.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Product Name (Urdu) *
                    </label>
                    <input
                      {...register('name.ur', { required: 'Urdu name is required' })}
                      className={`input font-urdu ${errors.name?.ur ? 'input-error' : ''}`}
                      placeholder="پریمیم مسلم شاور"
                      dir="rtl"
                    />
                    {errors.name?.ur && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.ur.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Slug * <button type="button" onClick={generateSlug} className="text-xs text-primary-600 hover:underline ml-2">Generate</button>
                    </label>
                    <input
                      {...register('slug', { required: 'Slug is required' })}
                      className={`input ${errors.slug ? 'input-error' : ''}`}
                      placeholder="premium-muslim-shower"
                    />
                    {errors.slug && (
                      <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">
                      SKU * 
                      <button 
                        type="button" 
                        onClick={loadSkuSuggestions}
                        className="text-xs text-primary-600 hover:underline ml-2"
                      >
                        💡 Suggest SKU
                      </button>
                    </label>
                    <input
                      {...register('sku', { 
                        required: 'SKU is required',
                        pattern: {
                          value: /^[A-Z0-9\-\/]+$/,
                          message: 'SKU must be uppercase letters, numbers, hyphens, or slashes'
                        }
                      })}
                      className={`input ${errors.sku || !skuCheck.available ? 'input-error' : ''}`}
                      placeholder="MS-001"
                      style={{ textTransform: 'uppercase' }}
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }}
                    />
                    {skuCheck.checking && (
                      <p className="text-blue-500 text-sm mt-1">⏳ Checking availability...</p>
                    )}
                    {!skuCheck.checking && skuCheck.message && (
                      <p className={`text-sm mt-1 ${skuCheck.available ? 'text-green-600' : 'text-red-600'}`}>
                        {skuCheck.message}
                      </p>
                    )}
                    {errors.sku && (
                      <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>
                    )}
                    
                    {/* SKU Suggestions Dropdown */}
                    {showSkuSuggestions && skuSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
                          <span className="text-xs font-semibold text-gray-700">💡 SKU Suggestions</span>
                          <button
                            type="button"
                            onClick={() => setShowSkuSuggestions(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        {skuSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setValue('sku', suggestion);
                              setShowSkuSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-primary-50 text-sm transition-colors"
                          >
                            <span className="font-mono font-semibold text-primary-600">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-semibold text-blue-900 mb-1">📋 SKU Format Examples:</p>
                      <ul className="text-blue-800 space-y-1">
                        <li>• <code className="bg-blue-100 px-1 rounded">WF-1/2-CHR</code> - Water Filter, 1/2 inch, Chrome</li>
                        <li>• <code className="bg-blue-100 px-1 rounded">MS-LUX-WHT</code> - Muslim Shower, Luxury, White</li>
                        <li>• <code className="bg-blue-100 px-1 rounded">BD-ECO-BLK</code> - Bidet, Economy, Black</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (English) *
                  </label>
                  <textarea
                    {...register('description.en', { required: 'Description is required' })}
                    rows={4}
                    className={`input ${errors.description?.en ? 'input-error' : ''}`}
                    placeholder="Detailed product description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Urdu) *
                  </label>
                  <textarea
                    {...register('description.ur', { required: 'Urdu description is required' })}
                    rows={4}
                    className={`input font-urdu ${errors.description?.ur ? 'input-error' : ''}`}
                    placeholder="تفصیلی مصنوعات کی تفصیل..."
                    dir="rtl"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Short Description (English)
                    </label>
                    <textarea
                      {...register('shortDescription.en')}
                      rows={2}
                      maxLength={200}
                      className="input"
                      placeholder="Brief product summary (max 200 chars)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Short Description (Urdu)
                    </label>
                    <textarea
                      {...register('shortDescription.ur')}
                      rows={2}
                      maxLength={200}
                      className="input font-urdu"
                      placeholder="مختصر مصنوعات کا خلاصہ"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Product Details</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Brand</label>
                    <input
                      {...register('brand')}
                      list="brands-list"
                      className="input"
                      placeholder="e.g., AquaPure (start typing...)"
                    />
                    <datalist id="brands-list">
                      {brandsData?.data?.brands?.map((brand: any) => (
                        <option key={brand._id} value={brand.name} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">
                      Type to search existing brands or enter a new one
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Manufacturer</label>
                    <input
                      {...register('manufacturer')}
                      className="input"
                      placeholder="e.g., ABC Industries"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Country of Origin</label>
                    <input
                      {...register('origin')}
                      className="input"
                      placeholder="e.g., Pakistan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Size <span className="text-gray-500 text-xs">(e.g., Small, Medium, Large, or custom)</span>
                  </label>
                  <input
                    {...register('size')}
                    className="input"
                    placeholder="e.g., 1/2 inch, Large, 500ml, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter product size or dimensions (e.g., "1/2 inch", "Large", "500ml")
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tags <span className="text-gray-500 text-xs">(comma-separated)</span>
                  </label>
                  <input
                    {...register('tags')}
                    className="input"
                    placeholder="muslim shower, bidet, hygiene, bathroom"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Pricing</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base Price (PKR) *</label>
                  <input
                    type="number"
                    {...register('pricing.basePrice', {
                      required: 'Base price is required',
                      min: { value: 0, message: 'Price must be positive' },
                    })}
                    className={`input ${errors.pricing?.basePrice ? 'input-error' : ''}`}
                    placeholder="2500"
                  />
                  {errors.pricing?.basePrice && (
                    <p className="text-red-500 text-sm mt-1">{errors.pricing.basePrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sale Price (PKR) <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('pricing.salePrice')}
                    className={`input ${priceError ? 'border-red-500' : ''}`}
                    placeholder="2000"
                  />
                  {priceError && (
                    <p className="text-red-500 text-sm mt-1">❌ {priceError}</p>
                  )}
                  {discountPercent > 0 && !priceError && (
                    <p className="text-green-600 text-sm mt-1">
                      ✅ Discount: {discountPercent}% off (Save Rs. {basePrice - salePrice})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Inventory</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    {...register('inventory.stockQuantity', {
                      required: 'Stock quantity is required',
                      min: { value: 0, message: 'Quantity cannot be negative' },
                    })}
                    className="input"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    {...register('inventory.lowStockThreshold')}
                    className="input"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Product Images</h2>
                <div className="text-sm">
                  <span className={`font-semibold ${images.length === 0 ? 'text-red-600' : images.length >= 5 ? 'text-green-600' : 'text-blue-600'}`}>
                    {images.length}/5 images
                  </span>
                </div>
              </div>
              {images.length === 0 && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ <strong>At least 1 image is required</strong> to update a product
                </div>
              )}
              <ImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={5}
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: First image will be used as the primary product image. You can upload up to 5 images.
              </p>
            </div>

            {/* Dimensions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Dimensions & Weight</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Length</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('dimensions.length')}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Width</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('dimensions.width')}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Height</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('dimensions.height')}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Unit</label>
                    <select {...register('dimensions.unit')} className="input">
                      <option value="cm">cm</option>
                      <option value="inch">inch</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('dimensions.weight')}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Weight Unit</label>
                    <select {...register('dimensions.unit')} className="input">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Specifications</h2>
                <button
                  type="button"
                  onClick={() => append({ key: { en: '', ur: '' }, value: { en: '', ur: '' } })}
                  className="btn btn-outline text-sm"
                >
                  + Add Specification
                </button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4">
                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <input
                        {...register(`specifications.${index}.key.en`)}
                        className="input text-sm"
                        placeholder="Key (English)"
                      />
                      <input
                        {...register(`specifications.${index}.value.en`)}
                        className="input text-sm"
                        placeholder="Value (English)"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        {...register(`specifications.${index}.key.ur`)}
                        className="input text-sm font-urdu"
                        placeholder="Key (Urdu)"
                        dir="rtl"
                      />
                      <input
                        {...register(`specifications.${index}.value.ur`)}
                        className="input text-sm font-urdu"
                        placeholder="Value (Urdu)"
                        dir="rtl"
                      />
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 text-sm mt-2 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">SEO Settings</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Title (English)
                    </label>
                    <input
                      {...register('seo.metaTitle.en')}
                      className="input"
                      placeholder="SEO title for search engines"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Title (Urdu)
                    </label>
                    <input
                      {...register('seo.metaTitle.ur')}
                      className="input font-urdu"
                      placeholder="سرچ انجن کے لیے عنوان"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Description (English)
                    </label>
                    <textarea
                      {...register('seo.metaDescription.en')}
                      rows={3}
                      className="input"
                      placeholder="SEO description (max 160 chars)"
                      maxLength={160}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Description (Urdu)
                    </label>
                    <textarea
                      {...register('seo.metaDescription.ur')}
                      rows={3}
                      className="input font-urdu"
                      placeholder="سرچ انجن کے لیے تفصیل"
                      maxLength={160}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    SEO Keywords <span className="text-gray-500 text-xs">(comma-separated)</span>
                  </label>
                  <input
                    {...register('seo.keywords')}
                    className="input"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Category</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className={`input ${errors.category ? 'input-error' : ''}`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat: any) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name.en}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                {categoryId && subcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Subcategory <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <select
                      {...register('subCategory')}
                      className="input"
                    >
                      <option value="">Select a subcategory</option>
                      {subcategories.map((subcat: any) => (
                        <option key={subcat._id} value={subcat._id}>
                          {subcat.name.en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Status</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isActive')} className="rounded" />
                  <span className="text-sm">Active (visible to customers)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isFeatured')} className="rounded" />
                  <span className="text-sm">Featured Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isNew')} className="rounded" />
                  <span className="text-sm">Mark as New</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !skuCheck.available}
                  className="w-full btn btn-primary disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Product'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/admin/products')}
                  className="w-full btn btn-outline"
                >
                  Cancel
                </button>
              </div>
              
              {/* Form Status Info */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Form Status:</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className={images.length > 0 ? 'text-green-600' : 'text-red-600'}>
                    {images.length > 0 ? '✅' : '❌'} Images: {images.length}/5
                  </li>
                  <li className={skuCheck.available ? 'text-green-600' : 'text-red-600'}>
                    {skuCheck.available ? '✅' : '❌'} SKU Validation
                  </li>
                  <li className={!priceError ? 'text-green-600' : 'text-red-600'}>
                    {!priceError ? '✅' : '❌'} Price Validation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin'])),
    },
  };
};
