import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI, categoriesAPI, brandsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';

export default function ImportExportInventoryPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const queryClient = useQueryClient();
  const socket = getSocket();
  
  const [csvData, setCsvData] = useState('');
  const [importResults, setImportResults] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    status: ''
  });
  const [importProgress, setImportProgress] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch categories and brands for filters
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsAPI.getAll(),
  });

  // WebSocket listeners for real-time import progress
  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    const handleImportProgress = (data: any) => {
      console.log('📦 Import progress:', data);
      setImportProgress(data);
      
      if (data.status === 'success') {
        toast.loading(`Importing: ${data.processed}/${data.total} - ${data.currentProduct}`, {
          id: 'import-progress',
          duration: 1000
        });
      }
    };

    const handleImportComplete = (data: any) => {
      console.log('✅ Import complete:', data);
      setIsImporting(false);
      setImportProgress(null);
      setImportResults({
        imported: data.imported,
        failed: data.failed,
        results: data.results,
        errors: data.errors
      });
      
      toast.success(`Import complete! ${data.imported} products updated`, {
        id: 'import-progress',
        duration: 4000
      });

      queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
    };

    const handleRefreshRequired = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
    };

    socket.on('inventory:import-progress', handleImportProgress);
    socket.on('inventory:import-complete', handleImportComplete);
    socket.on('inventory:refresh-required', handleRefreshRequired);

    return () => {
      socket.off('inventory:import-progress', handleImportProgress);
      socket.off('inventory:import-complete', handleImportComplete);
      socket.off('inventory:refresh-required', handleRefreshRequired);
    };
  }, [socket, isAuthenticated, isInitialized, queryClient]);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => {
      const params: any = { format: exportFormat };
      if (filters.category) params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;
      if (filters.status) params.status = filters.status;
      
      return adminAPI.exportInventory(params);
    },
    onSuccess: (response: any) => {
      // Determine file extension based on format
      let extension = 'csv';
      let mimeType = 'text/csv';
      
      if (exportFormat === 'excel') {
        extension = 'xlsx';
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (exportFormat === 'pdf') {
        extension = 'pdf';
        mimeType = 'application/pdf';
      }
      
      // Create download link
      const blob = new Blob([response], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-export-${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Inventory exported as ${exportFormat.toUpperCase()}!`);
    },
    onError: (error: any) => {
      toast.error('Failed to export inventory');
      console.error(error);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (data: any) => {
      setIsImporting(true);
      setImportProgress(null);
      return adminAPI.importInventoryCSV(data);
    },
    onSuccess: (response: any) => {
      const { imported, failed, results, errors } = response.data;
      
      // Only set results if WebSocket didn't already handle it
      if (!importProgress) {
        setImportResults({ imported, failed, results, errors });
        setIsImporting(false);
        
        if (imported > 0) {
          toast.success(`Successfully imported ${imported} product(s)!`);
          queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
        }
        if (failed > 0) {
          toast.error(`Failed to import ${failed} product(s)`);
        }
      }
    },
    onError: (error: any) => {
      setIsImporting(false);
      setImportProgress(null);
      toast.error(error?.response?.data?.error?.message || 'Failed to import CSV');
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      toast.success('File loaded successfully!');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData.trim()) {
      toast.error('Please upload a CSV file first');
      return;
    }

    // Parse CSV
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV file must have at least a header and one data row');
      return;
    }

    // Skip header, parse data
    const dataLines = lines.slice(1);
    const parsedData = dataLines
      .map((line, index) => {
        // Handle quoted fields
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 5) {
          console.warn(`Skipping invalid line ${index + 2}`);
          return null;
        }

        const sku = values[0].replace(/"/g, '').trim();
        const stock = values[4].replace(/"/g, '').trim();
        const lowStockThreshold = values[7]?.replace(/"/g, '').trim();

        return {
          sku,
          stock: stock !== '' ? stock : undefined,
          lowStockThreshold: lowStockThreshold !== '' ? lowStockThreshold : undefined,
        };
      })
      .filter(Boolean);

    if (parsedData.length === 0) {
      toast.error('No valid data found in CSV');
      return;
    }

    importMutation.mutate({ csvData: parsedData });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminAPI.getInventoryTemplate();
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded with current categories & brands!');
    } catch (error) {
      toast.error('Failed to download template');
      console.error(error);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      status: ''
    });
  };

  const hasActiveFilters = filters.category || filters.brand || filters.status;

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
        <BackButton href="/admin/inventory" label="Back to Inventory" variant="primary" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Import / Export Inventory</h1>
            <p className="text-gray-600 mt-1">Manage inventory via CSV files</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <h2 className="text-xl font-bold">Export Inventory</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Download your inventory data in multiple formats with optional filters.
          </p>

          {/* Export Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  exportFormat === 'csv'
                    ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                📄 CSV
              </button>
              <button
                onClick={() => setExportFormat('excel')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  exportFormat === 'excel'
                    ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                📊 Excel
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                📑 PDF
              </button>
            </div>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-2 mb-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center justify-between"
          >
            <span>🔍 {showFilters ? 'Hide' : 'Show'} Filters</span>
            <span>{hasActiveFilters && '(Active)'}</span>
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Categories</option>
                  {categoriesData?.data?.categories?.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Brands</option>
                  {brandsData?.data?.brands?.map((brand: any) => (
                    <option key={brand._id} value={brand._id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Status</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Export includes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Product SKU and names</li>
              <li>✓ Current stock levels</li>
              <li>✓ Category & Brand info</li>
              <li>✓ Low stock thresholds</li>
              <li>✓ Prices and total values</li>
              <li>✓ Stock status with color coding</li>
            </ul>
          </div>

          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            {exportMutation.isPending 
              ? 'Exporting...' 
              : `📥 Export as ${exportFormat.toUpperCase()}`
            }
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <h2 className="text-xl font-bold">Import Inventory</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Update inventory from a CSV file. Use this for bulk updates, physical counts,
            or warehouse system imports.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• CSV must include SKU column</li>
              <li>• Products matched by SKU</li>
              <li>• Invalid SKUs will be skipped</li>
              <li>• Download template for format</li>
            </ul>
          </div>

          {/* Template Download */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mb-4 font-medium transition-colors"
          >
            📄 Download CSV Template
          </button>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {csvData && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ File loaded ({csvData.split('\n').length - 1} rows)
            </div>
          )}

          {/* Import Progress */}
          {isImporting && importProgress && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-900">
                  Importing... {importProgress.processed}/{importProgress.total}
                </span>
                <span className="text-xs text-indigo-700">
                  {Math.round((importProgress.processed / importProgress.total) * 100)}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-indigo-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                ></div>
              </div>

              {importProgress.currentProduct && (
                <p className="text-xs text-indigo-700">
                  Current: {importProgress.currentProduct}
                </p>
              )}

              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">✓ {importProgress.imported} imported</span>
                <span className="text-red-600">✗ {importProgress.failed} failed</span>
              </div>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importMutation.isPending || !csvData || isImporting}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isImporting ? '⏳ Importing...' : importMutation.isPending ? 'Processing...' : '📤 Import from CSV'}
          </button>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Import Results</h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">
                {importResults.imported}
              </div>
              <div className="text-sm text-green-800">Successfully Imported</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-600">
                {importResults.failed}
              </div>
              <div className="text-sm text-red-800">Failed</div>
            </div>
          </div>

          {/* Success List */}
          {importResults.results.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-green-800">✓ Successfully Updated:</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResults.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className="text-sm text-gray-700 bg-green-50 px-3 py-2 rounded"
                  >
                    {result.sku} - {result.productName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error List */}
          {importResults.errors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-red-800">✕ Errors:</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResults.errors.map((error: any, index: number) => (
                  <div
                    key={index}
                    className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded"
                  >
                    {error.sku || 'Unknown'}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📚 How to Use:</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
          <div>
            <p className="font-semibold mb-2">Export:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Choose your preferred format (CSV, Excel, or PDF)</li>
              <li>Optionally apply filters (category, brand, stock status)</li>
              <li>Click the export button</li>
              <li>File will download automatically</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold mb-2">Import:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Download the CSV template (includes your actual categories & brands)</li>
              <li>Fill in stock quantities and thresholds</li>
              <li>Make sure SKUs match your products exactly</li>
              <li>Upload the CSV file</li>
              <li>Click "Import from CSV"</li>
              <li>Watch real-time progress updates</li>
            </ol>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</p>
          <ul className="space-y-1 text-blue-800">
            <li>• Export your inventory, make changes in Excel/Sheets, then import back for bulk updates</li>
            <li>• Use filters to export specific categories or brands only</li>
            <li>• PDF format is great for printable reports</li>
            <li>• Excel format includes color-coded stock status and formulas</li>
            <li>• Real-time progress shows you exactly what's being imported</li>
          </ul>
        </div>
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
