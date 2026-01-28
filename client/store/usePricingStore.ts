import { create } from 'zustand';
import api from '@/lib/api';

interface Product {
  _id: string;
  name: string;
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

interface Operation {
  _id: string;
  type: 'individual' | 'brand' | 'category' | 'scheduled';
  targetName: string;
  changeType: string;
  changeValue: number;
  direction: string;
  totalProductsAffected: number;
  status: string;
  createdAt: string;
  changedBy: {
    name: string;
    email: string;
  };
  canUndo?: boolean;
  undoTimeRemaining?: number;
}

interface PricingState {
  // Preview data
  previewProducts: Product[];
  previewSummary: PreviewSummary | null;
  previewLoading: boolean;
  
  // Active operations
  activeOperations: Operation[];
  currentOperation: Operation | null;
  
  // Progress tracking
  operationProgress: {
    operationId: string | null;
    processed: number;
    total: number;
    percentage: number;
    currentProduct: string;
    isProcessing: boolean;
  };
  
  // History
  history: Operation[];
  historyLoading: boolean;
  historyPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Statistics
  stats: {
    last24Hours: {
      changes: number;
      productsAffected: number;
      totalImpact: number;
    };
    last7Days: {
      changes: number;
      productsAffected: number;
      totalImpact: number;
    };
    totalOperations: number;
    recentOperations: any[];
  } | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Actions
  previewBrandPriceChange: (brandId: string, changeType: string, value: number, direction: string) => Promise<void>;
  previewCategoryPriceChange: (categoryId: string, changeType: string, value: number, direction: string) => Promise<void>;
  applyBrandPriceChange: (brandId: string, changeType: string, value: number, direction: string) => Promise<string>;
  applyCategoryPriceChange: (categoryId: string, changeType: string, value: number, direction: string) => Promise<string>;
  updateProductPrice: (productId: string, changeType: string, value: number, direction: string) => Promise<void>;
  getOperationStatus: (operationId: string) => Promise<void>;
  undoPriceChange: (operationId: string) => Promise<void>;
  loadHistory: (filters?: any) => Promise<void>;
  loadStats: () => Promise<void>;
  clearPreview: () => void;
  clearOperationProgress: () => void;
  setOperationProgress: (progress: any) => void;
  updateOperationStatus: (operationId: string, status: string) => void;
  addToHistory: (operation: Operation) => void;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  // Initial state
  previewProducts: [],
  previewSummary: null,
  previewLoading: false,
  activeOperations: [],
  currentOperation: null,
  operationProgress: {
    operationId: null,
    processed: 0,
    total: 0,
    percentage: 0,
    currentProduct: '',
    isProcessing: false
  },
  history: [] as Operation[],
  historyLoading: false,
  historyPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  stats: null,
  loading: false,
  error: null,

  // Preview brand price change
  previewBrandPriceChange: async (brandId, changeType, value, direction) => {
    try {
      set({ previewLoading: true, error: null });
      
      const response = await api.post(`/admin/pricing/brand/${brandId}/preview`, {
        changeType,
        value,
        direction
      });

      set({
        previewProducts: response.data?.preview || [],
        previewSummary: response.data?.summary || null,
        previewLoading: false
      });
    } catch (error: any) {
      console.error('Failed to preview brand price change:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to preview price changes',
        previewLoading: false 
      });
      throw error;
    }
  },

