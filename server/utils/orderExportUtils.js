const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generate detailed CSV with item breakdown
 */
exports.generateDetailedCSV = (orders) => {
  const headers = [
    'Order Number',
    'Order Date',
    'Customer Name',
    'Customer Phone',
    'Product Name',
    'SKU',
    'Brand',
    'Category',
    'Quantity',
    'Unit Price',
    'Item Subtotal',
    'Order Subtotal',
    'Order Discount',
    'Order Tax',
    'Order Total',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Coupon Code',
    'Notes'
  ];

  const rows = [];
  
  orders.forEach(order => {
    const orderInfo = {
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString(),
      customerName: order.pickupDetails?.customerName || 'N/A',
      customerPhone: order.pickupDetails?.phone || 'N/A',
      orderSubtotal: order.pricing?.subtotal || 0,
      orderDiscount: order.pricing?.discount || 0,
      orderTax: order.pricing?.tax || 0,
      orderTotal: order.pricing?.total || 0,
      paymentMethod: order.payment?.method || 'N/A',
      paymentStatus: order.payment?.status || 'N/A',
      orderStatus: order.status || 'N/A',
      couponCode: order.coupon?.code || '',
      notes: order.pickupDetails?.notes || ''
    };

    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        rows.push([
          orderInfo.orderNumber,
          orderInfo.orderDate,
          orderInfo.customerName,
          orderInfo.customerPhone,
          item.productSnapshot?.name?.en || 'N/A',
          item.productSnapshot?.sku || 'N/A',
          item.productSnapshot?.brand || 'N/A',
          item.productSnapshot?.category || 'N/A',
          item.quantity,
          item.price,
          item.subtotal,
          orderInfo.orderSubtotal,
          orderInfo.orderDiscount,
          orderInfo.orderTax,
          orderInfo.orderTotal,
          orderInfo.paymentMethod,
          orderInfo.paymentStatus,
          orderInfo.orderStatus,
          orderInfo.couponCode,
          orderInfo.notes
        ]);
      });
    } else {
      // Order with no items
      rows.push([
        orderInfo.orderNumber,
        orderInfo.orderDate,
        orderInfo.customerName,
        orderInfo.customerPhone,
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        0,
        0,
        0,
        orderInfo.orderSubtotal,
        orderInfo.orderDiscount,
        orderInfo.orderTax,
        orderInfo.orderTotal,
        orderInfo.paymentMethod,
        orderInfo.paymentStatus,
        orderInfo.orderStatus,
        orderInfo.couponCode,
        orderInfo.notes
      ]);
    }
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Generate summary CSV (one row per order)
 */
