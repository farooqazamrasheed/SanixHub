import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import BackButton from '@/components/BackButton';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { downloadInvoicePDF, previewInvoicePDF, generateReceiptText } from '@/utils/pdfUtils';

export default function AdminOrderDetailPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Fetch order details
  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => adminAPI.getOrder(id as string),
    enabled: !!id && !authLoading,
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: any) =>
      adminAPI.updateOrderStatus(id as string, { status, note }),
    onSuccess: () => {
      toast.success('Order status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

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

  const order = data?.data?.order;

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }
    updateStatusMutation.mutate({ status: newStatus, note: statusNote });
  };

  const statusColors: any = {
    placed: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const getStatusActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'placed':
        return [
          { value: 'ready', label: 'Mark as Ready' },
          { value: 'cancelled', label: 'Cancel Order' },
        ];
      case 'ready':
        return [
          { value: 'picked_up', label: 'Mark as Picked Up' },
          { value: 'cancelled', label: 'Cancel Order' },
        ];
      default:
        return [];
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!order) return;
    try {
      await downloadInvoicePDF(order);
      toast.success('PDF invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download PDF invoice');
    }
  };

  const handlePreviewPDF = async () => {
    if (!order) return;
    try {
      await previewInvoicePDF(order);
    } catch (error) {
      toast.error('Failed to preview PDF invoice');
    }
  };

  const handleDownloadReceipt = () => {
    if (!order) return;
    try {
      const receiptText = generateReceiptText(order);
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.orderNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="p-12 text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <BackButton 
            href="/admin/orders" 
            label="Back to Orders" 
            variant="primary"
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style jsx global>{`
        @media print {
          nav, header, footer, .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .print-section {
            break-inside: avoid;
          }
          button {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* Print-only Header */}
      <div className="print-only mb-8">
        <h1 className="text-3xl font-bold mb-2">Order #{order.orderNumber}</h1>
        <p className="text-gray-600">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        <p className="text-gray-600">Status: {order.status.toUpperCase().replace('_', ' ')}</p>
      </div>
      
      {/* Header */}
      <div className="mb-6 no-print">
        <BackButton 
          href="/admin/orders" 
          label="Back to Orders" 
          variant="primary"
          className="mb-4"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                statusColors[order.status]
              }`}
            >
              {order.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePrint}
            className="btn btn-outline flex items-center gap-2"
            title="Print Order"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn btn-primary flex items-center gap-2"
            title="Download PDF Invoice"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={handlePreviewPDF}
            className="btn btn-outline flex items-center gap-2"
            title="Preview PDF Invoice"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <button
            onClick={handleDownloadReceipt}
            className="btn btn-outline flex items-center gap-2"
            title="Download Receipt (Text)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Receipt
          </button>
          {getStatusActions(order.status).length > 0 && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="btn bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Update Status
            </button>
          )}
          </div>
        </div>
        
        <p className="text-gray-600 mt-2">
          Placed on {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 print-section">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => {
                // Get image URL - handle both relative and absolute URLs
                // Remove /api from API_URL for uploads path
                const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
                const imageUrl = item.productSnapshot.image?.startsWith('http') 
                  ? item.productSnapshot.image 
                  : `${baseUrl}${item.productSnapshot.image}`;
                
                return (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {item.productSnapshot.image ? (
                      <img
                        src={imageUrl}
                        alt={item.productSnapshot.name.en}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Failed to load image:', item.productSnapshot.image);
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.productSnapshot.name.en}</h3>
                    {item.productSnapshot.productId && (
                      <p className="text-xs text-primary-600 font-mono font-semibold">
                        ID: {item.productSnapshot.productId}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">SKU: {item.productSnapshot.sku}</p>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity} × PKR {item.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">PKR {item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Pricing Summary */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>PKR {order.pricing.subtotal.toLocaleString()}</span>
              </div>
              {order.pricing.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-PKR {order.pricing.discount.toLocaleString()}</span>
                </div>
              )}
              {order.pricing.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>PKR {order.pricing.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span>PKR {order.pricing.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-lg shadow-md p-6 print-section">
            <h2 className="text-xl font-bold mb-4">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory.map((history: any, index: number) => (
                <div key={index} className="flex gap-4 pb-3 border-b last:border-b-0">
                  <div className="flex-shrink-0 w-3 h-3 mt-1.5 rounded-full bg-primary-600"></div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {history.status.toUpperCase().replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(history.timestamp).toLocaleString()}
                    </p>
                    {history.note && (
                      <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="bg-white rounded-lg shadow-md p-6 print-section">
            <h2 className="text-xl font-bold mb-4">Customer Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{order.pickupDetails.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{order.pickupDetails.phone}</p>
              </div>
              {order.pickupDetails.whatsapp && (
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <p className="font-semibold">{order.pickupDetails.whatsapp}</p>
                </div>
              )}
              {order.pickupDetails.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="font-semibold">{order.pickupDetails.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-lg shadow-md p-6 print-section">
            <h2 className="text-xl font-bold mb-4">Payment Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Method</p>
                <p className="font-semibold capitalize">
                  {order.payment.method.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                    order.payment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {order.payment.status.toUpperCase()}
                </span>
              </div>
              {order.payment.paidAt && (
                <div>
                  <p className="text-sm text-gray-600">Paid At</p>
                  <p className="font-semibold">
                    {new Date(order.payment.paidAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coupon Details */}
          {order.coupon && (
            <div className="bg-white rounded-lg shadow-md p-6 print-section">
              <h2 className="text-xl font-bold mb-4">Coupon Applied</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Code</p>
                  <p className="font-semibold">{order.coupon.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discount</p>
                  <p className="font-semibold text-green-600">
                    -PKR {order.coupon.discountAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Update Order Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full input"
                >
                  <option value="">Select status...</option>
                  {getStatusActions(order.status).map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full input"
                  rows={3}
                  placeholder="Add a note about this status change..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={updateStatusMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setNewStatus('');
                    setStatusNote('');
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
