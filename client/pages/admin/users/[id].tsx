import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface User {
  _id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    whatsapp?: string;
    language: string;
  };
  addresses: Array<{
    label: string;
    street?: string;
    area?: string;
    city: string;
    postalCode?: string;
    isDefault: boolean;
  }>;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  stats: {
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
    totalReviews: number;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  pricing?: {
    total: number;
  };
  status: string;
  createdAt: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }>;
}

export default function UserDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-details', id],
    queryFn: () => adminAPI.getUserDetails(id as string),
    enabled: !authLoading && !!id,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ isActive }: { isActive: boolean }) =>
      adminAPI.toggleUserStatus(id as string, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const user: User | undefined = data?.data?.user;
  const recentOrders: Order[] = data?.data?.recentOrders || [];

  const handleToggleStatus = async () => {
    if (!user) return;
    
    const action = user.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user's account?`)) {
      try {
        await toggleStatusMutation.mutateAsync({ isActive: !user.isActive });
        alert(`User account ${action}d successfully!`);
      } catch (error: any) {
        alert(error?.response?.data?.message || 'Failed to update user status');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      placed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-purple-100 text-purple-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <Link href="/admin/users" className="text-primary-600 hover:text-primary-700">
            ← Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin/users" label="Back to Users" variant="primary" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          ← Back to Users
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.profile.firstName} {user.profile.lastName}
            </h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={toggleStatusMutation.isPending}
            className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              user.isActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {toggleStatusMutation.isPending
              ? 'Updating...'
              : user.isActive
              ? 'Deactivate Account'
              : 'Activate Account'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">{user.stats.totalOrders}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">{user.stats.completedOrders}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 mb-1">Total Spent</div>
              <div className="text-2xl font-bold text-gray-900">
                Rs. {user.stats.totalSpent.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500 mb-1">Reviews</div>
              <div className="text-2xl font-bold text-yellow-600">{user.stats.totalReviews}</div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            </div>
            <div className="p-6">
              {recentOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <Link
                      key={order._id}
                      href={`/admin/orders/${order._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            Rs. {(order.pricing?.total || 0).toLocaleString()}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status.replace('_', ' ')}
                            </span>
                            {order.status === 'cancelled' && order.statusHistory && order.statusHistory.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {order.statusHistory[order.statusHistory.length - 1]?.note?.toLowerCase().includes('admin') 
                                  ? 'By Admin' 
                                  : 'By Customer'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
            </div>
            <div className="p-6">
              {user.addresses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No addresses saved</p>
              ) : (
                <div className="space-y-4">
                  {user.addresses.map((address, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded capitalize">
                          {address.label}
                        </span>
                        {address.isDefault && (
                          <span className="text-xs font-semibold text-primary-600">Default</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">
                        {address.street && <div>{address.street}</div>}
                        {address.area && <div>{address.area}</div>}
                        <div>{address.city}</div>
                        {address.postalCode && <div>{address.postalCode}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Account Info */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Verified:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {user.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Language:</span>
                <span className="text-sm font-medium text-gray-900 uppercase">
                  {user.profile.language}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Email</div>
                <div className="text-sm text-gray-900">{user.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Phone</div>
                <div className="text-sm text-gray-900">{user.profile.phone}</div>
              </div>
              {user.profile.whatsapp && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">WhatsApp</div>
                  <div className="text-sm text-gray-900">{user.profile.whatsapp}</div>
                </div>
              )}
            </div>
          </div>

          {/* Account Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Account Timeline</h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Joined</div>
                <div className="text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {user.lastLogin && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Last Login</div>
                  <div className="text-sm text-gray-900">
                    {new Date(user.lastLogin).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
