import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if using token-based auth
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (data.data.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const productsAPI = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/id/${id}`),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  getRelated: (id: string) => api.get(`/products/${id}/related`),
};

export const categoriesAPI = {
  getAll: (params?: any) => api.get('/categories', { params }),
  getTree: () => api.get('/categories/tree'),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
  getById: (id: string) => api.get(`/admin/categories/${id}`),
  getSubcategories: (parentId: string) => api.get(`/categories`, { params: { parent: parentId, isActive: true } }),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const ordersAPI = {
  create: (data: any) => api.post('/orders', data),
  getMyOrders: (params?: any) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  cancel: (id: string, data?: any) => api.put(`/orders/${id}/cancel`, data),
};

export const reviewsAPI = {
  getProductReviews: (productId: string, params?: any) => 
    api.get(`/reviews/products/${productId}`, { params }),
  create: (productId: string, data: any) => 
    api.post(`/reviews/products/${productId}`, data),
  update: (id: string, data: any) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (data: any) => api.post('/cart/items', data),
  updateItem: (productId: string, data: any) => 
    api.put(`/cart/items/${productId}`, data),
  removeItem: (productId: string) => api.delete(`/cart/items/${productId}`),
  clear: () => api.delete('/cart'),
};

export const couponsAPI = {
  validate: (data: any) => api.post('/coupons/validate', data),
  getAll: (params?: any) => api.get('/coupons', { params }),
  getById: (id: string) => api.get(`/coupons/${id}`),
  create: (data: any) => api.post('/coupons', data),
  update: (id: string, data: any) => api.put(`/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/coupons/${id}`),
  getStats: () => api.get('/coupons/stats'),
};

// Brands API
export const brandsAPI = {
  getAll: (params?: any) => api.get('/admin/brands', { params }),
  getById: (id: string) => api.get(`/admin/brands/${id}`),
  create: (data: any) => api.post('/admin/brands', data),
  update: (id: string, data: any) => api.put(`/admin/brands/${id}`, data),
  delete: (id: string) => api.delete(`/admin/brands/${id}`),
  getStats: () => api.get('/admin/brands/stats'),
  syncCounts: () => api.post('/admin/brands/sync-counts'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Products
  getAllProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string) => api.get(`/products/id/${id}`),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  bulkUpdateProducts: (data: any) => api.put('/products/bulk/update', data),
  bulkDeleteProducts: (data: any) => api.delete('/products/bulk/delete', { data }),
  checkSku: (sku: string, excludeId?: string) => api.get(`/products/check-sku/${sku}`, { params: { excludeId } }),
  suggestSku: (data: any) => api.post('/products/suggest-sku', data),
  
  // Categories
  createCategory: (data: any) => api.post('/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
  bulkReorderCategories: (data: any) => api.put('/categories/bulk/reorder', data),
  
  // Brands
  getAllBrands: (params?: any) => api.get('/admin/brands', { params }),
  getBrand: (id: string) => api.get(`/admin/brands/${id}`),
  createBrand: (data: any) => api.post('/admin/brands', data),
  updateBrand: (id: string, data: any) => api.put(`/admin/brands/${id}`, data),
  deleteBrand: (id: string) => api.delete(`/admin/brands/${id}`),
  getBrandStats: () => api.get('/admin/brands/stats'),
  syncBrandCounts: () => api.post('/admin/brands/sync-counts'),
  
  // Orders
  getAllOrders: (params?: any) => api.get('/admin/orders', { params }),
  getOrder: (id: string) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id: string, data: any) => 
    api.put(`/admin/orders/${id}/status`, data),
  exportOrders: (params?: any) => 
    api.get('/admin/orders/export', { params, responseType: 'blob' }),
  
  // Reviews
  getReviews: (params?: any) => api.get('/admin/reviews', { params }),
  moderateReview: (id: string, approved: boolean) => 
    api.put(`/admin/reviews/${id}/approve`, { approved }),
  deleteReview: (id: string) => api.delete(`/reviews/${id}`),
  
  // Coupons
  getAllCoupons: (params?: any) => api.get('/coupons', { params }),
  getCoupon: (id: string) => api.get(`/coupons/${id}`),
  createCoupon: (data: any) => api.post('/coupons', data),
  updateCoupon: (id: string, data: any) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/coupons/${id}`),
  getCouponStats: () => api.get('/coupons/stats'),
  
  // Inventory
  getLowStock: () => api.get('/admin/inventory/low-stock'),
  updateInventory: (productId: string, data: any) => 
    api.put(`/admin/inventory/${productId}`, data),
  bulkUpdateInventory: (data: any) => api.post('/admin/inventory/bulk-update', data),
  getInventoryHistory: (productId: string, params?: any) => 
    api.get(`/admin/inventory/${productId}/history`, { params }),
  getInventoryReports: (params?: any) => 
    api.get('/admin/inventory/reports', { params }),
  exportInventory: (params?: any) => 
    api.get('/admin/inventory/export', { params, responseType: 'blob' }),
  exportInventoryCSV: () => 
    api.get('/admin/inventory/export/csv', { responseType: 'blob' }),
  getInventoryTemplate: () => 
    api.get('/admin/inventory/template', { responseType: 'blob' }),
  importInventoryCSV: (data: any) => 
    api.post('/admin/inventory/import/csv', data),
  triggerLowStockAlert: () => 
    api.post('/admin/inventory/alerts/trigger'),
  
  // Users
  getAllUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetails: (id: string) => api.get(`/admin/users/${id}`),
  toggleUserStatus: (id: string, data: any) => api.put(`/admin/users/${id}/status`, data),
};

// Review API
export const reviewAPI = {
  // Get product reviews (public)
  getProductReviews: (productId: string, params?: any) => 
    api.get(`/reviews/products/${productId}`, { params }),
  
  // Create review (protected)
  createReview: (productId: string, data: any) => 
    api.post(`/reviews/products/${productId}`, data),
  
  // Update review (protected)
  updateReview: (reviewId: string, data: any) => 
    api.put(`/reviews/${reviewId}`, data),
  
  // Delete review (protected)
  deleteReview: (reviewId: string) => 
    api.delete(`/reviews/${reviewId}`),
  
  // Get user's reviews
  getUserReviews: (params?: any) => 
    api.get('/reviews/my-reviews', { params }),
};

// Wishlist API
export const wishlistAPI = {
  // Get user's wishlist
  getWishlist: () => api.get('/wishlist'),
  
  // Add product to wishlist
  addToWishlist: (productId: string) => api.post(`/wishlist/${productId}`),
  
  // Remove product from wishlist
  removeFromWishlist: (productId: string) => api.delete(`/wishlist/${productId}`),
  
  // Clear entire wishlist
  clearWishlist: () => api.delete('/wishlist'),
  
  // Check if product is in wishlist
  checkWishlist: (productId: string) => api.get(`/wishlist/check/${productId}`),
  
  // Move wishlist items to cart
  moveToCart: (productIds: string[]) => api.post('/wishlist/move-to-cart', { productIds }),
};
