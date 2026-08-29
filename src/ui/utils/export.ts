/**
 * Export Utilities
 * Reusable CSV export, file download, and filename generation.
 *
 * All functions are pure — they receive data and return results.
 * No business logic, no accounting calculations, no service calls.
 */

/* ─── CSV Generation ──────────────────────────────────────── */

/**
 * Escape a CSV field value.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Generate a CSV string from headers and rows.
 * @param headers - Column headers
 * @param rows - Array of arrays (each inner array is a row)
 * @returns CSV string with BOM for Excel compatibility
 */
export function generateCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map(row => row.map(escapeCsvField).join(','));
  return bom + headerLine + '\n' + dataLines.join('\n');
}

/* ─── File Download ───────────────────────────────────────── */

/**
 * Download a string as a file.
 * @param content - File content
 * @param filename - Desired filename (will be sanitized)
 * @param mimeType - MIME type (default: text/csv)
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;',
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download binary data as a file.
 */
export function downloadBinary(
  data: ArrayBuffer,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Filename Generation ─────────────────────────────────── */

/**
 * Sanitize a filename to be safe for all operating systems.
 * Removes or replaces unsafe characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

/**
 * Generate a dated filename for export.
 * @param prefix - Document type prefix (e.g., "Sales-Invoice")
 * @param reference - Optional reference (e.g., "SV-000123")
 * @param ext - File extension (default: "csv")
 */
export function generateExportFilename(
  prefix: string,
  reference?: string,
  ext: string = 'csv',
): string {
  const date = new Date().toISOString().slice(0, 10);
  const parts = [prefix];
  if (reference) parts.push(reference);
  parts.push(date);
  return sanitizeFilename(parts.join('-')) + '.' + ext;
}

/* ─── Print Helpers ───────────────────────────────────────── */

/**
 * Print the current browser window.
 * This is the simplest and most reliable print mechanism.
 */
export function printWindow(): void {
  window.print();
}

/**
 * Print a specific DOM element by ID.
 * Temporarily isolates the element for printing.
 */
export function printElement(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Print element not found: ${elementId}`);
    return;
  }

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    // Fallback to window.print() if popup is blocked
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${element.innerHTML}
      <script>window.onload=function(){window.print();window.close();}<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/* ─── Data Formatting ─────────────────────────────────────── */

/**
 * Format a number for CSV export.
 * Returns the raw number (no locale formatting) for spreadsheet compatibility.
 */
export function formatCsvNumber(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Format a date string for export.
 */
export function formatExportDate(dateStr: string): string {
  return dateStr; // Already in YYYY-MM-DD format
}
