import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { ordersAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';
import { downloadInvoicePDF, previewInvoicePDF, generateReceiptText } from '@/utils/pdfUtils';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  // Fetch order
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getById(id as string),
    enabled: !!id,
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () => ordersAPI.cancel(id as string, { reason: 'Cancelled by customer' }),
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel order');
    },
  });

  const handleCancelOrder = () => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!order) return;
    try {
      await downloadInvoicePDF(order);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handlePreviewPDF = async () => {
    if (!order) return;
    try {
      await previewInvoicePDF(order);
    } catch (error) {
      toast.error('Failed to preview invoice');
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
      <Layout>
        <div className="container-custom py-12">
          <div className="animate-pulse space-y-4">
            <div className="bg-gray-200 h-8 rounded w-1/3"></div>
            <div className="bg-gray-200 h-64 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const order = data?.data?.order;

  if (!order) {
    return (
      <Layout>
        <div className="container-custom py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Order not found</h1>
          <Link href="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </div>
      </Layout>
    );
  }

  const statusColors = {
    placed: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const canCancel = order.status === 'placed' || order.status === 'ready';

  return (
    <>
      <NextSeo title={`Order ${order.orderNumber} - SanixHub`} />
      <Layout>
        <div className="bg-gray-50 py-8">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/orders" label="Back to Orders" variant="ghost" />
            </div>

            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Order {order.orderNumber}</h1>
                  <p className="text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full font-semibold ${statusColors[order.status as keyof typeof statusColors]}`}>
                  {order.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              {/* Order Status Timeline */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Order Status</h3>
                <div className="space-y-3">
                  {order.statusHistory.map((history: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${
                          index === order.statusHistory.length - 1
                            ? 'bg-primary-600'
                            : 'bg-gray-300'
                        }`} />
                        {index < order.statusHistory.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold capitalize">
                          {history.status.replace('_', ' ')}
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

              {/* Action Buttons */}
              <div className="border-t pt-6">
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
                    title="Download Invoice PDF"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Download Invoice
                  </button>
                  <button
                    onClick={handlePreviewPDF}
                    className="btn btn-outline flex items-center gap-2"
                    title="Preview Invoice"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                  {canCancel && (
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelMutation.isPending}
                      className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Order Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Order Items</h2>
                  <div className="divide-y">
                    {order.items.map((item: any) => {
                      // Get image URL - handle both relative and absolute URLs
                      // Remove /api from API_URL for uploads path
                      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
                      const imageUrl = item.productSnapshot.image?.startsWith('http') 
                        ? item.productSnapshot.image 
                        : `${baseUrl}${item.productSnapshot.image}`;
                      
                      return (
                      <div key={item._id} className="py-4 flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.productSnapshot.image ? (
                            <img
                              src={imageUrl}
                              alt={item.productSnapshot.name.en}
                              className="w-full h-full object-cover"
                              onError={(e) => {
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
                          <h3 className="font-semibold mb-1">
                            {item.productSnapshot.name.en}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            SKU: {item.productSnapshot.sku}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-600">Quantity:</span>{' '}
                            <span className="font-semibold">{item.quantity}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            PKR {item.subtotal.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            PKR {item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Summary & Details */}
              <div className="lg:col-span-1 space-y-6">
                {/* Pricing */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">
                        PKR {order.pricing.subtotal.toLocaleString()}
                      </span>
                    </div>

                    {order.pricing.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-PKR {order.pricing.discount.toLocaleString()}</span>
                      </div>
                    )}

                    {order.coupon && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Coupon</span>
                        <span className="font-semibold">{order.coupon.code}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold">
                        PKR {order.pricing.tax.toLocaleString()}
                      </span>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-primary-600">
                          PKR {order.pricing.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pickup Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Pickup Details</h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600 block mb-1">Customer Name</span>
                      <span className="font-semibold">{order.pickupDetails.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Phone</span>
                      <span className="font-semibold">{order.pickupDetails.phone}</span>
                    </div>
                    {order.pickupDetails.whatsapp && (
                      <div>
                        <span className="text-gray-600 block mb-1">WhatsApp</span>
                        <span className="font-semibold">{order.pickupDetails.whatsapp}</span>
                      </div>
                    )}
                    {order.pickupDetails.notes && (
                      <div>
                        <span className="text-gray-600 block mb-1">Notes</span>
                        <p className="text-gray-800">{order.pickupDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Payment</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method</span>
                      <span className="font-semibold capitalize">
                        {order.payment.method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-semibold ${
                        order.payment.status === 'completed' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Orders */}
            <div className="mt-6">
              <Link href="/orders" className="text-primary-600 hover:underline">
                ← Back to My Orders
              </Link>
            </div>
          </div>
        </div>
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
