import React from 'react';
import { pdf } from '@react-pdf/renderer';
import InvoiceTemplate from '@/components/pdf/InvoiceTemplate';

/**
 * Generate and download PDF invoice for an order
 */
export async function downloadInvoicePDF(order: any, language: 'en' | 'ur' = 'en') {
  try {
    // Create PDF document
    const doc = <InvoiceTemplate order={order} language={language} />;
    
    // Generate blob
    const blob = await pdf(doc).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order.orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF blob without downloading (for previews or email)
 */
export async function generateInvoicePDFBlob(order: any, language: 'en' | 'ur' = 'en'): Promise<Blob> {
  try {
    const doc = <InvoiceTemplate order={order} language={language} />;
    const blob = await pdf(doc).toBlob();
    return blob;
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw error;
  }
}

/**
 * Open PDF in new tab for preview
 */
export async function previewInvoicePDF(order: any, language: 'en' | 'ur' = 'en') {
  try {
    const blob = await generateInvoicePDFBlob(order, language);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return true;
  } catch (error) {
    console.error('Error previewing PDF:', error);
    throw error;
  }
}

/**
 * Generate multiple PDFs for bulk export
 */
export async function downloadBulkInvoicesPDF(orders: any[], language: 'en' | 'ur' = 'en') {
  try {
    for (const order of orders) {
      await downloadInvoicePDF(order, language);
      // Small delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return true;
  } catch (error) {
    console.error('Error generating bulk PDFs:', error);
    throw error;
  }
}

/**
 * Format order data for export (enhanced)
 */
export function formatOrdersForExport(orders: any[]) {
  return orders.map(order => ({
    order_number: order.orderNumber,
    date: new Date(order.createdAt).toLocaleDateString(),
    customer_name: order.pickupDetails?.customerName || order.user?.name || 'Guest',
    customer_phone: order.pickupDetails?.phone || '',
    items_count: order.items?.length || 0,
    subtotal: order.pricing?.subtotal || 0,
    discount: order.pricing?.discount || 0,
    tax: order.pricing?.tax || 0,
    total: order.pricing?.total || 0,
    payment_method: order.payment?.method || '',
    payment_status: order.payment?.status || '',
    order_status: order.status || '',
    coupon_code: order.coupon?.code || '',
    notes: order.pickupDetails?.notes || '',
  }));
}

/**
 * Generate receipt-style format (thermal printer friendly)
 */
export function generateReceiptText(order: any): string {
  const width = 42; // Standard receipt width
  const line = '='.repeat(width);
  const spacer = '-'.repeat(width);
  
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  const leftRight = (left: string, right: string) => {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };
  
  let receipt = '';
  
  // Header
  receipt += line + '\n';
  receipt += center('INVOICE') + '\n';
  receipt += line + '\n';
  receipt += center(order.orderNumber) + '\n';
  receipt += center(new Date(order.createdAt).toLocaleString()) + '\n';
  receipt += spacer + '\n';
  
  // Customer Info
  receipt += 'Customer: ' + order.pickupDetails.customerName + '\n';
  receipt += 'Phone: ' + order.pickupDetails.phone + '\n';
  if (order.pickupDetails.notes) {
    receipt += 'Notes: ' + order.pickupDetails.notes + '\n';
  }
  receipt += spacer + '\n';
  
  // Items
  receipt += 'ITEMS:\n';
  order.items.forEach((item: any, index: number) => {
    receipt += `${index + 1}. ${item.productSnapshot.name.en}\n`;
    receipt += leftRight(
      `   ${item.quantity} x PKR ${item.price.toLocaleString()}`,
      `PKR ${item.subtotal.toLocaleString()}`
    ) + '\n';
  });
  receipt += spacer + '\n';
  
  // Totals
  receipt += leftRight('Subtotal:', `PKR ${order.pricing.subtotal.toLocaleString()}`) + '\n';
  if (order.pricing.discount > 0) {
    receipt += leftRight('Discount:', `-PKR ${order.pricing.discount.toLocaleString()}`) + '\n';
  }
  if (order.pricing.tax > 0) {
    receipt += leftRight('Tax:', `PKR ${order.pricing.tax.toLocaleString()}`) + '\n';
  }
  receipt += line + '\n';
  receipt += leftRight('TOTAL:', `PKR ${order.pricing.total.toLocaleString()}`) + '\n';
  receipt += line + '\n';
  
  // Payment Info
  receipt += '\nPayment Method: ' + order.payment.method.replace('_', ' ').toUpperCase() + '\n';
  receipt += 'Payment Status: ' + order.payment.status.toUpperCase() + '\n';
  receipt += spacer + '\n';
  
  // Footer
  receipt += center('Thank you for your business!') + '\n';
  receipt += line + '\n';
  
  return receipt;
}
