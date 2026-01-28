import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { downloadBulkInvoicesPDF, formatOrdersForExport } from '@/utils/pdfUtils';
import { exportToCSV } from '@/utils/exportUtils';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import { useSocket } from '@/hooks/useSocket';
import { useAnimationClasses } from '@/store/useAnimationPreferences';
import ExportOrdersModal from '@/components/admin/ExportOrdersModal';

export default function AdminOrdersPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Track order state changes
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());
  const [updatedOrders, setUpdatedOrders] = useState<Set<string>>(new Set());
  
  // WebSocket connection
  const { socket } = useSocket();
  
  // Animation preferences
  const {
    getAnimationClass,
    getRowHighlightClass,
    shouldShowBadge,
    shouldAnimateToast,
  } = useAnimationClasses();

  // Debounce search input - auto-search after 500ms
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const queryClient = useQueryClient();

  // Real-time order updates via WebSocket
  useEffect(() => {
    if (!socket) return;
    
    // Listen for new orders
    socket.on('order:created', (data: any) => {
      console.log('🔴 LIVE: New order created', data);
      
      setNewOrders(prev => new Set(prev).add(data.order._id));
      setTimeout(() => {
        setNewOrders(prev => {
          const updated = new Set(prev);
          updated.delete(data.order._id);
          return updated;
        });
      }, 5000);
      
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      if (shouldAnimateToast()) {
        toast.success(
          <div className="flex items-center gap-3">
            <div className="text-2xl">🛒</div>
            <div>
              <p className="font-semibold">New Order Received</p>
              <p className="text-sm opacity-90">Order #{data.order.orderNumber}</p>
            </div>
          </div>,
          {
            duration: 5000,
            style: { background: '#10b981', color: 'white', padding: '16px', borderRadius: '10px' },
          }
        );
      } else {
        toast.success(`New order: #${data.order.orderNumber}`);
      }
    });
    
    // Listen for order status updates
    socket.on('order:updated', (data: any) => {
      console.log('🔴 LIVE: Order updated', data);
      
      setUpdatedOrders(prev => new Set(prev).add(data.order._id));
      setTimeout(() => {
        setUpdatedOrders(prev => {
          const updated = new Set(prev);
          updated.delete(data.order._id);
          return updated;
        });
      }, 5000);
      
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      if (shouldAnimateToast()) {
        toast.success(
          <div className="flex items-center gap-3">
            <div className="text-2xl">📝</div>
            <div>
              <p className="font-semibold">Order Status Updated</p>
              <p className="text-sm opacity-90">#{data.order.orderNumber} → {data.order.status}</p>
            </div>
          </div>,
          {
            duration: 4000,
            style: { background: '#3b82f6', color: 'white', padding: '16px', borderRadius: '10px' },
          }
        );
      } else {
        toast.success(`Order #${data.order.orderNumber} updated`);
      }
    });
    
    return () => {
      socket.off('order:created');
      socket.off('order:updated');
    };
  }, [socket, queryClient, shouldAnimateToast]);

  // Fetch orders
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, page, search],
    queryFn: () => adminAPI.getAllOrders({ status: statusFilter, page, limit: 20, search }),
    enabled: !authLoading, // Only fetch when authentication is complete
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, note }: any) =>
      adminAPI.updateOrderStatus(orderId, { status, note }),
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
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

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || {};

  const handleDropdownToggle = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }

    // Toggle dropdown
    setOpenDropdown(openDropdown === orderId ? null : orderId);
  };

  const handleDropdownMouseEnter = () => {
    // Clear timeout when mouse enters
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
  };

  const handleDropdownMouseLeave = () => {
    // Set timeout to close dropdown after 500ms
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 500);
    setDropdownTimeout(timeout);
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    const notes: any = {
      ready: 'Order is ready for pickup',
      picked_up: 'Order has been picked up',
      cancelled: 'Order cancelled by admin',
    };

    setOpenDropdown(null); // Close dropdown immediately

    if (confirm(`Are you sure you want to mark this order as ${newStatus.replace('_', ' ')}?`)) {
      updateStatusMutation.mutate({
        orderId,
        status: newStatus,
        note: notes[newStatus] || '',
      });
    }
  };

  const statusColors = {
    placed: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const getStatusActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'placed':
        return ['ready', 'cancelled'];
      case 'ready':
        return ['picked_up', 'cancelled'];
      default:
        return [];
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    try {
      const formattedOrders = formatOrdersForExport(orders);
      exportToCSV(formattedOrders, `orders-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Exported ${orders.length} orders to CSV`);
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  const handleBulkPDFExport = async () => {
    if (orders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    if (orders.length > 10) {
      if (!confirm(`This will download ${orders.length} PDF files. Continue?`)) {
        return;
      }
    }
    try {
      toast.loading(`Generating ${orders.length} PDF invoices...`);
      await downloadBulkInvoicesPDF(orders);
      toast.dismiss();
      toast.success(`Successfully exported ${orders.length} PDF invoices`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export PDF invoices');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-gray-600 mt-1">Manage customer orders and update status</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-primary flex items-center gap-2"
            disabled={orders.length === 0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Orders
          </button>
          <button
            onClick={handleBulkPDFExport}
            className="btn btn-outline flex items-center gap-2"
            disabled={orders.length === 0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Individual PDFs ({orders.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap border-b">
          {[
            { label: 'All Orders', value: '', count: orders.length },
            { label: 'Placed', value: 'placed' },
            { label: 'Ready', value: 'ready' },
            { label: 'Picked Up', value: 'picked_up' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-6 py-4 font-semibold ${
                statusFilter === tab.value
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search - Real-time auto-search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Type to search by order number, customer name, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchInput && (
            <p className="text-xs text-gray-500 mt-1">
              Searching automatically as you type...
            </p>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order: any) => {
                    const isNew = newOrders.has(order._id);
                    const isUpdated = updatedOrders.has(order._id);
                    
                    return (
                    <tr 
                      key={order._id} 
                      className={`
                        hover:bg-gray-50 transition-all duration-300
                        ${isNew ? `${getRowHighlightClass('new')} ${getAnimationClass('new', 'order')}` : ''}
                        ${isUpdated ? `${getRowHighlightClass('updated')} ${getAnimationClass('updated', 'order')}` : ''}
                      `}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="font-semibold text-primary-600 hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          {shouldShowBadge() && isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white live-badge shadow-lg">
                              🆕 NEW
                            </span>
                          )}
                          {shouldShowBadge() && isUpdated && !isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white live-badge shadow-lg">
                              🔴 LIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium">{order.pickupDetails.customerName}</p>
                          <p className="text-gray-500">{order.pickupDetails.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((item: any, idx: number) => {
                              // Remove /api from API_URL for uploads path
                              const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
                              const imageUrl = item.productSnapshot.image?.startsWith('http') 
                                ? item.productSnapshot.image 
                                : `${baseUrl}${item.productSnapshot.image}`;
                              
                              return (
                                <div key={idx} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-gray-100">
                                  {item.productSnapshot.image ? (
                                    <img
                                      src={imageUrl}
                                      alt={item.productSnapshot.name.en}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.parentElement) {
                                          e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-sm text-gray-600">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">
                          PKR {order.pricing.total.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              statusColors[order.status as keyof typeof statusColors]
                            }`}
                          >
                            {order.status.toUpperCase().replace('_', ' ')}
                          </span>
                          {order.status === 'cancelled' && order.statusHistory && order.statusHistory.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {order.statusHistory[order.statusHistory.length - 1]?.note?.toLowerCase().includes('admin') 
                                ? 'By Admin' 
                                : 'By Customer'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Order Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>

                          {order.customer && (
                            <Link
                              href={`/admin/users/${typeof order.customer === 'object' ? order.customer._id : order.customer}`}
                              className="text-purple-600 hover:text-purple-800"
                              title="View Customer Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </Link>
                          )}

                          {/* Status Update Dropdown - Optimized with timeout */}
                          {getStatusActions(order.status).length > 0 && (
                            <div className="relative">
                              <button 
                                onClick={(e) => handleDropdownToggle(order._id, e)}
                                onMouseEnter={() => {
                                  // Auto-open on hover after 200ms
                                  const timeout = setTimeout(() => {
                                    setOpenDropdown(order._id);
                                  }, 200);
                                  setDropdownTimeout(timeout);
                                }}
                                onMouseLeave={handleDropdownMouseLeave}
                                className={`text-green-600 hover:text-green-800 transition-colors p-1 rounded ${
                                  openDropdown === order._id ? 'bg-green-50' : ''
                                }`}
                                title="Update Status"
                                disabled={updateStatusMutation.isPending}
                              >
                                {updateStatusMutation.isPending ? (
                                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                              </button>
                              
                              {/* Dropdown Menu */}
                              {openDropdown === order._id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 animate-fadeIn"
                                  onMouseEnter={handleDropdownMouseEnter}
                                  onMouseLeave={handleDropdownMouseLeave}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getStatusActions(order.status).map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusUpdate(order._id, status)}
                                      disabled={updateStatusMutation.isPending}
                                      className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg"
                                    >
                                      <div className="flex items-center gap-2">
                                        {status === 'ready' && (
                                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {status === 'picked_up' && (
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        )}
                                        {status === 'cancelled' && (
                                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        )}
                                        <span className="font-medium">
                                          Mark as {status.replace('_', ' ')}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{' '}
                  {pagination.total} orders
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn btn-outline text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.pages}
                    className="btn btn-outline text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Modal */}
      <ExportOrdersModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        statusFilter={statusFilter}
        searchFilter={search}
        totalOrders={pagination.total || orders.length}
      />
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