exports.generateSummaryCSV = (orders) => {
  const headers = [
    'Order Number',
    'Date',
    'Customer Name',
    'Customer Phone',
    'Items Count',
    'Subtotal',
    'Discount',
    'Tax',
    'Total',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Coupon Code',
    'Notes'
  ];

  const rows = orders.map(order => [
    order.orderNumber,
    new Date(order.createdAt).toLocaleDateString(),
    order.pickupDetails?.customerName || 'N/A',
    order.pickupDetails?.phone || 'N/A',
    order.items?.length || 0,
    order.pricing?.subtotal || 0,
    order.pricing?.discount || 0,
    order.pricing?.tax || 0,
    order.pricing?.total || 0,
    order.payment?.method || 'N/A',
    order.payment?.status || 'N/A',
    order.status || 'N/A',
    order.coupon?.code || '',
    order.pickupDetails?.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Generate Excel export with multiple sheets
 */
exports.generateExcelExport = async (orders) => {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Orders Summary
  const summarySheet = workbook.addWorksheet('Orders Summary');
  
  summarySheet.columns = [
    { header: 'Order Number', key: 'orderNumber', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Customer', key: 'customer', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Items', key: 'itemsCount', width: 10 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Discount', key: 'discount', width: 15 },
    { header: 'Tax', key: 'tax', width: 15 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Payment', key: 'payment', width: 15 }
  ];

  // Style header
  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add summary data
  orders.forEach(order => {
    const row = summarySheet.addRow({
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleDateString(),
      customer: order.pickupDetails?.customerName || 'N/A',
      phone: order.pickupDetails?.phone || 'N/A',
      itemsCount: order.items?.length || 0,
      subtotal: order.pricing?.subtotal || 0,
      discount: order.pricing?.discount || 0,
      tax: order.pricing?.tax || 0,
      total: order.pricing?.total || 0,
      status: order.status || 'N/A',
      payment: order.payment?.method || 'N/A'
    });

    // Color code by status
    const statusColors = {
      placed: 'FF3B82F6',
      ready: 'FF10B981',
      picked_up: 'FF6B7280',
      cancelled: 'FFEF4444'
    };
    
    if (statusColors[order.status]) {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColors[order.status] }
      };
      row.getCell('status').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    }
  });

  // Add totals row
  const totalRow = summarySheet.addRow({
    orderNumber: 'TOTALS',
    date: '',
    customer: '',
    phone: '',
    itemsCount: { formula: `SUM(E2:E${summarySheet.rowCount})` },
    subtotal: { formula: `SUM(F2:F${summarySheet.rowCount})` },
    discount: { formula: `SUM(G2:G${summarySheet.rowCount})` },
    tax: { formula: `SUM(H2:H${summarySheet.rowCount})` },
    total: { formula: `SUM(I2:I${summarySheet.rowCount})` },
    status: '',
    payment: ''
  });
  
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };

  // Sheet 2: Order Items Detail
  const detailSheet = workbook.addWorksheet('Order Items Detail');
  
  detailSheet.columns = [
    { header: 'Order Number', key: 'orderNumber', width: 20 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Brand', key: 'brand', width: 15 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Price', key: 'unitPrice', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 }
  ];

  // Style header
  detailSheet.getRow(1).font = { bold: true, size: 12 };
  detailSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add item details
  orders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        detailSheet.addRow({
          orderNumber: order.orderNumber,
          productName: item.productSnapshot?.name?.en || 'N/A',
          sku: item.productSnapshot?.sku || 'N/A',
          brand: item.productSnapshot?.brand || 'N/A',
          category: item.productSnapshot?.category || 'N/A',
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.subtotal
        });
      });
    }
  });

  // Sheet 3: Statistics
  const statsSheet = workbook.addWorksheet('Statistics');
  
  // Calculate statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDiscount = orders.reduce((sum, order) => sum + (order.pricing?.discount || 0), 0);
  
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const paymentMethodCounts = orders.reduce((acc, order) => {
    const method = order.payment?.method || 'Unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  // Style title
  statsSheet.getCell('A1').value = 'Orders Export Statistics';
  statsSheet.getCell('A1').font = { bold: true, size: 16 };
  statsSheet.mergeCells('A1:B1');
  
  statsSheet.addRow([]);
  
  // Add statistics
  statsSheet.addRow(['Metric', 'Value']);
  statsSheet.getRow(3).font = { bold: true };
  
  statsSheet.addRow(['Total Orders', totalOrders]);
  statsSheet.addRow(['Total Revenue', `PKR ${totalRevenue.toLocaleString()}`]);
  statsSheet.addRow(['Average Order Value', `PKR ${averageOrderValue.toFixed(2)}`]);
  statsSheet.addRow(['Total Discount Given', `PKR ${totalDiscount.toLocaleString()}`]);
  
  statsSheet.addRow([]);
  statsSheet.addRow(['Orders by Status', '']);
  statsSheet.getRow(statsSheet.rowCount).font = { bold: true };
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    statsSheet.addRow([status.toUpperCase().replace('_', ' '), count]);
  });
  
  statsSheet.addRow([]);
  statsSheet.addRow(['Orders by Payment Method', '']);
  statsSheet.getRow(statsSheet.rowCount).font = { bold: true };
  
  Object.entries(paymentMethodCounts).forEach(([method, count]) => {
    statsSheet.addRow([method.toUpperCase().replace('_', ' '), count]);
  });

  // Auto-fit columns
  statsSheet.getColumn(1).width = 30;
  statsSheet.getColumn(2).width = 20;

  return await workbook.xlsx.writeBuffer();
};

/**
 * Generate combined PDF with all orders
 */
