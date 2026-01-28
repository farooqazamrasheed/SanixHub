const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generate Excel file from inventory data
 */
exports.generateExcelExport = async (inventories) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory Report');

  // Define columns
  worksheet.columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Product Name (EN)', key: 'nameEn', width: 30 },
    { header: 'Product Name (UR)', key: 'nameUr', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Brand', key: 'brand', width: 20 },
    { header: 'Available Stock', key: 'available', width: 15 },
    { header: 'Reserved Stock', key: 'reserved', width: 15 },
    { header: 'Sold', key: 'sold', width: 10 },
    { header: 'Low Stock Threshold', key: 'threshold', width: 18 },
    { header: 'Price', key: 'price', width: 12 },
    { header: 'Total Value', key: 'totalValue', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  inventories.forEach(inv => {
    const product = inv.product;
    const price = product?.pricing?.salePrice || product?.pricing?.basePrice || 0;
    const totalValue = price * inv.stock.available;
    
    let status = 'In Stock';
    if (inv.stock.available === 0) status = 'Out of Stock';
    else if (inv.stock.available <= inv.alerts.lowStockThreshold) status = 'Low Stock';

    const row = worksheet.addRow({
      sku: product?.sku || 'N/A',
      nameEn: product?.name?.en || 'N/A',
      nameUr: product?.name?.ur || 'N/A',
      category: product?.category?.name?.en || 'Uncategorized',
      brand: product?.brand || 'No Brand', // brand is stored as string, not object
      available: inv.stock.available,
      reserved: inv.stock.reserved,
      sold: inv.stock.sold,
      threshold: inv.alerts.lowStockThreshold,
      price: price,
      totalValue: totalValue.toFixed(2),
      status: status
    });

    // Color code status
    if (status === 'Out of Stock') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' }
      };
      row.getCell('status').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else if (status === 'Low Stock') {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF59E0B' }
      };
      row.getCell('status').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else {
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      };
      row.getCell('status').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    }
  });

  // Add totals row
  const totalRow = worksheet.addRow({
    sku: 'TOTALS',
    nameEn: '',
    nameUr: '',
    category: '',
    brand: '',
    available: { formula: `SUM(F2:F${worksheet.rowCount})` },
    reserved: { formula: `SUM(G2:G${worksheet.rowCount})` },
    sold: { formula: `SUM(H2:H${worksheet.rowCount})` },
    threshold: '',
    price: '',
    totalValue: { formula: `SUM(K2:K${worksheet.rowCount})` },
    status: ''
  });

  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };

  return await workbook.xlsx.writeBuffer();
};

/**
 * Generate PDF file from inventory data
 */
exports.generatePDFExport = (inventories) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('Inventory Report', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Summary stats
      const totalProducts = inventories.length;
      const outOfStock = inventories.filter(inv => inv.stock.available === 0).length;
      const lowStock = inventories.filter(inv => 
        inv.stock.available > 0 && inv.stock.available <= inv.alerts.lowStockThreshold
      ).length;
      const inStock = totalProducts - outOfStock - lowStock;

      let totalValue = 0;
      inventories.forEach(inv => {
        if (inv.product && inv.product.pricing) {
          const price = inv.product.pricing.salePrice || inv.product.pricing.basePrice;
          totalValue += price * inv.stock.available;
        }
      });

      doc.fontSize(12).font('Helvetica-Bold').text('Summary:', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Products: ${totalProducts}`);
      doc.text(`In Stock: ${inStock} | Low Stock: ${lowStock} | Out of Stock: ${outOfStock}`);
      doc.text(`Total Inventory Value: ${totalValue.toFixed(2)} PKR`);
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const colWidths = [50, 100, 60, 60, 50, 50, 50, 70];
      const headers = ['SKU', 'Product Name', 'Category', 'Brand', 'Stock', 'Reserved', 'Sold', 'Status'];

      doc.fontSize(10).font('Helvetica-Bold');
      let x = 30;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      doc.moveDown();
      doc.strokeColor('#000000').lineWidth(1).moveTo(30, doc.y).lineTo(800, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.fontSize(9).font('Helvetica');
      let rowCount = 0;
      const maxRows = 20; // Limit rows per page

      inventories.forEach((inv, index) => {
        if (rowCount >= maxRows) {
          doc.addPage();
          rowCount = 0;
        }

        const product = inv.product;
        let status = 'In Stock';
        if (inv.stock.available === 0) status = 'Out of Stock';
        else if (inv.stock.available <= inv.alerts.lowStockThreshold) status = 'Low Stock';

        x = 30;
        const y = doc.y;
        const rowData = [
          product?.sku || 'N/A',
          product?.name?.en || 'N/A',
          product?.category?.name?.en || 'N/A',
          product?.brand || 'No Brand', // brand is stored as string
          inv.stock.available.toString(),
          inv.stock.reserved.toString(),
          inv.stock.sold.toString(),
          status
        ];

        rowData.forEach((data, i) => {
          doc.text(data, x, y, { width: colWidths[i], align: 'left', ellipsis: true });
          x += colWidths[i];
        });

        doc.moveDown(0.8);
        rowCount++;
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate CSV string from inventory data
 */
exports.generateCSVExport = (inventories) => {
  const headers = [
    'SKU',
    'Product Name (EN)',
    'Product Name (UR)',
    'Category',
    'Brand',
    'Available Stock',
    'Reserved Stock',
    'Sold',
    'Low Stock Threshold',
    'Price',
    'Total Value',
    'Status'
  ];

  const rows = inventories.map(inv => {
    const product = inv.product;
    const price = product?.pricing?.salePrice || product?.pricing?.basePrice || 0;
    const totalValue = price * inv.stock.available;
    
    let status = 'In Stock';
    if (inv.stock.available === 0) status = 'Out of Stock';
    else if (inv.stock.available <= inv.alerts.lowStockThreshold) status = 'Low Stock';

    return [
      product?.sku || 'N/A',
      product?.name?.en || 'N/A',
      product?.name?.ur || 'N/A',
      product?.category?.name?.en || 'Uncategorized',
      product?.brand || 'No Brand', // brand is stored as string, not object
      inv.stock.available,
      inv.stock.reserved,
      inv.stock.sold,
      inv.alerts.lowStockThreshold,
      price,
      totalValue.toFixed(2),
      status
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};
