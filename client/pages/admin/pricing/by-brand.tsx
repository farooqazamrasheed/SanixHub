import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import BulkPriceForm from '@/components/admin/pricing/BulkPriceForm';
import PriceChangePreview from '@/components/admin/pricing/PriceChangePreview';
import ProgressTracker from '@/components/admin/pricing/ProgressTracker';
import { usePricingStore } from '@/store/usePricingStore';
import { usePricingUpdates } from '@/hooks/usePricingUpdates';
import api from '@/lib/api';
import { FiArrowLeft, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

const BrandBulkPricing = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const {
    previewProducts,
    previewSummary,
    previewLoading,
    operationProgress,
    previewBrandPriceChange,
    applyBrandPriceChange,
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
      loadBrands();
    }
  }, [mounted]);

  const loadBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await api.get('/admin/brands');
      setBrands(response.data?.brands || []);
    } catch (error) {
      console.error('Failed to load brands:', error);
      toast.error('Failed to load brands');
    } finally {
      setLoadingBrands(false);
    }
  };

  const handlePreview = async (changeType: string, value: number, direction: string) => {
    if (!selectedBrand) {
      toast.error('Please select a brand first');
      return;
    }

    try {
      await previewBrandPriceChange(selectedBrand._id, changeType, value, direction);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const handleApply = async () => {
    if (!selectedBrand || !previewSummary) return;

    try {
      const changeType = previewProducts[0]?.changePercentage ? 'percentage' : 'fixed';
      const value = Math.abs(previewProducts[0]?.changePercentage || previewProducts[0]?.changeAmount || 0);
      const direction = (previewProducts[0]?.changeAmount || 0) >= 0 ? 'increase' : 'decrease';

      await applyBrandPriceChange(selectedBrand._id, changeType, value, direction);
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
    // Optionally reload brands to show updated prices
    loadBrands();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏷️ Brand Bulk Pricing</h1>
          <p className="text-gray-600">Update prices for all products in a brand at once</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Brand Selection + Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Brand Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Brand</h3>
              
              {loadingBrands ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiPackage className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No brands found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {brands.map((brand) => (
                    <button
                      key={brand._id}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setShowPreview(false);
                        clearPreview();
                      }}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-all
                        ${selectedBrand?._id === brand._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="font-medium text-gray-900">{brand.name}</div>
                      {brand.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {brand.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Change Form */}
            {selectedBrand && (
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
                targetName={selectedBrand?.name || ''}
                onApply={handleApply}
                onCancel={handleCancel}
                loading={operationProgress.isProcessing}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">
                    {selectedBrand ? 'Configure Price Change' : 'Select a Brand'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {selectedBrand
                      ? 'Choose your price change method and value, then click "Preview Changes" to see how it will affect all products in this brand.'
                      : 'Select a brand from the list to get started with bulk pricing updates.'}
                  </p>
                  
                  {selectedBrand && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <h4 className="font-medium text-blue-900 mb-2">Selected Brand</h4>
                      <p className="text-blue-700">{selectedBrand.name}</p>
                      {selectedBrand.description && (
                        <p className="text-sm text-blue-600 mt-1">{selectedBrand.description}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-8 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        1
                      </div>
                      <p className="text-sm text-gray-600">Select a brand from the left sidebar</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        2
                      </div>
                      <p className="text-sm text-gray-600">Choose increase or decrease</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        3
                      </div>
                      <p className="text-sm text-gray-600">Select percentage or fixed amount</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        4
                      </div>
                      <p className="text-sm text-gray-600">Preview changes before applying</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
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
export default dynamic(() => Promise.resolve(BrandBulkPricing), { ssr: false });
