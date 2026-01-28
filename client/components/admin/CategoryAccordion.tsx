import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  categoryId?: string;
  name: { en: string; ur: string };
  slug: string;
  parentCategory?: any;
  isActive: boolean;
  displayOrder: number;
  image?: any;
  children?: Category[];
  childrenCount?: number;
  depth?: number;
}

interface CategoryAccordionProps {
  category: Category;
  level?: number;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  expandedCategories?: string[];
  onToggleExpand?: (id: string) => void;
}

export default function CategoryAccordion({ 
  category, 
  level = 0,
  onDelete,
  onRestore,
  expandedCategories = [],
  onToggleExpand
}: CategoryAccordionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const hasChildren = category.children && category.children.length > 0;
  
  // Use external expanded state if provided, otherwise use internal state
  const isExpanded = onToggleExpand 
    ? expandedCategories.includes(category._id)
    : internalExpanded;
  
  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(category._id);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Level-based styling
  const getLevelStyles = () => {
    switch (level) {
      case 0:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          border: 'border-l-4 border-blue-500',
          hoverBg: 'hover:from-blue-100 hover:to-blue-200',
          icon: '📁',
          badge: 'bg-blue-100 text-blue-800',
          expandBtn: 'bg-blue-200 hover:bg-blue-300 text-blue-800',
        };
      case 1:
        return {
          bg: 'bg-gradient-to-r from-green-50 to-green-100',
          border: 'border-l-4 border-green-500',
          hoverBg: 'hover:from-green-100 hover:to-green-200',
          icon: '🏷️',
          badge: 'bg-green-100 text-green-800',
          expandBtn: 'bg-green-200 hover:bg-green-300 text-green-800',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-orange-50 to-orange-100',
          border: 'border-l-4 border-orange-500',
          hoverBg: 'hover:from-orange-100 hover:to-orange-200',
          icon: '🎯',
          badge: 'bg-orange-100 text-orange-800',
          expandBtn: 'bg-orange-200 hover:bg-orange-300 text-orange-800',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-l-4 border-gray-400',
          hoverBg: 'hover:bg-gray-100',
          icon: '•',
          badge: 'bg-gray-100 text-gray-800',
          expandBtn: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
        };
    }
  };

  const styles = getLevelStyles();

  const handleEdit = () => {
    router.push(`/admin/categories/${category._id}/edit`);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${category.name.en}"?`)) {
      onDelete?.(category._id);
    }
  };

  const handleRestore = () => {
    if (confirm(`Are you sure you want to restore "${category.name.en}"?`)) {
      onRestore?.(category._id);
    }
  };

  const handleAddSubcategory = () => {
    router.push(`/admin/categories/create?parent=${category._id}`);
  };

  return (
    <div 
      className="mb-2 animate-fade-in transform transition-all duration-300 hover:translate-x-1"
      style={{ animationDelay: `${level * 50}ms` }}
    >
      {/* Main Accordion Item */}
      <div
        className={`
          ${styles.bg} ${styles.border} ${styles.hoverBg}
          rounded-lg shadow-sm transition-all duration-300 ease-out
          ${showActions ? 'shadow-xl sm:scale-[1.02] ring-2 ring-primary-200 ring-opacity-50' : ''}
          hover:shadow-lg group cursor-pointer
        `}
        style={{ marginLeft: level > 0 ? `${level * 12}px` : '0px' }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onTouchStart={() => setShowActions(true)}
      >
        <div className="flex items-center justify-between p-3 sm:p-4">
          {/* Left Section: Expand + Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Button with pulse animation */}
            {hasChildren && (
              <button
                onClick={toggleExpand}
                className={`
                  ${styles.expandBtn}
                  w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-300 transform
                  ${isExpanded ? 'rotate-90 scale-110' : 'rotate-0 scale-100'}
                  shadow-sm hover:shadow-lg hover:scale-125
                  active:scale-95
                  ${hasChildren && !isExpanded ? 'animate-pulse' : ''}
                `}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg 
                  className={`w-4 h-4 transition-all duration-300 ${isExpanded ? 'text-primary-800' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </button>
            )}

            {/* Placeholder for alignment when no children */}
            {!hasChildren && <div className="w-8"></div>}

            {/* Category Image instead of emoji */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg border-2 border-gray-200 group-hover:border-primary-300">
              {category.image?.url ? (
                <img
                  src={category.image.url}
                  alt={category.name.en}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl">${styles.icon}</div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl transition-transform duration-300 group-hover:scale-125">
                  {styles.icon}
                </div>
              )}
            </div>

            {/* Category Info */}
            <div className="flex-1 min-w-0">
              {/* Category Name - English and Urdu on same line */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {category.name.en}
                </h3>
                {category.name.ur && (
                  <span className="text-lg sm:text-xl font-bold text-gray-700 font-urdu" dir="rtl">
                    ({category.name.ur})
                  </span>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-2">
                {/* Level Badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge} font-medium`}>
                  Level {level}
                </span>

                {/* Status Badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    category.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {category.isActive ? '✓ Active' : '✗ Inactive'}
                </span>

                {/* Subcategory Count */}
                {hasChildren && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                    {category.childrenCount || category.children?.length} subcategories
                  </span>
                )}
              </div>

              {/* Category ID and Slug */}
              <div className="flex items-center gap-4">
                {category.categoryId && (
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {category.categoryId}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Slug: {category.slug}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className={`
            flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4 transition-all duration-300
            ${showActions ? 'opacity-100 translate-x-0' : 'opacity-0 sm:opacity-0 translate-x-4'}
            sm:${showActions ? 'opacity-100' : 'opacity-0'}
          `}>
            {category.isActive ? (
              <>
                {/* Add Subcategory with scale animation */}
                {level < 2 && (
                  <button
                    onClick={handleAddSubcategory}
                    className="p-1.5 sm:p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-all duration-200 transform hover:scale-110 active:scale-95 hover:rotate-3 shadow-sm hover:shadow-md"
                    title="Add Subcategory"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}

                {/* Edit with scale animation */}
                <button
                  onClick={handleEdit}
                  className="p-1.5 sm:p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all duration-200 transform hover:scale-110 active:scale-95 hover:-rotate-3 shadow-sm hover:shadow-md"
                  title="Edit Category"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Delete with shake animation */}
                <button
                  onClick={handleDelete}
                  className="p-1.5 sm:p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-all duration-200 transform hover:scale-110 active:scale-95 hover:rotate-6 shadow-sm hover:shadow-md"
                  title="Delete Category"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            ) : (
              /* Restore */
              <button
                onClick={handleRestore}
                className="p-1.5 sm:p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                title="Restore Category"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Expanded Children with smooth animation and backdrop blur */}
        {hasChildren && (
          <div 
            className={`
              border-t border-gray-200 bg-white bg-opacity-50 backdrop-blur-sm overflow-hidden 
              transition-all duration-500 ease-in-out
              ${isExpanded ? 'max-h-[2000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}
            `}
          >
            <div className="p-3 space-y-2">
              {category.children?.map((child) => (
                <CategoryAccordion
                  key={child._id}
                  category={child}
                  level={level + 1}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  expandedCategories={expandedCategories}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