exports.generateCombinedPDF = (orders) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title page
      doc.fontSize(24).font('Helvetica-Bold').text('Orders Report', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.fontSize(12).text(`Total Orders: ${orders.length}`, { align: 'center' });
      doc.moveDown(2);

      // Summary statistics
      const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const averageOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

      doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics:', { underline: true });
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total Revenue: PKR ${totalRevenue.toLocaleString()}`);
      doc.text(`Average Order Value: PKR ${averageOrder.toFixed(2)}`);
      doc.moveDown();

      // Orders list
      orders.forEach((order, index) => {
        // Add page break after every 2 orders (except first)
        if (index > 0 && index % 2 === 0) {
          doc.addPage();
        }

        doc.fontSize(12).font('Helvetica-Bold').text(`Order #${order.orderNumber}`, { underline: true });
        doc.fontSize(10).font('Helvetica');
        
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Customer: ${order.pickupDetails?.customerName || 'N/A'}`);
        doc.text(`Phone: ${order.pickupDetails?.phone || 'N/A'}`);
        doc.text(`Status: ${order.status?.toUpperCase().replace('_', ' ') || 'N/A'}`);
        doc.text(`Payment: ${order.payment?.method?.toUpperCase().replace('_', ' ') || 'N/A'}`);
        
        doc.moveDown(0.5);
        doc.text('Items:', { underline: true });
        
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, idx) => {
            doc.text(`  ${idx + 1}. ${item.productSnapshot?.name?.en || 'N/A'} x ${item.quantity} - PKR ${item.subtotal.toLocaleString()}`);
          });
        }
        
        doc.moveDown(0.5);
        doc.text(`Subtotal: PKR ${(order.pricing?.subtotal || 0).toLocaleString()}`);
        if (order.pricing?.discount > 0) {
          doc.text(`Discount: -PKR ${order.pricing.discount.toLocaleString()}`);
        }
        if (order.pricing?.tax > 0) {
          doc.text(`Tax: PKR ${order.pricing.tax.toLocaleString()}`);
        }
        doc.font('Helvetica-Bold').text(`Total: PKR ${(order.pricing?.total || 0).toLocaleString()}`);
        
        doc.moveDown(1);
        doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(30, doc.y).lineTo(565, doc.y).stroke();
        doc.moveDown(1);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate summary report PDF
 */
exports.generateSummaryReportPDF = (orders) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(26).font('Helvetica-Bold').text('Orders Summary Report', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Calculate statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const totalDiscount = orders.reduce((sum, order) => sum + (order.pricing?.discount || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const paymentCounts = orders.reduce((acc, order) => {
        const method = order.payment?.method || 'Unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});

      // Overview section
      doc.fontSize(16).font('Helvetica-Bold').text('Overview', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      
      doc.text(`Total Orders: ${totalOrders}`);
      doc.text(`Total Revenue: PKR ${totalRevenue.toLocaleString()}`);
      doc.text(`Total Discounts: PKR ${totalDiscount.toLocaleString()}`);
      doc.text(`Average Order Value: PKR ${averageOrderValue.toFixed(2)}`);
      doc.moveDown(2);

      // Orders by Status
      doc.fontSize(16).font('Helvetica-Bold').text('Orders by Status', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        const percentage = ((count / totalOrders) * 100).toFixed(1);
        doc.text(`${status.toUpperCase().replace('_', ' ')}: ${count} (${percentage}%)`);
      });
      doc.moveDown(2);

      // Payment Methods
      doc.fontSize(16).font('Helvetica-Bold').text('Payment Methods', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      
      Object.entries(paymentCounts).forEach(([method, count]) => {
        const percentage = ((count / totalOrders) * 100).toFixed(1);
        doc.text(`${method.toUpperCase().replace('_', ' ')}: ${count} (${percentage}%)`);
      });
      doc.moveDown(2);

      // Top products (if available)
      const productCounts = {};
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const productName = item.productSnapshot?.name?.en || 'Unknown';
            if (!productCounts[productName]) {
              productCounts[productName] = { count: 0, revenue: 0 };
            }
            productCounts[productName].count += item.quantity;
            productCounts[productName].revenue += item.subtotal;
          });
        }
      });

      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

      if (topProducts.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Products by Revenue', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        
        topProducts.forEach(([product, data], index) => {
          doc.text(`${index + 1}. ${product}: ${data.count} units, PKR ${data.revenue.toLocaleString()}`);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
