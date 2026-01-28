/**
 * Company Branding Configuration
 * Used for invoices, receipts, and other printed materials
 */

export const brandingConfig = {
  company: {
    name: 'YOUR COMPANY NAME',
    name_ur: 'آپ کی کمپنی کا نام', // Urdu translation
    tagline: 'Your Company Tagline',
    tagline_ur: 'آپ کی کمپنی کا نعرہ',
  },
  
  contact: {
    address: 'Your Business Address',
    address_ur: 'آپ کا کاروباری پتہ',
    city: 'City Name',
    country: 'Pakistan',
    phone: '+92-XXX-XXXXXXX',
    whatsapp: '+92-XXX-XXXXXXX',
    email: 'info@yourcompany.com',
    website: 'https://yourwebsite.com',
  },
  
  business: {
    taxId: 'TAX-ID-NUMBER', // NTN or Sales Tax Number
    registrationNumber: 'REG-NUMBER',
    licenseNumber: 'LICENSE-NUMBER',
  },
  
  branding: {
    logo: '/images/logo.png', // Path to your logo (200x200 recommended)
    primaryColor: '#10b981', // Green (matching your current theme)
    secondaryColor: '#059669',
    accentColor: '#f59e0b', // Amber
    textColor: '#1f2937',
  },
  
  invoice: {
    footer: 'Thank you for your business!',
    footer_ur: 'آپ کے کاروبار کے لیے شکریہ!',
    terms: [
      'All sales are final unless otherwise stated',
      'Please inspect items upon pickup',
      'Contact us within 24 hours for any issues',
    ],
    terms_ur: [
      'تمام فروخت حتمی ہے جب تک کہ دوسری صورت میں نہ کہا جائے',
      'براہ کرم لینے کے وقت اشیاء کا معائنہ کریں',
      'کسی بھی مسئلے کے لیے 24 گھنٹوں کے اندر ہم سے رابطہ کریں',
    ],
  },
  
  bankDetails: {
    bankName: 'Your Bank Name',
    accountTitle: 'Your Account Title',
    accountNumber: 'XXXX-XXXX-XXXX-XXXX',
    iban: 'PK##XXXXXXXXXXXXXXXXXXXX',
    branchCode: 'XXXX',
  },
};

export default brandingConfig;
