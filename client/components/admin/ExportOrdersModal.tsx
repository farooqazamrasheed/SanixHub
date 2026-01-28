import { useState } from 'react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface ExportOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  searchFilter: string;
  totalOrders: number;
}

export default function ExportOrdersModal({
  isOpen,
  onClose,
  statusFilter,
  searchFilter,
  totalOrders
}: ExportOrdersModalProps) {
  const [format, setFormat] = useState<string>('csv-detailed');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    const loadingToast = toast.loading('Generating export...');

    try {
      const params: any = { format };
      
      if (statusFilter) params.status = statusFilter;
      if (searchFilter) params.search = searchFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await adminAPI.exportOrders(params);
      
      // Determine file extension
      let extension = 'csv';
      let mimeType = 'text/csv';
      
      if (format === 'excel') {
        extension = 'xlsx';
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (format.includes('pdf')) {
        extension = 'pdf';
        mimeType = 'application/pdf';
      }
      
      // Create download link
      const blob = new Blob([response], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-export-${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully!', { id: loadingToast });
      onClose();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error?.response?.data?.error?.message || 'Failed to export orders', { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'csv-summary',
      label: 'CSV - Summary',
      description: 'One row per order with basic info',
      icon: '📄'
    },
    {
      value: 'csv-detailed',
      label: 'CSV - Detailed',
      description: 'One row per item with full details',
      icon: '📋'
    },
    {
      value: 'excel',
      label: 'Excel (Multi-sheet)',
      description: 'Professional format with statistics',
      icon: '📊'
    },
    {
      value: 'pdf-combined',
      label: 'PDF - Combined',
      description: 'All orders in one PDF file',
      icon: '📑'
    },
    {
      value: 'pdf-summary',
      label: 'PDF - Summary Report',
      description: 'Statistics and overview report',
      icon: '📈'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Export Orders</h2>
            <p className="text-sm text-gray-600 mt-1">
              Exporting {totalOrders} order{totalOrders !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="space-y-2">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    format === option.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                    {format === option.value && (
                      <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters Info */}
          {(statusFilter || searchFilter) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">Active Filters</h4>
                  <ul className="text-sm text-blue-800 mt-1 space-y-1">
                    {statusFilter && <li>• Status: {statusFilter.toUpperCase().replace('_', ' ')}</li>}
                    {searchFilter && <li>• Search: "{searchFilter}"</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">📋 Export Information</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• CSV files can be opened in Excel or Google Sheets</li>
              <li>• Excel format includes multiple sheets and statistics</li>
              <li>• PDF formats are great for printing and sharing</li>
              <li>• Detailed formats include individual item information</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Orders
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
