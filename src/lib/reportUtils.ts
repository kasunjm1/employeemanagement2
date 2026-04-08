import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './utils';

// Helper to convert image URL to base64
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = url;
  });
};

// Helper to convert image URL to buffer for exceljs
const getImageBufferFromURL = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return await response.arrayBuffer();
};

// Helper to load font from URL and convert to base64
const loadFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const exportToExcel = async (
  data: any[],
  columns: { header: string; dataKey: string; isImage?: boolean }[],
  fileName: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add headers
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowValues = columns.map(col => col.isImage ? '' : (row[col.dataKey] || ''));
    const newRow = worksheet.addRow(rowValues);
    newRow.height = 40; // Set row height for images
    newRow.alignment = { vertical: 'middle' };

    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      if (col.isImage && row[col.dataKey]) {
        try {
          const buffer = await getImageBufferFromURL(row[col.dataKey]);
          const imageId = workbook.addImage({
            buffer: buffer,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: j, row: i + 1 },
            ext: { width: 40, height: 40 },
            editAs: 'oneCell'
          });
        } catch (e) {
          console.error('Error adding image to Excel:', e);
        }
      }
    }
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const exportToPDF = async (
  data: any[],
  columns: { header: string; dataKey: string; isImage?: boolean }[],
  title: string,
  fileName: string
) => {
  const doc = new jsPDF();
  
  // Load Sinhala font
  let fontLoaded = false;
  const fontName = 'NotoSansSinhala';
  try {
    // Using a more reliable direct TTF link from jsDelivr (Google Fonts mirror)
    const sinhalaFontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansSinhala/NotoSansSinhala-Regular.ttf';
    const fontBase64 = await loadFontAsBase64(sinhalaFontUrl);
    doc.addFileToVFS(`${fontName}.ttf`, fontBase64);
    doc.addFont(`${fontName}.ttf`, fontName, 'normal');
    fontLoaded = true;
  } catch (e) {
    console.warn('Failed to load Sinhala font, falling back to default.', e);
  }
  
  // Add title
  doc.setFontSize(22);
  doc.setTextColor(0, 61, 155); // Primary color #003d9b
  if (fontLoaded) doc.setFont(fontName);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(115, 118, 133); // Outline color #737685
  if (fontLoaded) doc.setFont(fontName);
  doc.text(`Generated on: ${formatDate(new Date())} ${new Date().toLocaleTimeString()}`, 14, 30);
  
  // Prepare body data with base64 images if needed
  const body = await Promise.all(
    data.map(async (row) => {
      const rowData: any[] = [];
      for (const col of columns) {
        if (col.isImage && row[col.dataKey]) {
          try {
            const base64 = await getBase64ImageFromURL(row[col.dataKey]);
            rowData.push({ content: '', image: base64 });
          } catch (e) {
            rowData.push('');
          }
        } else {
          rowData.push(row[col.dataKey] || '');
        }
      }
      return rowData;
    })
  );
  
  // Add table
  autoTable(doc, {
    startY: 40,
    head: [columns.map(col => col.header)],
    body: body,
    theme: 'grid',
    styles: { 
      font: fontLoaded ? fontName : 'helvetica', // Use the custom font only if loaded
      fontSize: 9,
      textColor: [25, 28, 30], // On-surface color #191c1e
      valign: 'middle',
      minCellHeight: 15 // Increase row height for images
    },
    headStyles: { 
      fillColor: [0, 61, 155], // Primary color #003d9b
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      font: fontLoaded ? fontName : 'helvetica'
    },
    alternateRowStyles: {
      fillColor: [243, 243, 247] // Surface-container-low #f3f3f7
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && columns[data.column.index].isImage) {
        const cellData = data.cell.raw as any;
        if (cellData && cellData.image) {
          doc.addImage(cellData.image, 'PNG', data.cell.x + 2, data.cell.y + 2, 11, 11);
        }
      }
    },
    columnStyles: columns.reduce((acc: any, col, index) => {
      if (col.isImage) {
        acc[index] = { cellWidth: 15, halign: 'center' };
      }
      return acc;
    }, {})
  });
  
  doc.save(`${fileName}.pdf`);
};
