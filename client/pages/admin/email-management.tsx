import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function EmailManagementPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [testEmailType, setTestEmailType] = useState<'lowstock'>('lowstock');
  const [alertResult, setAlertResult] = useState<any>(null);

  // Trigger low stock alert
  const alertMutation = useMutation({
    mutationFn: () => adminAPI.triggerLowStockAlert(),
    onSuccess: (response: any) => {
      const result = response.data;
      setAlertResult(result);
      
      if (result.emailSent) {
        toast.success(`Alert sent successfully! ${result.count} low stock products notified.`);
      } else if (result.alreadySent) {
        toast('Alert was already sent recently (within 24 hours)', { icon: 'ℹ️' });
      } else if (!result.success) {
        toast(result.error || 'Email not configured or no low stock products', { icon: '⚠️' });
      }
    },
    onError: (error: any) => {
      toast.error('Failed to send alert');
      console.error(error);
    },
  });

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton href="/admin" label="Back to Dashboard" variant="primary" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Management</h1>
            <p className="text-gray-600 mt-1">Test and manage email notifications</p>
          </div>
        </div>
      </div>

      {/* Email Configuration Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">ℹ️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Email Configuration</h3>
            <p className="text-blue-800 text-sm mb-3">
              Email notifications are sent automatically for:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 mb-3">
              <li>✓ New user registration (Welcome email)</li>
              <li>✓ Order placement (Order confirmation)</li>
              <li>✓ Order status changes (Status updates)</li>
              <li>✓ Low stock alerts (Admin notifications)</li>
            </ul>
            <p className="text-sm text-blue-700">
              <strong>Configuration:</strong> Email settings are in <code className="bg-blue-100 px-2 py-1 rounded">server/.env</code>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              If not configured, the system works normally but emails won't be sent.
            </p>
          </div>
        </div>
      </div>

      {/* Automatic Email Triggers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Automatic Email Triggers</h2>
        <div className="space-y-4">
          {/* Welcome Email */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                👋
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Welcome Email</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Sent automatically when a new user registers an account.
                </p>
                <div className="text-xs text-gray-500">
                  <strong>Trigger:</strong> User registration → Email sent immediately
                </div>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                AUTO
              </div>
            </div>
          </div>

          {/* Order Confirmation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                🛍️
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Order Confirmation</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Sent automatically when a customer places an order. Includes order details, items, and pickup information.
                </p>
                <div className="text-xs text-gray-500">
                  <strong>Trigger:</strong> Order creation → Email sent immediately
                </div>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                AUTO
              </div>
            </div>
          </div>

          {/* Order Status Update */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                📦
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Order Status Update</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Sent automatically when admin changes order status (ready, picked up, cancelled).
                </p>
                <div className="text-xs text-gray-500">
                  <strong>Trigger:</strong> Admin updates order status → Email sent immediately
                </div>
              </div>
              <div className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                AUTO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Email Triggers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Manual Email Triggers</h2>
        
        {/* Low Stock Alert */}
        <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Low Stock Alert</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Send email notification to admin about products running low on stock. Can be triggered manually or set up as a daily automated check.
              </p>
              <div className="bg-white border border-yellow-300 rounded-lg p-3 mb-3">
                <div className="text-xs font-semibold text-yellow-900 mb-1">Email includes:</div>
                <ul className="text-xs text-yellow-800 space-y-1">
                  <li>• List of low stock products</li>
                  <li>• Current stock levels</li>
                  <li>• Low stock thresholds</li>
                  <li>• SKU and product names</li>
                </ul>
              </div>
              
              <button
                onClick={() => alertMutation.mutate()}
                disabled={alertMutation.isPending}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-medium transition-colors"
              >
                {alertMutation.isPending ? 'Sending...' : '📧 Send Low Stock Alert Now'}
              </button>
            </div>
          </div>

          {/* Alert Result */}
          {alertResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              alertResult.emailSent 
                ? 'bg-green-100 border border-green-200' 
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <h4 className="font-semibold mb-2">
                {alertResult.emailSent ? '✅ Alert Sent!' : 'ℹ️ Alert Status'}
              </h4>
              <div className="text-sm space-y-1">
                {alertResult.emailSent && (
                  <>
                    <p>✓ Email sent successfully to admin</p>
                    <p>✓ {alertResult.count} low stock product(s) reported</p>
                  </>
                )}
                {alertResult.alreadySent && (
                  <p>⏱️ Alert was already sent within the last 24 hours to prevent spam</p>
                )}
                {!alertResult.success && (
                  <p>❌ {alertResult.error || 'Email not configured or no low stock products'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Email Templates</h2>
        <p className="text-gray-600 mb-4">
          All emails use professional HTML templates with your branding.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Template Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Professional design</li>
              <li>✓ Mobile responsive</li>
              <li>✓ Brand colors</li>
              <li>✓ Clear call-to-actions</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Customization:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Store name in <code>.env</code></li>
              <li>✓ From email address</li>
              <li>✓ Admin email address</li>
              <li>✓ Client URL for links</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Configuration Guide */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">📧 Email Configuration Guide</h2>
        <div className="space-y-3 text-sm">
          <p>
            To enable email notifications, add these variables to <code className="bg-white bg-opacity-20 px-2 py-1 rounded">server/.env</code>:
          </p>
          <div className="bg-black bg-opacity-20 rounded-lg p-4 font-mono text-xs">
            <div>EMAIL_HOST=smtp.gmail.com</div>
            <div>EMAIL_PORT=587</div>
            <div>EMAIL_SECURE=false</div>
            <div>EMAIL_USER=your-email@gmail.com</div>
            <div>EMAIL_PASSWORD=your-app-password</div>
            <div>EMAIL_FROM=your-email@gmail.com</div>
            <div>EMAIL_FROM_NAME=Your Store Name</div>
            <div>ADMIN_EMAIL=admin@yourstore.com</div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 mt-3">
            <strong>For Gmail:</strong>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Enable 2-Factor Authentication</li>
              <li>Generate an "App Password" in Google Account settings</li>
              <li>Use that App Password (not your regular password)</li>
            </ol>
          </div>
          <p className="text-xs opacity-90 mt-3">
            💡 <strong>Tip:</strong> The system works perfectly without email configured - emails just won't send.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Link
          href="/admin/inventory/reports"
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">View Inventory Reports</div>
          <div className="text-sm text-gray-600">Check low stock products</div>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-2xl mb-2">🛒</div>
          <div className="font-semibold">Manage Orders</div>
          <div className="text-sm text-gray-600">Update order status</div>
        </Link>
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-2xl mb-2">🔐</div>
          <div className="font-semibold">Gmail App Passwords</div>
          <div className="text-sm text-gray-600">Generate password</div>
        </a>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
