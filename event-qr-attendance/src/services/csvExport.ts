/**
 * CSV Export Service
 * Formats structured data into CSV format and triggers browser download
 */

export class CsvExportService {
  /**
   * Converts an array of objects to a CSV string and downloads it as a file
   */
  public static exportToCsv<T extends Record<string, any>>(
    filename: string,
    data: T[],
    columns: { key: keyof T | string; label: string; formatter?: (val: any, row: T) => string }[]
  ): void {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    // 1. Headers row
    const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');

    // 2. Data rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          let val = (row as any)[col.key];
          if (col.formatter) {
            val = col.formatter(val, row);
          } else if (val === null || val === undefined) {
            val = '';
          } else if (typeof val === 'object') {
            val = JSON.stringify(val);
          } else {
            val = String(val);
          }
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
