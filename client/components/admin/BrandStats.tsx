import { useQuery } from '@tanstack/react-query';

interface BrandStatsProps {
  className?: string;
}

export default function BrandStats({ className = '' }: BrandStatsProps) {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['brand-stats'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/brands/stats`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
  });

  const stats = statsData?.data || {};
  const topBrands = stats.topBrands || [];

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Total Brands</h3>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
          <p className="text-4xl font-bold">{stats.totalBrands || 0}</p>
          <p className="text-sm opacity-75 mt-2">All registered brands</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">Active Brands</h3>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <p className="text-4xl font-bold">{stats.activeBrands || 0}</p>
          <p className="text-sm opacity-75 mt-2">Currently active</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium opacity-90">With Products</h3>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <p className="text-4xl font-bold">{stats.brandsWithProducts || 0}</p>
          <p className="text-sm opacity-75 mt-2">Have products listed</p>
        </div>
      </div>

      {/* Top Brands Chart */}
      {topBrands.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-6">Top Brands by Product Count</h3>
          <div className="space-y-4">
            {topBrands.map((brand: any, index: number) => {
              const maxProducts = topBrands[0]?.productCount || 1;
              const percentage = (brand.productCount / maxProducts) * 100;
              
              return (
                <div key={brand._id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{brand.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(to right, ${getGradientColor(index)})`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Brand Distribution */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="font-semibold mb-4">Brand Distribution</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {((stats.activeBrands / stats.totalBrands) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Active Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((stats.brandsWithProducts / stats.totalBrands) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">With Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {topBrands.length > 0 ? Math.round(topBrands.reduce((sum: number, b: any) => sum + b.productCount, 0) / topBrands.length) : 0}
                </div>
                <div className="text-sm text-gray-600">Avg Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {topBrands[0]?.productCount || 0}
                </div>
                <div className="text-sm text-gray-600">Top Brand</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {topBrands.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">No Brand Data Yet</h3>
          <p className="text-gray-600">
            Create brands and assign them to products to see statistics here.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function for gradient colors
function getGradientColor(index: number): string {
  const gradients = [
    '#3B82F6, #2563EB', // Blue
    '#10B981, #059669', // Green
    '#8B5CF6, #7C3AED', // Purple
    '#F59E0B, #D97706', // Orange
    '#EF4444, #DC2626', // Red
    '#06B6D4, #0891B2', // Cyan
    '#EC4899, #DB2777', // Pink
    '#6366F1, #4F46E5', // Indigo
    '#14B8A6, #0D9488', // Teal
    '#F97316, #EA580C', // Deep Orange
  ];
  return gradients[index % gradients.length];
}
