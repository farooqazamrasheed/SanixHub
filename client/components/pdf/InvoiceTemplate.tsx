import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import brandingConfig from '@/config/branding';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: brandingConfig.branding.textColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottom: `2 solid ${brandingConfig.branding.primaryColor}`,
  },
  logo: {
    width: 80,
    height: 80,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: brandingConfig.branding.primaryColor,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: brandingConfig.branding.primaryColor,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: brandingConfig.branding.secondaryColor,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    width: '40%',
  },
  value: {
    width: '60%',
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: brandingConfig.branding.primaryColor,
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    padding: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 8,
  },
  col1: { width: '5%' },
  col2: { width: '30%' },
  col3: { width: '15%' },
  col4: { width: '12%', textAlign: 'center' },
  col5: { width: '13%', textAlign: 'right' },
  col6: { width: '10%', textAlign: 'right' },
  col7: { width: '15%', textAlign: 'right', fontWeight: 'bold' },
  totalSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: '50%',
  },
  totalLabel: {
    width: '60%',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '40%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTop: `2 solid ${brandingConfig.branding.primaryColor}`,
    width: '50%',
  },
  grandTotalLabel: {
    width: '60%',
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    width: '40%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: brandingConfig.branding.primaryColor,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: `1 solid #e5e7eb`,
    paddingTop: 10,
  },
  qrCode: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
  statusBadge: {
    padding: '4 8',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusConfirmed: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  statusReady: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  bankDetails: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  terms: {
    marginTop: 20,
    fontSize: 8,
    color: '#6b7280',
  },
  termItem: {
    marginBottom: 2,
  },
});

interface InvoiceTemplateProps {
  order: any;
  language?: 'en' | 'ur';
  includeQR?: boolean;
  includeBarcode?: boolean;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ 
  order, 
  language = 'en',
  includeQR = true,
  includeBarcode = true,
}) => {
  const isUrdu = language === 'ur';
  const company = isUrdu ? brandingConfig.company.name_ur : brandingConfig.company.name;
  const tagline = isUrdu ? brandingConfig.company.tagline_ur : brandingConfig.company.tagline;
  const address = isUrdu ? brandingConfig.contact.address_ur : brandingConfig.contact.address;
  const footer = isUrdu ? brandingConfig.invoice.footer_ur : brandingConfig.invoice.footer;
  const terms = isUrdu ? brandingConfig.invoice.terms_ur : brandingConfig.invoice.terms;

  const getStatusStyle = (status: string) => {
    const baseStyle = [styles.statusBadge];
    switch (status.toLowerCase()) {
      case 'pending':
        return [...baseStyle, styles.statusPending];
      case 'confirmed':
        return [...baseStyle, styles.statusConfirmed];
      case 'ready_for_pickup':
        return [...baseStyle, styles.statusReady];
      case 'completed':
        return [...baseStyle, styles.statusCompleted];
      case 'cancelled':
        return [...baseStyle, styles.statusCancelled];
      default:
        return baseStyle;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* Logo would go here if using Image component */}
            <Text style={styles.companyName}>{company}</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{tagline}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 9 }}>{address}</Text>
            <Text style={{ fontSize: 9 }}>{brandingConfig.contact.city}, {brandingConfig.contact.country}</Text>
            <Text style={{ fontSize: 9 }}>Phone: {brandingConfig.contact.phone}</Text>
            <Text style={{ fontSize: 9 }}>Email: {brandingConfig.contact.email}</Text>
            <Text style={{ fontSize: 9 }}>Web: {brandingConfig.contact.website}</Text>
          </View>
        </View>

        {/* Invoice Title */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={getStatusStyle(order.status)}>
            <Text>{order.status.toUpperCase().replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Order & Customer Info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={[styles.section, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Order Number:</Text>
              <Text style={styles.value}>{order.orderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order Date:</Text>
              <Text style={styles.value}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Payment Method:</Text>
              <Text style={styles.value}>{order.payment.method.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={styles.value}>{order.payment.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={[styles.section, { width: '48%' }]}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{order.pickupDetails.customerName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{order.pickupDetails.phone}</Text>
            </View>
            {order.pickupDetails.whatsapp && (
              <View style={styles.row}>
                <Text style={styles.label}>WhatsApp:</Text>
                <Text style={styles.value}>{order.pickupDetails.whatsapp}</Text>
              </View>
            )}
            {order.pickupDetails.notes && (
              <View style={styles.row}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{order.pickupDetails.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>#</Text>
              <Text style={styles.col2}>Product</Text>
              <Text style={styles.col3}>Category</Text>
              <Text style={styles.col4}>Size</Text>
              <Text style={styles.col5}>Price</Text>
              <Text style={styles.col6}>Qty</Text>
              <Text style={styles.col7}>Subtotal</Text>
            </View>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{index + 1}</Text>
                <View style={styles.col2}>
                  <Text style={{ fontWeight: 'bold', fontSize: 10 }}>{item.productSnapshot.name.en}</Text>
                  {item.productSnapshot.brand && (
                    <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                      Brand: {item.productSnapshot.brand}
                    </Text>
                  )}
                </View>
                <Text style={[styles.col3, { fontSize: 9 }]}>{item.productSnapshot.category || 'N/A'}</Text>
                <Text style={[styles.col4, { fontSize: 9 }]}>{item.productSnapshot.size || 'N/A'}</Text>
                <Text style={[styles.col5, { fontSize: 9 }]}>{item.price.toLocaleString()}</Text>
                <Text style={[styles.col6, { fontSize: 9 }]}>{item.quantity}</Text>
                <Text style={[styles.col7, { fontSize: 9 }]}>{item.subtotal.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{order.pricing.subtotal.toLocaleString()}</Text>
          </View>
          {order.pricing.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount{order.coupon?.code ? ` (Coupon: ${order.coupon.code})` : ''}:
              </Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>-{order.pricing.discount.toLocaleString()}</Text>
            </View>
          )}
          {order.pricing.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{order.pricing.tax.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{order.pricing.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Coupon Info */}
        {order.coupon && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon Applied</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Coupon Code:</Text>
              <Text style={styles.value}>{order.coupon.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Discount Amount:</Text>
              <Text style={[styles.value, { color: '#ef4444' }]}>-PKR {order.coupon.discountAmount.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Bank Details */}
        {order.payment.method === 'bank_transfer' && (
          <View style={styles.bankDetails}>
            <Text style={styles.sectionTitle}>Bank Transfer Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Bank Name:</Text>
              <Text style={styles.value}>{brandingConfig.bankDetails.bankName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Account Title:</Text>
              <Text style={styles.value}>{brandingConfig.bankDetails.accountTitle}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Account Number:</Text>
              <Text style={styles.value}>{brandingConfig.bankDetails.accountNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>IBAN:</Text>
              <Text style={styles.value}>{brandingConfig.bankDetails.iban}</Text>
            </View>
          </View>
        )}

        {/* Terms & Conditions */}
        <View style={styles.terms}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Terms & Conditions:</Text>
          {terms.map((term, index) => (
            <Text key={index} style={styles.termItem}>• {term}</Text>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ fontSize: 9, marginBottom: 4 }}>{footer}</Text>
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>
            {brandingConfig.company.name} | {brandingConfig.contact.email} | {brandingConfig.contact.phone}
          </Text>
          {brandingConfig.business.taxId && (
            <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>
              Tax ID: {brandingConfig.business.taxId}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceTemplate;
