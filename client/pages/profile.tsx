import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import { authAPI, reviewAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiStar, FiEdit2, FiTrash2 } from 'react-icons/fi';
import ReviewCard from '@/components/ReviewCard';
import WriteReviewModal from '@/components/WriteReviewModal';
import Link from 'next/link';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  language: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const queryClient = useQueryClient();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.profile.firstName || '',
      lastName: user?.profile.lastName || '',
      phone: user?.profile.phone || '',
      whatsapp: user?.profile.whatsapp || '',
      language: user?.profile.language || 'en',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
    watch,
  } = useForm<PasswordForm>();

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authAPI.updateProfile,
    onSuccess: (data) => {
      setUser(data.data.user);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authAPI.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPasswordForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate({
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        whatsapp: data.whatsapp,
        language: data.language,
      },
    });
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  // Fetch user reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['user-reviews'],
    queryFn: () => reviewAPI.getUserReviews(),
    enabled: isAuthenticated && activeTab === 'reviews',
  });

  const userReviews = reviewsData?.data?.reviews || [];

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => reviewAPI.deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Review deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    },
    onError: () => {
      toast.error('Failed to delete review');
    },
  });

  const handleEditReview = (review: any) => {
    setEditingReview(review);
    setShowEditReviewModal(true);
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return (
    <>
      <NextSeo title="My Profile - SanixHub" />
      <Layout>
        <div className="bg-gray-50 py-8">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/" label="Back to Home" variant="ghost" />
            </div>

            <h1 className="text-3xl font-bold mb-8">My Account</h1>

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                      {user?.profile.firstName[0]}{user?.profile.lastName[0]}
                    </div>
                    <h2 className="font-bold text-lg">
                      {user?.profile.firstName} {user?.profile.lastName}
                    </h2>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>

                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`w-full text-left px-4 py-2 rounded-lg transition ${
                        activeTab === 'profile'
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      Profile Information
                    </button>
                    <button
                      onClick={() => setActiveTab('password')}
                      className={`w-full text-left px-4 py-2 rounded-lg transition ${
                        activeTab === 'password'
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => router.push('/orders')}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                      My Orders
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                        activeTab === 'reviews'
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <FiStar className="w-4 h-4" />
                      My Reviews
                    </button>
                    <button
                      onClick={() => router.push('/settings')}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                      Settings
                    </button>
                  </nav>
                </div>
              </aside>

              {/* Main Content */}
              <main className="lg:col-span-3">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6">Profile Information</h2>

                    <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerProfile('firstName', { required: 'First name is required' })}
                            className={`input ${profileErrors.firstName ? 'input-error' : ''}`}
                          />
                          {profileErrors.firstName && (
                            <p className="text-red-500 text-sm mt-1">
                              {profileErrors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerProfile('lastName', { required: 'Last name is required' })}
                            className={`input ${profileErrors.lastName ? 'input-error' : ''}`}
                          />
                          {profileErrors.lastName && (
                            <p className="text-red-500 text-sm mt-1">
                              {profileErrors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email}
                          disabled
                          className="input bg-gray-100 cursor-not-allowed"
                        />
                        <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...registerProfile('phone', {
                              required: 'Phone is required',
                              pattern: {
                                value: /^(\+92|0)?[0-9]{10}$/,
                                message: 'Invalid phone number',
                              },
                            })}
                            className={`input ${profileErrors.phone ? 'input-error' : ''}`}
                            placeholder="+923001234567"
                          />
                          {profileErrors.phone && (
                            <p className="text-red-500 text-sm mt-1">
                              {profileErrors.phone.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            WhatsApp Number
                          </label>
                          <input
                            {...registerProfile('whatsapp')}
                            className="input"
                            placeholder="+923001234567"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Preferred Language
                        </label>
                        <select {...registerProfile('language')} className="input">
                          <option value="en">English</option>
                          <option value="ur">Urdu (اردو)</option>
                        </select>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="btn btn-primary disabled:opacity-50"
                        >
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6">Change Password</h2>

                    <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          {...registerPassword('currentPassword', {
                            required: 'Current password is required',
                          })}
                          className={`input ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-red-500 text-sm mt-1">
                            {passwordErrors.currentPassword.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          {...registerPassword('newPassword', {
                            required: 'New password is required',
                            minLength: {
                              value: 8,
                              message: 'Password must be at least 8 characters',
                            },
                            pattern: {
                              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                              message: 'Password must contain uppercase, lowercase, and number',
                            },
                          })}
                          className={`input ${passwordErrors.newPassword ? 'input-error' : ''}`}
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-red-500 text-sm mt-1">
                            {passwordErrors.newPassword.message}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Must be at least 8 characters with uppercase, lowercase, and number
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          {...registerPassword('confirmPassword', {
                            required: 'Please confirm your password',
                            validate: (value) =>
                              value === watch('newPassword') || 'Passwords do not match',
                          })}
                          className={`input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1">
                            {passwordErrors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => resetPasswordForm()}
                          className="btn btn-outline"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="btn btn-primary disabled:opacity-50"
                        >
                          {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* My Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">My Reviews</h2>
                      <span className="text-sm text-gray-600">
                        {userReviews.length} review{userReviews.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {reviewsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-32 bg-gray-200 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : userReviews.length > 0 ? (
                      <div className="space-y-4">
                        {userReviews.map((review: any) => (
                          <div key={review._id} className="border border-gray-200 rounded-lg p-4">
                            {/* Product Info */}
                            <div className="flex items-start justify-between mb-4">
                              <Link
                                href={`/products/${review.product?.slug || review.product?._id}`}
                                className="flex items-start gap-3 flex-1 hover:opacity-80 transition-opacity"
                              >
                                {review.product?.images?.[0]?.url && (
                                  <img
                                    src={review.product.images[0].url}
                                    alt={review.product.name?.en || 'Product'}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                <div>
                                  <h4 className="font-semibold text-gray-900 hover:text-primary-600">
                                    {review.product?.name?.en || 'Product'}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </Link>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditReview(review)}
                                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit Review"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(review._id)}
                                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Review"
                                  disabled={deleteReviewMutation.isPending}
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Review Content */}
                            <ReviewCard
                              review={review}
                              showActions={false}
                            />

                            {/* Review Status */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                {review.isApproved ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Approved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    ⏳ Pending Approval
                                  </span>
                                )}
                                {review.isVerified && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ✓ Verified Purchase
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FiStar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reviews Yet</h3>
                        <p className="text-gray-500 mb-6">
                          You haven't written any reviews yet. Start by purchasing and reviewing products!
                        </p>
                        <Link href="/products" className="btn btn-primary">
                          Browse Products
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>

        {/* Edit Review Modal */}
        {editingReview && (
          <WriteReviewModal
            isOpen={showEditReviewModal}
            onClose={() => {
              setShowEditReviewModal(false);
              setEditingReview(null);
            }}
            productId={editingReview.product._id}
            productName={editingReview.product?.name?.en || 'Product'}
            existingReview={editingReview}
          />
        )}
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
