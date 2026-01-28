/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(flattenObject(data[0]));
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const flatRow = flattenObject(row);
      return headers.map(header => {
        const value = flatRow[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    })
  ].join('\n');

  // Create and download file
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Flatten nested object for CSV export
 */
function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join('; ');
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Format products for export
 */
export function formatProductsForExport(products: any[]) {
  return products.map(product => ({
    id: product._id,
    name_en: product.name?.en || '',
    name_ur: product.name?.ur || '',
    sku: product.sku,
    slug: product.slug,
    category: product.category?.name?.en || '',
    base_price: product.pricing?.basePrice || 0,
    sale_price: product.pricing?.salePrice || 0,
    stock: product.inventory?.stockQuantity || 0,
    status: product.isActive ? 'Active' : 'Inactive',
    featured: product.isFeatured ? 'Yes' : 'No',
    is_new: product.isNew ? 'Yes' : 'No',
    created_at: new Date(product.createdAt).toLocaleDateString(),
  }));
}

/**
 * Format categories for export
 */
export function formatCategoriesForExport(categories: any[]) {
  return categories.map(category => ({
    id: category._id,
    name_en: category.name?.en || '',
    name_ur: category.name?.ur || '',
    slug: category.slug,
    parent: category.parentCategory?.name?.en || 'Root',
    display_order: category.displayOrder || 0,
    status: category.isActive ? 'Active' : 'Inactive',
    created_at: new Date(category.createdAt).toLocaleDateString(),
  }));
}
