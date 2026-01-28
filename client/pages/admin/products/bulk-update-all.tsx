import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiAlertTriangle, FiDownload, FiUpload, FiDatabase, FiSettings, FiCheckCircle } from 'react-icons/fi';
import AdminLayout from '@/components/admin/AdminLayout';
import BackButton from '@/components/BackButton';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import toast from 'react-hot-toast';

interface UpdateStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  changes: {
    skuFixed: number;
    priceRounded: number;
    stockFixed: number;
    missingFieldsAdded: number;
    subcategoryAdded: number;
    seoAdded: number;
    dimensionsAdded: number;
    slugFixed: number;
    imagesFixed: number;
  };
}

export default function BulkUpdateAllProductsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleRunUpdate = async () => {
    if (!isDryRun && !window.confirm('⚠️ This will update ALL products in the database. Are you sure?')) {
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setStats(null);
    setProgress(0);

    try {
      const startTime = Date.now();
      setLogs(prev => [...prev, '🚀 Starting bulk product update...']);
      
      if (createBackup && !isDryRun) {
        setLogs(prev => [...prev, '📦 Creating backup...']);
      }

      if (isDryRun) {
        setLogs(prev => [...prev, '⚠️ DRY RUN MODE - No changes will be saved']);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/bulk-update-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          dryRun: isDryRun,
          createBackup: createBackup
        })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const data = await response.json();
      setStats(data.stats);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (isDryRun) {
        setLogs(prev => [...prev, `\n✅ Dry run completed in ${duration}s`]);
        toast.success('Dry run completed! Review the results below.');
      } else {
        setLogs(prev => [...prev, `\n✅ Update completed in ${duration}s`]);
        toast.success(`Successfully updated ${data.stats.updated} products!`);
      }
      
      setProgress(100);
    } catch (error: any) {
      setLogs(prev => [...prev, `\n❌ Error: ${error.message}`]);
      toast.error('Update failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <BackButton href="/admin/products" label="Back to Products" />
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bulk Update All Products</h1>
        <p className="text-gray-600">
          Update all existing products with missing fields, fix data issues, and normalize formats
        </p>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6"
      >
        <div className="flex">
          <FiAlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700 font-semibold">Important:</p>
            <p className="text-sm text-yellow-700 mt-1">
              This operation will modify ALL products in your database. Always run in DRY RUN mode first and create a backup before applying changes.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FiSettings className="text-primary-600" />
              Configuration
            </h2>

            <div className="space-y-4">
              {/* Dry Run Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="font-semibold text-gray-900 flex items-center gap-2">
                    <FiRefreshCw className={isDryRun ? 'text-blue-600' : 'text-gray-400'} />
                    Dry Run Mode
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Preview changes without saving
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="sr-only peer"
                    disabled={isRunning}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Backup Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="font-semibold text-gray-900 flex items-center gap-2">
                    <FiDatabase className={createBackup ? 'text-green-600' : 'text-gray-400'} />
                    Create Backup
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    {isDryRun 
                      ? 'Disabled in dry run mode' 
                      : 'Backup before updating'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="sr-only peer"
                    disabled={isRunning || isDryRun}
                  />
                  <div className={`w-11 h-6 rounded-full peer ${
                    isDryRun ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300'
                  } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                    !isDryRun ? 'peer-checked:bg-green-600' : ''
                  }`}></div>
                </label>
              </div>

              {/* Run Button */}
              <motion.button
                whileHover={{ scale: isRunning ? 1 : 1.02 }}
                whileTap={{ scale: isRunning ? 1 : 0.98 }}
                onClick={handleRunUpdate}
                disabled={isRunning}
                className={`w-full btn ${isDryRun ? 'btn-outline' : 'btn-primary'} flex items-center justify-center gap-2`}
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <FiUpload />
                    {isDryRun ? 'Run Dry Run' : 'Apply Updates'}
                  </>
                )}
              </motion.button>
            </div>

            {/* What Will Be Updated */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3 text-sm text-gray-700">What will be updated:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Fix SKU format (uppercase, remove invalid chars)
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Round prices to 2 decimal places
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Fix negative stock quantities
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Generate/fix product slugs
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Add missing SEO fields
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Fix image structure
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Generate short descriptions
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Validate pricing (sale less than base)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <h2 className="text-xl font-bold mb-4">Results Summary</h2>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-blue-700">Total Products</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{stats.updated}</div>
                  <div className="text-sm text-green-700">Updated</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
                  <div className="text-sm text-gray-700">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Changes Applied:</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(stats.changes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-semibold text-primary-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm font-bold text-primary-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="bg-primary-600 h-2 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Logs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FiDownload className="text-primary-600" />
              Execution Logs
            </h2>

            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No logs yet. Click Run Dry Run to start.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
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
