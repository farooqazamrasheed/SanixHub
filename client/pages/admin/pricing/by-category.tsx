import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import BulkPriceForm from '@/components/admin/pricing/BulkPriceForm';
import PriceChangePreview from '@/components/admin/pricing/PriceChangePreview';
import ProgressTracker from '@/components/admin/pricing/ProgressTracker';
import { usePricingStore } from '@/store/usePricingStore';
import { usePricingUpdates } from '@/hooks/usePricingUpdates';
import api from '@/lib/api';
import { FiArrowLeft, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string | { en: string; ur: string };
  slug: string;
  description?: string | { en: string; ur: string };
}

const CategoryBulkPricing = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const {
    previewProducts,
    previewSummary,
    previewLoading,
    operationProgress,
    previewCategoryPriceChange,
    applyCategoryPriceChange,
    clearPreview,
    clearOperationProgress
  } = usePricingStore();

  // Initialize WebSocket updates
  usePricingUpdates();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadCategories();
    }
  }, [mounted]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/categories');
      setCategories(response.data?.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handlePreview = async (changeType: string, value: number, direction: string) => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }

    try {
      await previewCategoryPriceChange(selectedCategory._id, changeType, value, direction);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const handleApply = async () => {
    if (!selectedCategory || !previewSummary) return;

    try {
      const changeType = previewProducts[0]?.changePercentage ? 'percentage' : 'fixed';
      const value = Math.abs(previewProducts[0]?.changePercentage || previewProducts[0]?.changeAmount || 0);
      const direction = (previewProducts[0]?.changeAmount || 0) >= 0 ? 'increase' : 'decrease';

      await applyCategoryPriceChange(selectedCategory._id, changeType, value, direction);
      setShowPreview(false);
      toast.success('Price update started! Please wait...');
    } catch (error) {
      toast.error('Failed to apply price changes');
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    clearPreview();
  };

  const handleProgressComplete = () => {
    // Clear operation progress to hide the modal
    clearOperationProgress();
    // Optionally reload categories to show updated prices
    loadCategories();
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/pricing')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Pricing Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏷️ Category Bulk Pricing</h1>
          <p className="text-gray-600">Update prices for all products in a category at once</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Category Selection + Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h3>
              
              {loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiLayers className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No categories found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map((category) => {
                    const categoryName = typeof category.name === 'string' ? category.name : category.name?.en || category.name?.ur || 'N/A';
                    const categoryDesc = typeof category.description === 'string' ? category.description : category.description?.en || category.description?.ur || '';
                    return (
                      <button
                        key={category._id}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowPreview(false);
                          clearPreview();
                        }}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all
                          ${selectedCategory?._id === category._id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="font-medium text-gray-900">{categoryName}</div>
                        {categoryDesc && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {categoryDesc}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Change Form */}
            {selectedCategory && (
              <BulkPriceForm
                onPreview={handlePreview}
                loading={previewLoading}
              />
            )}
          </div>

          {/* Right Column: Preview or Instructions */}
          <div className="lg:col-span-2">
            {showPreview && previewProducts.length > 0 && previewSummary ? (
              <PriceChangePreview
                products={previewProducts}
                summary={previewSummary}
                targetName={typeof selectedCategory?.name === 'string' ? selectedCategory.name : (selectedCategory?.name?.en || selectedCategory?.name?.ur || '')}
                onApply={handleApply}
                onCancel={handleCancel}
                loading={operationProgress.isProcessing}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <FiLayers className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">
                    {selectedCategory ? 'Configure Price Change' : 'Select a Category'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {selectedCategory
                      ? 'Choose your price change method and value, then click "Preview Changes" to see how it will affect all products in this category.'
                      : 'Select a category from the list to get started with bulk pricing updates.'}
                  </p>
                  
                  {selectedCategory && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
                      <h4 className="font-medium text-purple-900 mb-2">Selected Category</h4>
                      <p className="text-purple-700">{typeof selectedCategory.name === 'string' ? selectedCategory.name : (selectedCategory.name?.en || selectedCategory.name?.ur || 'N/A')}</p>
                      {selectedCategory.description && (
                        <p className="text-sm text-purple-600 mt-1">{typeof selectedCategory.description === 'string' ? selectedCategory.description : (selectedCategory.description?.en || selectedCategory.description?.ur || '')}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-8 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        1
                      </div>
                      <p className="text-sm text-gray-600">Select a category from the left sidebar</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        2
                      </div>
                      <p className="text-sm text-gray-600">Choose increase or decrease</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        3
                      </div>
                      <p className="text-sm text-gray-600">Select percentage or fixed amount</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        4
                      </div>
                      <p className="text-sm text-gray-600">Preview changes before applying</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        5
                      </div>
                      <p className="text-sm text-gray-600">Apply and track progress in real-time</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Tracker Modal */}
        <ProgressTracker
          operationId={operationProgress.operationId}
          processed={operationProgress.processed}
          total={operationProgress.total}
          percentage={operationProgress.percentage}
          currentProduct={operationProgress.currentProduct}
          isProcessing={operationProgress.isProcessing}
          onComplete={handleProgressComplete}
        />
      </div>
    </AdminLayout>
  );
};

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(CategoryBulkPricing), { ssr: false });