  // Preview category price change
  previewCategoryPriceChange: async (categoryId, changeType, value, direction) => {
    try {
      set({ previewLoading: true, error: null });
      
      const response = await api.post(`/admin/pricing/category/${categoryId}/preview`, {
        changeType,
        value,
        direction
      });

      set({
        previewProducts: response.data?.preview || [],
        previewSummary: response.data?.summary || null,
        previewLoading: false
      });
    } catch (error: any) {
      console.error('Failed to preview category price change:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to preview price changes',
        previewLoading: false 
      });
      throw error;
    }
  },

  // Apply brand price change
  applyBrandPriceChange: async (brandId, changeType, value, direction) => {
    try {
      set({ loading: true, error: null });
      
      const response = await api.post(`/admin/pricing/brand/${brandId}/apply`, {
        changeType,
        value,
        direction
      });

      const operationId = response.data?.operationId;
      
      set({
        operationProgress: {
          operationId,
          processed: 0,
          total: response.data?.totalProducts || 0,
          percentage: 0,
          currentProduct: '',
          isProcessing: true
        },
        loading: false
      });

      return operationId;
    } catch (error: any) {
      console.error('Failed to apply brand price change:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to apply price changes',
        loading: false 
      });
      throw error;
    }
  },

  // Apply category price change
  applyCategoryPriceChange: async (categoryId, changeType, value, direction) => {
    try {
      set({ loading: true, error: null });
      
      const response = await api.post(`/admin/pricing/category/${categoryId}/apply`, {
        changeType,
        value,
        direction
      });

      const operationId = response.data?.operationId;
      
      set({
        operationProgress: {
          operationId,
          processed: 0,
          total: response.data?.totalProducts || 0,
          percentage: 0,
          currentProduct: '',
          isProcessing: true
        },
        loading: false
      });

      return operationId;
    } catch (error: any) {
      console.error('Failed to apply category price change:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to apply price changes',
        loading: false 
      });
      throw error;
    }
  },

  // Update individual product price
  updateProductPrice: async (productId, changeType, value, direction) => {
    try {
      set({ loading: true, error: null });
      
      await api.put(`/admin/pricing/product/${productId}`, {
        changeType,
        value,
        direction
      });

      set({ loading: false });
    } catch (error: any) {
      console.error('Failed to update product price:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to update product price',
        loading: false 
      });
      throw error;
    }
  },

  // Get operation status
  getOperationStatus: async (operationId) => {
    try {
      const response = await api.get(`/admin/pricing/operation/${operationId}`);
      
      set({ 
        currentOperation: response.data?.operation 
      });
    } catch (error: any) {
      console.error('Failed to get operation status:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to get operation status'
      });
    }
  },

  // Undo price change
  undoPriceChange: async (operationId) => {
    try {
      set({ loading: true, error: null });
      
      await api.post(`/admin/pricing/operation/${operationId}/undo`);
      
      // Update operation status in current operation
      set(state => ({
        currentOperation: state.currentOperation?._id === operationId
          ? { ...state.currentOperation, status: 'undone', canUndo: false }
          : state.currentOperation,
        // Update the history item as well
        history: state.history.map(item => 
          item._id === operationId 
            ? { ...item, status: 'undone', canUndo: false, undoTimeRemaining: 0 }
            : item
        ),
        loading: false
      }));
    } catch (error: any) {
      console.error('Failed to undo price change:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to undo price change',
        loading: false 
      });
      throw error;
    }
  },

  // Load history
  loadHistory: async (filters = {}) => {
    try {
      set({ historyLoading: true, error: null });
      
      const response = await api.get('/admin/pricing/history', { params: filters });
      const data = (response && (response.data || response)) as any;
      const history = data?.data?.history ?? data?.history ?? [];
      const pagination = data?.data?.pagination ?? data?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 };
      
      set({
        history,
        historyPagination: pagination,
        historyLoading: false
      });
    } catch (error: any) {
      console.error('Failed to load price change history:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to load history',
        historyLoading: false 
      });
    }
  },

  // Load statistics
  loadStats: async () => {
    try {
      const response = await api.get('/admin/pricing/stats');
      
      set({ stats: response.data || response });
    } catch (error: any) {
      console.error('Failed to load pricing stats:', error);
      set({ 
        error: error.response?.data?.error?.message || 'Failed to load statistics'
      });
    }
  },

  // Clear preview
  clearPreview: () => {
    set({
      previewProducts: [],
      previewSummary: null,
      error: null
    });
  },

  // Clear operation progress
  clearOperationProgress: () => {
    set({
      operationProgress: {
        operationId: null,
        processed: 0,
        total: 0,
        percentage: 0,
        currentProduct: '',
        isProcessing: false
      }
    });
  },

  // Set operation progress (called by WebSocket)
  setOperationProgress: (progress) => {
    set({
      operationProgress: {
        ...get().operationProgress,
        ...progress,
        isProcessing: true
      }
    });
  },

  // Update operation status
  updateOperationStatus: (operationId, status) => {
    set(state => ({
      currentOperation: state.currentOperation?._id === operationId
        ? { ...state.currentOperation, status }
        : state.currentOperation,
      operationProgress: state.operationProgress.operationId === operationId && status === 'completed'
        ? { ...state.operationProgress, isProcessing: false }
        : state.operationProgress
    }));
  },

  // Add to history
  addToHistory: (operation) => {
    set(state => ({
      history: [operation, ...state.history].slice(0, 20) // Keep last 20
    }));
  }
}));
