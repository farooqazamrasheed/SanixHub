import { useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent } from 'react-icons/fi';

interface BulkPriceFormProps {
  onPreview: (changeType: string, value: number, direction: string) => void;
  loading?: boolean;
}

const BulkPriceForm: React.FC<BulkPriceFormProps> = ({ onPreview, loading = false }) => {
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [changeType, setChangeType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<string>('');

  const handlePreview = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      alert('Please enter a valid positive number');
      return;
    }

    // Validate percentage limits
    if (changeType === 'percentage') {
      if (direction === 'increase' && numValue > 40) {
        alert('Maximum increase is 40%');
        return;
      }
      if (direction === 'decrease' && numValue > 90) {
        alert('Maximum decrease is 90%');
        return;
      }
    }

    onPreview(changeType, numValue, direction);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Configure Price Change</h3>

      {/* Direction Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Change Direction
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setDirection('increase')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              ${direction === 'increase'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
            `}
          >
            <FiTrendingUp className="text-xl" />
            <span className="font-medium">Increase</span>
          </button>

          <button
            type="button"
            onClick={() => setDirection('decrease')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              ${direction === 'decrease'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
            `}
          >
            <FiTrendingDown className="text-xl" />
            <span className="font-medium">Decrease</span>
          </button>
        </div>
      </div>

      {/* Change Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Change Method
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setChangeType('percentage')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              ${changeType === 'percentage'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
            `}
          >
            <FiPercent className="text-xl" />
            <span className="font-medium">Percentage</span>
          </button>

          <button
            type="button"
            onClick={() => setChangeType('fixed')}
            className={`
              flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              ${changeType === 'fixed'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }
            `}
          >
            <FiDollarSign className="text-xl" />
            <span className="font-medium">Fixed Amount</span>
          </button>
        </div>
      </div>

      {/* Value Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {changeType === 'percentage' ? 'Percentage' : 'Amount (USD)'}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
            {changeType === 'percentage' ? '%' : '$'}
          </span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={changeType === 'percentage' ? '20' : '10.00'}
            step={changeType === 'percentage' ? '1' : '0.01'}
            min="0"
            max={changeType === 'percentage' ? (direction === 'increase' ? '40' : '90') : undefined}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>
        {changeType === 'percentage' && (
          <p className="mt-2 text-xs text-gray-500">
            {direction === 'increase' 
              ? 'Maximum 40% increase allowed'
              : 'Maximum 90% decrease allowed'
            }
          </p>
        )}
      </div>

      {/* Preview Summary */}
      {value && parseFloat(value) > 0 && (
        <div className={`
          p-4 rounded-lg mb-6
          ${direction === 'increase' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
        `}>
          <p className={`text-sm font-medium ${direction === 'increase' ? 'text-green-800' : 'text-red-800'}`}>
            Example: $100.00 → ${
              changeType === 'percentage'
                ? direction === 'increase'
                  ? (100 * (1 + parseFloat(value) / 100)).toFixed(2)
                  : (100 * (1 - parseFloat(value) / 100)).toFixed(2)
                : direction === 'increase'
                  ? (100 + parseFloat(value)).toFixed(2)
                  : (100 - parseFloat(value)).toFixed(2)
            }
          </p>
        </div>
      )}

      {/* Preview Button */}
      <button
        onClick={handlePreview}
        disabled={!value || parseFloat(value) <= 0 || loading}
        className={`
          w-full py-3 px-6 rounded-lg font-medium transition-colors
          ${!value || parseFloat(value) <= 0 || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading Preview...
          </span>
        ) : (
          '🔍 Preview Changes'
        )}
      </button>
    </div>
  );
};

export default BulkPriceForm;
