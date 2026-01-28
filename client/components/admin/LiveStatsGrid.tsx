import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiActivity } from 'react-icons/fi';
import Link from 'next/link';

interface Stat {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  link?: string;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
}

interface LiveStatsGridProps {
  stats: any;
  isLive?: boolean;
}

export default function LiveStatsGrid({ stats, isLive = false }: LiveStatsGridProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statsData: Stat[] = [
    {
      label: 'Total Orders',
      value: stats.orders?.total || 0,
      icon: '📋',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/admin/orders',
      change: stats.orders?.today ? { value: stats.orders.today, trend: 'up' } : undefined
    },
    {
      label: 'Products',
      value: stats.products?.active || 0,
      icon: '📦',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/admin/products',
    },
    {
      label: 'Low Stock Items',
      value: stats.products?.lowStock || 0,
      icon: '⚠️',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      link: '/admin/inventory',
    },
    {
      label: 'Total Customers',
      value: stats.customers || 0,
      icon: '👥',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/admin/users',
    },
  ];

  if (stats.revenue) {
    statsData.push({
      label: 'Revenue (30 days)',
      value: `Rs ${stats.revenue.last30Days?.toLocaleString() || 0}`,
      icon: '💰',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      link: '/admin/analytics',
    });
  }

  if (stats.orders?.placed) {
    statsData.push({
      label: 'Pending Orders',
      value: stats.orders.placed,
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      link: '/admin/orders?status=placed',
    });
  }

  if (stats.orders?.ready) {
    statsData.push({
      label: 'Ready for Pickup',
      value: stats.orders.ready,
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/admin/orders?status=ready',
    });
  }

  if (stats.reviews?.pending) {
    statsData.push({
      label: 'Pending Reviews',
      value: stats.reviews.pending,
      icon: '⭐',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/admin/reviews',
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="relative"
        >
          <Link href={stat.link || '#'}>
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 cursor-pointer border-2 border-transparent hover:border-blue-200">
              {/* Live Indicator */}
              {isLive && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                {stat.icon}
              </div>

              {/* Value */}
              <div className="mb-2">
                <motion.h3
                  key={stat.value}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className={`text-3xl font-bold ${stat.color}`}
                >
                  {stat.value}
                </motion.h3>
              </div>

              {/* Label */}
              <div className="flex items-center justify-between">
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                
                {/* Change Indicator */}
                {stat.change && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    stat.change.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change.trend === 'up' ? (
                      <FiTrendingUp className="w-3 h-3" />
                    ) : (
                      <FiTrendingDown className="w-3 h-3" />
                    )}
                    <span>+{stat.change.value} today</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
