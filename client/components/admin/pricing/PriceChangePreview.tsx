import { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';

interface Product {
  productId: string;
  productName: string | { en: string; ur: string };
  sku: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercentage: number;
  valid: boolean;
  errors?: string[];
}

interface PreviewSummary {
  totalProducts: number;
  validChanges: number;
  invalidChanges: number;
  totalImpact: number;
  averageChange: number;
  maxChange: number;
  minChange: number;
}

interface PriceChangePreviewProps {
  products: Product[];
  summary: PreviewSummary | null;
  targetName: string;
  onApply: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const PriceChangePreview: React.FC<PriceChangePreviewProps> = ({
  products,
  summary,
  targetName,
  onApply,
  onCancel,
  loading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = products.slice(startIndex, endIndex);

  const hasInvalidChanges = summary && summary.invalidChanges > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">🔍 Preview Price Changes</h3>
            <p className="text-blue-100">{targetName}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <FiX className="text-2xl" />
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Valid Changes</p>
              <p className="text-2xl font-bold text-green-600">{summary.validChanges}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Invalid Changes</p>
              <p className="text-2xl font-bold text-red-600">{summary.invalidChanges}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Impact</p>
              <p className={`text-2xl font-bold ${summary.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(summary.totalImpact).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning for invalid changes */}
      {hasInvalidChanges && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">
                {summary!.invalidChanges} products have validation errors
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                These products will be skipped during the update.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Old Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                New Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Change
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProducts.map((product, index) => {
              const productName = typeof product.productName === 'string' 
                ? product.productName 
                : product.productName?.en || product.productName?.ur || 'N/A';
              return (
                <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{productName}</div>
                    <div className="text-xs text-gray-500">{product.sku}</div>
                    {product.errors && product.errors.length > 0 && (
                      <div className="mt-1 text-xs text-red-600">
                        {product.errors[0]}
                      </div>
                    )}
                  </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  ${product.oldPrice.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-medium ${
                    product.newPrice > product.oldPrice ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${product.newPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm text-gray-900">
                    {product.changeAmount >= 0 ? '+' : ''}${product.changeAmount.toFixed(2)}
                  </div>
                  <div className={`text-xs ${
                    product.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.changePercentage >= 0 ? '+' : ''}{product.changePercentage.toFixed(1)}%
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {product.valid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      <FiCheckCircle />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      <FiAlertCircle />
                      Invalid
                    </span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, products.length)} of {products.length} products
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={loading || summary?.validChanges === 0}
          className={`
            px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
            ${loading || summary?.validChanges === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              ✅ Apply Changes to {summary?.validChanges || 0} Products
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PriceChangePreview;
