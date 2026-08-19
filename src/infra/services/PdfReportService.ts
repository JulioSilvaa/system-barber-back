import PDFDocument from 'pdfkit';

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: string;
}

export default class PdfReportService {
  generate(options: PdfReportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text(options.title, { align: 'center' });
      doc.moveDown(0.5);

      if (options.subtitle) {
        doc.fontSize(10).font('Helvetica').text(options.subtitle, { align: 'center' });
        doc.moveDown(1);
      }

      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown(1);

      this.drawTable(doc, options);

      if (options.footer) {
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica').fillColor('#999999');
        doc.text(options.footer, { align: 'center' });
      }

      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica').fillColor('#999999');
        doc.text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 40, {
          align: 'center',
        });
      }

      doc.end();
    });
  }

  private drawTable(doc: PDFKit.PDFDocument, options: PdfReportOptions): void {
    const { headers, rows } = options;
    const tableTop = doc.y;
    const pageWidth = doc.page.width - 100;
    const colWidth = pageWidth / headers.length;
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333');
    headers.forEach((header, i) => {
      doc.text(header, 50 + i * colWidth, tableTop, {
        width: colWidth,
        align: i === 0 ? 'left' : 'right',
      });
    });

    doc
      .moveTo(50, tableTop + rowHeight)
      .lineTo(50 + pageWidth, tableTop + rowHeight)
      .stroke('#CCCCCC');

    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    rows.forEach((row, rowIndex) => {
      const y = tableTop + rowHeight + rowIndex * rowHeight;

      if (y > doc.page.height - 80) {
        doc.addPage();
      }

      if (rowIndex % 2 === 0) {
        doc.rect(50, y, pageWidth, rowHeight).fill('#F9F9F9');
        doc.fillColor('#333333');
      }

      row.forEach((cell, colIndex) => {
        doc.text(String(cell), 50 + colIndex * colWidth, y + 5, {
          width: colWidth,
          align: colIndex === 0 ? 'left' : 'right',
        });
      });
    });
  }
}
