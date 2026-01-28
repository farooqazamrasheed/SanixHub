interface StatsProps {
  stats: any;
}

export default function DashboardStats({ stats }: StatsProps) {
  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Products',
      value: stats.products?.total || 0,
      subtitle: `${stats.products?.active || 0} active`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      title: 'Total Orders',
      value: stats.orders?.total || 0,
      subtitle: `${stats.orders?.today || 0} today`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      title: 'Revenue (30 days)',
      value: `PKR ${stats.revenue?.last30Days?.toLocaleString() || 0}`,
      subtitle: `${stats.revenue?.ordersCount || 0} orders`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Customers',
      value: stats.customers || 0,
      subtitle: 'Registered users',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-purple-500',
    },
  ];

  const alerts = [];
  if (stats.orders?.placed > 0) {
    alerts.push({
      type: 'info',
      message: `${stats.orders.placed} order${stats.orders.placed > 1 ? 's' : ''} pending`,
    });
  }
  if (stats.orders?.ready > 0) {
    alerts.push({
      type: 'success',
      message: `${stats.orders.ready} order${stats.orders.ready > 1 ? 's' : ''} ready for pickup`,
    });
  }
  if (stats.products?.lowStock > 0) {
    alerts.push({
      type: 'warning',
      message: `${stats.products.lowStock} product${stats.products.lowStock > 1 ? 's' : ''} low on stock`,
    });
  }
  if (stats.reviews?.pending > 0) {
    alerts.push({
      type: 'info',
      message: `${stats.reviews.pending} review${stats.reviews.pending > 1 ? 's' : ''} pending approval`,
    });
  }

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} text-white p-3 rounded-lg`}>
                {stat.icon}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions Needed</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  alert.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-800'
                    : alert.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Average Order Value</h3>
          <div className="text-3xl font-bold text-primary-600">
            PKR {stats.revenue?.averageOrderValue?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Placed</span>
              <span className="font-semibold">{stats.orders?.placed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ready</span>
              <span className="font-semibold">{stats.orders?.ready || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
