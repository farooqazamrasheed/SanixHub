import dynamic from 'next/dynamic';

// Completely disable SSR for the entire pricing page
const PricingPage = dynamic(
  () => import('@/components/admin/pricing/PricingPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Pricing Dashboard...</p>
        </div>
      </div>
    )
  }
);

export default PricingPage;
