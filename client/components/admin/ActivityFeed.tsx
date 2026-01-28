import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
  userId: string;
  action: string;
  user?: any;
  timestamp: Date;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

// Helper function to format time ago
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

export default function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'came_online': return '🟢';
      case 'placed_order': return '🛒';
      case 'registered': return '👤';
      case 'added_to_cart': return '➕';
      case 'viewed_product': return '👁️';
      default: return '📝';
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.user?.profile?.firstName || `User ${activity.userId.slice(-4)}`;
    
    switch (activity.action) {
      case 'came_online':
        return `${userName} came online`;
      case 'placed_order':
        return `${userName} placed an order`;
      case 'registered':
        return `${userName} registered`;
      case 'added_to_cart':
        return `${userName} added item to cart`;
      case 'viewed_product':
        return `${userName} viewed a product`;
      default:
        return `${userName} ${activity.action.replace('_', ' ')}`;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'came_online': return 'border-green-200 bg-green-50';
      case 'placed_order': return 'border-blue-200 bg-blue-50';
      case 'registered': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (displayActivities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-500 font-medium">No recent activity</p>
        <p className="text-sm text-gray-400 mt-1">Activity will appear here as users interact with your site</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>👥</span> Recent Activity
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayActivities.map((activity, index) => (
            <motion.div
              key={`${activity.userId}-${activity.timestamp}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-lg border-l-4 ${getActivityColor(activity.action)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getActivityIcon(activity.action)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
