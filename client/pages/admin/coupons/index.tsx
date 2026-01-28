import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCouponSync } from '@/hooks/useCouponSync';

export default function AdminCouponsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  
  // Real-time coupon sync
  useCouponSync();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch coupons
  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: adminAPI.getAllCoupons,
  });

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: adminAPI.createCoupon,
    onSuccess: () => {
      toast.success('Coupon created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create coupon');
    },
  });

  // Update coupon mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateCoupon(id, data),
    onSuccess: () => {
      toast.success('Coupon updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditingCoupon(null);
    },
    onError: () => {
      toast.error('Failed to update coupon');
    },
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteCoupon,
    onSuccess: () => {
      toast.success('Coupon deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: () => {
      toast.error('Failed to delete coupon');
    },
  });

  const coupons = data?.data?.coupons || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const couponData = {
      code: formData.get('code')?.toString().toUpperCase(),
      type: formData.get('type'),
      value: Number(formData.get('value')),
      description: formData.get('description'),
      validity: {
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
      },
      conditions: {
        minOrderValue: Number(formData.get('minOrderValue')) || 0,
        maxDiscount: formData.get('maxDiscount') ? Number(formData.get('maxDiscount')) : undefined,
        usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : undefined,
        usagePerUser: formData.get('usagePerUser') ? Number(formData.get('usagePerUser')) : undefined,
      },
      isActive: formData.get('isActive') === 'true',
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon._id, data: couponData });
    } else {
      createMutation.mutate(couponData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      deleteMutation.mutate(id);
    }
  };

  const CouponForm = ({ coupon }: { coupon?: any }) => {
    const today = new Date().toISOString().split('T')[0];
    
    return (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">
          {coupon ? 'Edit Coupon' : 'Create New Coupon'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coupon Code *
            </label>
            <input
              type="text"
              name="code"
              defaultValue={coupon?.code}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 uppercase"
              placeholder="SUMMER2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              name="type"
              defaultValue={coupon?.type || 'percentage'}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value *
            </label>
            <input
              type="number"
              name="value"
              defaultValue={coupon?.value}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Order Value
            </label>
            <input
              type="number"
              name="minOrderValue"
              defaultValue={coupon?.conditions?.minOrderValue || 0}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Discount (for percentage)
            </label>
            <input
              type="number"
              name="maxDiscount"
              defaultValue={coupon?.conditions?.maxDiscount}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Limit (total)
            </label>
            <input
              type="number"
              name="usageLimit"
              defaultValue={coupon?.conditions?.usageLimit}
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usage Per User
            </label>
            <input
              type="number"
              name="usagePerUser"
              defaultValue={coupon?.conditions?.usagePerUser}
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={coupon?.validity?.startDate?.split('T')[0] || today}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={coupon?.validity?.endDate?.split('T')[0]}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="isActive"
              defaultValue={coupon?.isActive !== false ? 'true' : 'false'}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={coupon?.description}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Describe this coupon..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {coupon ? 'Update' : 'Create'} Coupon
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setEditingCoupon(null);
            }}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  // Show loading state for auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-gray-600 mt-1">Manage discount coupons</p>
        </div>
        {!showCreateForm && !editingCoupon && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            + Create Coupon
          </button>
        )}
      </div>

      {(showCreateForm || editingCoupon) && <CouponForm coupon={editingCoupon} />}

      {/* Coupons List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <p>No coupons found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type / Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon: any) => (
                  <tr key={coupon._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-primary-600">{coupon.code}</div>
                      {coupon.description && (
                        <div className="text-sm text-gray-500">{coupon.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `PKR ${coupon.value}`}
                      </div>
                      {coupon.conditions?.maxDiscount && (
                        <div className="text-xs text-gray-500">
                          Max: PKR {coupon.conditions.maxDiscount}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(coupon.validity.startDate).toLocaleDateString()}</div>
                      <div>{new Date(coupon.validity.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {coupon.usage?.totalUsed || 0}
                      {coupon.conditions?.usageLimit && ` / ${coupon.conditions.usageLimit}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          coupon.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCoupon(coupon)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
