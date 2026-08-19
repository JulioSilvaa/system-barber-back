import ExcelJS from 'exceljs';

export interface ExcelReportOptions {
  title: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number)[][];
  columnWidths?: number[];
}

export default class ExcelReportService {
  async generate(options: ExcelReportOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.creator = 'System Barber';

    const sheet = workbook.addWorksheet(options.sheetName ?? options.title);

    if (options.columnWidths) {
      sheet.columns = options.columnWidths.map((width, i) => ({
        key: String(i),
        width,
      }));
    }

    const headerRow = sheet.addRow(options.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };
    headerRow.alignment = { horizontal: 'center' };

    options.rows.forEach((row, index) => {
      const dataRow = sheet.addRow(row);
      if (index % 2 === 0) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: options.headers.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
