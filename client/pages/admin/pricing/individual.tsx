import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiDollarSign, FiPercent, FiSearch, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';
import AdminLayout from '@/components/admin/AdminLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

interface Product {
  _id: string;
  name: string | { en: string; ur: string };
  sku?: string;
  price: number;
}

type Direction = 'increase' | 'decrease' | 'set';
type ChangeType = 'fixed' | 'percentage' | 'override';

const PAGE_SIZE = 20;

function IndividualPricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const [direction, setDirection] = useState<Direction>('decrease');
  const [changeType, setChangeType] = useState<ChangeType>('percentage');
  const [value, setValue] = useState<string>('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadProducts(page, debounced).catch(() => undefined);
  }, [page, debounced]);

  async function loadProducts(p = 1, q = '') {
    try {
      setLoading(true);
      const res = await api.get('/products', { params: { page: p, limit: PAGE_SIZE, search: q } });
      // Response structure: { success, data: { products, pagination } }
      setProducts(res.data?.products || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (e: any) {
      console.error('Failed to load products', e);
      toast.error(e?.response?.data?.error?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function exampleAfter(price = 100) {
    const n = parseFloat(value || '0');
    if (!n || n <= 0) return price.toFixed(2);
    if (changeType === 'percentage') {
      const f = direction === 'increase' ? 1 + n / 100 : 1 - n / 100;
      return (Math.max(0.01, price * f)).toFixed(2);
    }
    if (changeType === 'fixed') {
      const d = direction === 'increase' ? price + n : price - n;
      return Math.max(0.01, d).toFixed(2);
    }
    return Math.max(0.01, n).toFixed(2);
  }

  async function updateOne(productId: string, oldPrice: number) {
    const n = parseFloat(value || '0');
    if (!n || n <= 0) {
      toast.error('Enter a valid value');
      return;
    }
    if (changeType === 'percentage') {
      if (direction === 'increase' && n > 40) return toast.error('Maximum increase is 40%');
      if (direction === 'decrease' && n > 90) return toast.error('Maximum decrease is 90%');
    }
    try {
      setWorkingId(productId);
      const body: any = { changeType, value: n, direction };
      await api.put(`/admin/pricing/product/${productId}`, body);
      // Optimistic UI: compute new price locally
      let newPrice = oldPrice;
      if (changeType === 'percentage') newPrice = direction === 'increase' ? oldPrice * (1 + n / 100) : oldPrice * (1 - n / 100);
      else if (changeType === 'fixed') newPrice = direction === 'increase' ? oldPrice + n : oldPrice - n;
      else newPrice = n;
      newPrice = Math.max(0.01, Math.round(newPrice * 100) / 100);
      setProducts(prev => prev.map(p => (p._id === productId ? { ...p, price: newPrice } : p)));
      toast.success('Price updated');
    } catch (e: any) {
      console.error('Failed to update product price', e);
      toast.error(e?.response?.data?.error?.message || 'Failed to update price');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <button onClick={() => router.push('/admin/pricing')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
            <FiArrowLeft />
            <span>Back to Pricing Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🛠️ Individual Product Pricing</h1>
          <p className="text-gray-600">Quickly adjust prices for individual products using fixed amounts or percentages.</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Search Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Direction Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button" 
                  onClick={() => setDirection('increase')} 
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    direction === 'increase' 
                      ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <FiTrendingUp className="text-base" /> Increase
                  </span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setDirection('decrease')} 
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    direction === 'decrease' 
                      ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <FiTrendingDown className="text-base" /> Decrease
                  </span>
                </button>
              </div>
            </div>

            {/* Method Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button" 
                  onClick={() => setChangeType('percentage')} 
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    changeType === 'percentage' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <FiPercent className="text-base" /> %
                  </span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setChangeType('fixed')} 
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    changeType === 'fixed' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <FiDollarSign className="text-base" /> Fixed
                  </span>
                </button>
              </div>
            </div>

            {/* Value Input Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {changeType === 'percentage' ? 'Percentage' : 'Amount ($)'}
              </label>
              <input 
                type="number" 
                min={0} 
                step={changeType === 'percentage' ? 1 : 0.01} 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                placeholder={changeType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'} 
              />
              {mounted && !!value && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Example: $100.00 → ${exampleAfter(100)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No products found</td></tr>
                ) : (
                  products.map((p) => {
                    const productName = typeof p.name === 'string' ? p.name : p.name?.en || p.name?.ur || 'N/A';
                    return (
                      <tr key={p._id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{productName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{p.sku || '-'}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">${p.price?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            disabled={workingId === p._id}
                            onClick={() => updateOne(p._id, p.price)}
                            className={`px-4 py-2 rounded-lg text-white ${workingId === p._id ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
                          >
                            {workingId === p._id ? 'Updating...' : 'Apply'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">Page {page} of {totalPages} ({total} total)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default IndividualPricing;
