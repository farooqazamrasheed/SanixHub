import { useEffect } from 'react';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';

interface ProgressTrackerProps {
  operationId: string | null;
  processed: number;
  total: number;
  percentage: number;
  currentProduct: string;
  isProcessing: boolean;
  onComplete?: () => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  operationId,
  processed,
  total,
  percentage,
  currentProduct,
  isProcessing,
  onComplete
}) => {
  useEffect(() => {
    if (!isProcessing && processed === total && total > 0 && onComplete) {
      // Small delay before calling onComplete
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, processed, total, onComplete]);

  if (!operationId && !isProcessing) {
    return null;
  }

  const isComplete = !isProcessing && processed === total && total > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className={`p-6 ${isComplete ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
          <div className="flex items-center gap-3">
            {isComplete ? (
              <FiCheckCircle className="text-3xl" />
            ) : (
              <FiLoader className="text-3xl animate-spin" />
            )}
            <div>
              <h3 className="text-xl font-semibold">
                {isComplete ? 'Update Complete!' : 'Updating Prices...'}
              </h3>
              <p className="text-sm opacity-90 mt-1">
                {isComplete 
                  ? `Successfully updated ${processed} products`
                  : `Processing ${processed} of ${total} products`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-medium text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isComplete 
                    ? 'bg-green-500' 
                    : 'bg-blue-500 animate-pulse'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Current Product */}
          {!isComplete && currentProduct && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Currently updating:</p>
              <p className="text-sm text-blue-900 truncate">{currentProduct}</p>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <FiCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    All prices updated successfully!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    You can undo this change within 15 minutes if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{processed}</p>
              <p className="text-xs text-gray-600 mt-1">Processed</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{total - processed}</p>
              <p className="text-xs text-gray-600 mt-1">Remaining</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-600 mt-1">Total</p>
            </div>
          </div>

          {/* Estimated Time */}
          {!isComplete && processed > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Estimated time: ~{Math.ceil((total - processed) * 0.5)} seconds
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isComplete && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Please don't close this window while updating...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
