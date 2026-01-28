import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  FiHome, FiPackage, FiTag, FiAward, FiShoppingCart, 
  FiUsers, FiStar, FiGift, FiArchive, FiHeart,
  FiBarChart2, FiSettings, FiChevronDown, FiChevronRight, FiDollarSign
} from 'react-icons/fi';
import AdminNotificationBadge from '@/components/AdminNotificationBadge';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Initialize with default values for SSR
  const [expandedSections, setExpandedSections] = useState<string[]>(['main', 'catalog', 'sales', 'customers', 'system']);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage only after mounting on client
  useEffect(() => {
    setIsClient(true);
    const savedSections = localStorage.getItem('admin-expanded-sections');
    const savedItems = localStorage.getItem('admin-expanded-items');
    
    if (savedSections) {
      setExpandedSections(JSON.parse(savedSections));
    }
    if (savedItems) {
      setExpandedItems(JSON.parse(savedItems));
    }
  }, []);

  // Save expanded sections to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('admin-expanded-sections', JSON.stringify(expandedSections));
    }
  }, [expandedSections, isClient]);

  // Save expanded items to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('admin-expanded-items', JSON.stringify(expandedItems));
    }
  }, [expandedItems, isClient]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleItem = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(i => i !== itemName)
        : [...prev, itemName]
    );
  };

  const navigationSections = [
    {
      title: 'Main',
      key: 'main',
      items: [
        {
          name: 'Dashboard',
          href: '/admin',
          icon: FiHome,
          badge: null,
          subItems: null,
        },
        {
          name: 'Analytics',
          href: '/admin/analytics',
          icon: FiBarChart2,
          badge: null,
          subItems: null,
        },
      ],
    },
    {
      title: 'Catalog',
      key: 'catalog',
      items: [
        {
          name: 'Products',
          href: '/admin/products',
          icon: FiPackage,
          badge: null,
          subItems: [
            {
              name: 'All Products',
              href: '/admin/products',
              icon: null,
            },
            {
              name: 'Add Product',
              href: '/admin/products/create',
              icon: null,
            },
          ],
        },
        {
          name: 'Categories',
          href: '/admin/categories',
          icon: FiTag,
          badge: null,
          subItems: [
            {
              name: 'All Categories',
              href: '/admin/categories',
              icon: null,
            },
            {
              name: 'Add Category',
              href: '/admin/categories/create',
              icon: null,
            },
          ],
        },
        {
          name: 'Brands',
          href: '/admin/brands',
          icon: FiAward,
          badge: null,
          subItems: [
            {
              name: 'All Brands',
              href: '/admin/brands',
              icon: null,
            },
          ],
        },
        {
          name: 'Inventory',
          href: '/admin/inventory',
          icon: FiArchive,
          badge: { text: 'Stock', color: 'bg-orange-500' },
          subItems: null,
        },
        {
          name: 'Bulk Pricing',
          href: '/admin/pricing',
          icon: FiDollarSign,
          badge: null,
          subItems: [
            {
              name: 'Dashboard',
              href: '/admin/pricing',
              icon: null,
            },
            {
              name: 'Individual',
              href: '/admin/pricing/individual',
              icon: null,
            },
            {
              name: 'By Brand',
              href: '/admin/pricing/by-brand',
              icon: null,
            },
            {
              name: 'By Category',
              href: '/admin/pricing/by-category',
              icon: null,
            },
            {
              name: 'History',
              href: '/admin/pricing/history',
              icon: null,
            },
          ],
        },
      ],
    },
    {
      title: 'Sales',
      key: 'sales',
      items: [
        {
          name: 'Orders',
          href: '/admin/orders',
          icon: FiShoppingCart,
          badge: null,
          subItems: null,
        },
        {
          name: 'Coupons',
          href: '/admin/coupons',
          icon: FiGift,
          badge: null,
          subItems: null,
        },
      ],
    },
    {
      title: 'Customers',
      key: 'customers',
      items: [
        {
          name: 'Users',
          href: '/admin/users',
          icon: FiUsers,
          badge: null,
          subItems: null,
        },
        {
          name: 'Reviews',
          href: '/admin/reviews',
          icon: FiStar,
          badge: null,
          subItems: null,
        },
        {
          name: 'Wishlists',
          href: '/admin/wishlists',
          icon: FiHeart,
          badge: null,
          subItems: null,
        },
      ],
    },
    {
      title: 'System',
      key: 'system',
      items: [
        {
          name: 'Settings',
          href: '/admin/settings',
          icon: FiSettings,
          badge: null,
          subItems: [
            {
              name: 'Store Settings',
              href: '/admin/settings?tab=store',
              icon: null,
            },
            {
              name: 'Payment Settings',
              href: '/admin/settings?tab=payment',
              icon: null,
            },
            {
              name: 'Shipping Settings',
              href: '/admin/settings?tab=shipping',
              icon: null,
            },
            {
              name: 'Invoice Settings',
              href: '/admin/settings?tab=invoice',
              icon: null,
            },
            {
              name: 'Email Settings',
              href: '/admin/settings?tab=email',
              icon: null,
            },
          ],
        },
      ],
    },
  ];

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-secondary-900 text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="flex items-center justify-between h-14 px-4 bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 shadow-xl flex-shrink-0 border-b border-primary-500/30">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <span className="text-primary-600 font-bold text-base">S</span>
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight group-hover:text-gray-100 transition-colors duration-200">
                SanixHub
              </div>
              <div className="text-primary-200 text-[10px] leading-tight font-medium">Admin Panel</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200 hover:bg-white/10 p-1.5 rounded-md transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 mt-4 px-3 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-secondary-700 scrollbar-track-secondary-900 hover:scrollbar-thumb-secondary-600">
          {navigationSections.map((section) => (
            <div key={section.key} className="mb-4">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-md border ${
                  expandedSections.includes(section.key)
                    ? 'text-primary-400 bg-secondary-800/70 border-primary-500/30 shadow-sm'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-secondary-800/50 border-transparent hover:border-secondary-700/50'
                }`}
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.key) ? (
                  <FiChevronDown className="w-3.5 h-3.5 transition-transform duration-200 text-primary-400" />
                ) : (
                  <FiChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                )}
              </button>

              {/* Section Items */}
              {expandedSections.includes(section.key) && (
                <div className="mt-1 space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedItems.includes(item.name);
                    
                    return (
                      <div key={item.name}>
                        {/* Main Item */}
                        {hasSubItems ? (
                          <button
                            onClick={() => toggleItem(item.name)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
                              active
                                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-900/30'
                                : 'text-gray-300 hover:bg-secondary-800/70 hover:text-white hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 transition-transform duration-200 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-400 group-hover:scale-110'}`} />
                              <span className="font-medium text-sm">{item.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {item.badge && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full ${item.badge.color} shadow-sm`}>
                                  {item.badge.text}
                                </span>
                              )}
                              {isExpanded ? (
                                <FiChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
                              ) : (
                                <FiChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                              )}
                            </div>
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
                              active
                                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-900/30 scale-[1.02]'
                                : 'text-gray-300 hover:bg-secondary-800/70 hover:text-white hover:shadow-sm hover:translate-x-0.5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 transition-transform duration-200 ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary-400 group-hover:scale-110'}`} />
                              <span className="font-medium text-sm">{item.name}</span>
                            </div>
                            
                            {item.badge && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full ${item.badge.color} shadow-sm`}>
                                {item.badge.text}
                              </span>
                            )}
                          </Link>
                        )}

                        {/* Sub Items */}
                        {hasSubItems && isExpanded && (
                          <div className="mt-1 ml-7 space-y-0.5 animate-fadeIn">
                            {item.subItems.map((subItem, index) => {
                              const subActive = router.pathname === subItem.href || router.asPath === subItem.href;
                              
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  style={{ animationDelay: `${index * 30}ms` }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-200 animate-slideIn group ${
                                    subActive
                                      ? 'bg-primary-600/40 text-white font-semibold border-l-2 border-primary-400 shadow-sm'
                                      : 'text-gray-400 hover:bg-secondary-800/50 hover:text-gray-200 hover:border-l-2 hover:border-primary-500/50 hover:translate-x-1'
                                  }`}
                                >
                                  <span className={`w-1 h-1 rounded-full transition-all duration-200 ${
                                    subActive ? 'bg-primary-300' : 'bg-gray-600 group-hover:bg-primary-500 group-hover:scale-150'
                                  }`}></span>
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-secondary-800 bg-gradient-to-b from-secondary-900 to-secondary-950">
          <div className="bg-secondary-800/60 backdrop-blur-sm rounded-lg p-2.5 shadow-lg border border-secondary-700/50">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-md ring-2 ring-primary-500/20">
                  <span className="text-white font-bold text-sm">
                    {user?.profile.firstName?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-secondary-800 rounded-full shadow-sm animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.profile.firstName} {user?.profile.lastName}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Breadcrumb/Page Title */}
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-900">
                  {router.pathname === '/admin' && 'Dashboard'}
                  {router.pathname.includes('/products') && 'Products'}
                  {router.pathname.includes('/categories') && 'Categories'}
                  {router.pathname.includes('/brands') && 'Brands'}
                  {router.pathname.includes('/pricing') && 'Bulk Pricing'}
                  {router.pathname.includes('/orders') && 'Orders'}
                  {router.pathname.includes('/users') && 'Users'}
                  {router.pathname.includes('/reviews') && 'Reviews'}
                  {router.pathname.includes('/coupons') && 'Coupons'}
                  {router.pathname.includes('/inventory') && 'Inventory'}
                  {router.pathname.includes('/wishlists') && 'Wishlists'}
                  {router.pathname.includes('/analytics') && 'Analytics'}
                  {router.pathname.includes('/settings') && 'Settings'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Real-Time Notifications */}
              <AdminNotificationBadge />

              {/* Quick Actions */}
              <Link 
                href="/admin/products/create"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Product
              </Link>

              {/* View Website */}
              <Link 
                href="/" 
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="hidden sm:inline">Website</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
