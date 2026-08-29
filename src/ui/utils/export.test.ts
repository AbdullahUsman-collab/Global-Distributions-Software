/**
 * Export Utilities Tests
 * Verifies CSV generation, filename generation, and data formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  generateCsv,
  sanitizeFilename,
  generateExportFilename,
  formatCsvNumber,
} from './export';

describe('Export Utilities', () => {
  describe('escapeCsvField', () => {
    it('returns empty string for null/undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('returns plain string for simple values', () => {
      expect(escapeCsvField('hello')).toBe('hello');
      expect(escapeCsvField(123)).toBe('123');
      expect(escapeCsvField(true)).toBe('true');
    });

    it('wraps in quotes when value contains comma', () => {
      expect(escapeCsvField('a,b')).toBe('"a,b"');
    });

    it('escapes double quotes inside quoted fields', () => {
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    it('wraps in quotes when value contains newline', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('handles empty string', () => {
      expect(escapeCsvField('')).toBe('');
    });

    it('handles numeric zero', () => {
      expect(escapeCsvField(0)).toBe('0');
    });
  });

  describe('generateCsv', () => {
    it('generates CSV with headers and data rows', () => {
      const csv = generateCsv(['Name', 'Amount'], [['Alice', 100], ['Bob', 200]]);
      const lines = csv.split('\n');
      // First line is BOM + header
      expect(lines[0]).toContain('Name,Amount');
      expect(lines[1]).toBe('Alice,100');
      expect(lines[2]).toBe('Bob,200');
    });

    it('includes UTF-8 BOM for Excel compatibility', () => {
      const csv = generateCsv(['A'], [['1']]);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it('handles empty rows', () => {
      const csv = generateCsv(['Col1', 'Col2'], []);
      const lines = csv.split('\n');
      expect(lines.length).toBe(2); // BOM+header + no data
    });

    it('escapes special characters in data', () => {
      const csv = generateCsv(['Name'], [['Has, comma']]);
      expect(csv).toContain('"Has, comma"');
    });

    it('handles mixed types', () => {
      const csv = generateCsv(['A', 'B', 'C'], [['text', 42, true]]);
      expect(csv).toContain('text,42,true');
    });
  });

  describe('sanitizeFilename', () => {
    it('removes unsafe characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('file-name');
    });

    it('replaces spaces with hyphens', () => {
      expect(sanitizeFilename('my file name')).toBe('my-file-name');
    });

    it('collapses multiple hyphens', () => {
      expect(sanitizeFilename('a---b')).toBe('a-b');
    });

    it('removes leading/trailing hyphens', () => {
      expect(sanitizeFilename('-hello-')).toBe('hello');
    });

    it('truncates long names', () => {
      const long = 'a'.repeat(300);
      expect(sanitizeFilename(long).length).toBe(200);
    });

    it('handles normal filename', () => {
      expect(sanitizeFilename('Sales-Invoice-SV-000123-2026-08-29.csv'))
        .toBe('Sales-Invoice-SV-000123-2026-08-29.csv');
    });
  });

  describe('generateExportFilename', () => {
    it('generates filename with prefix and date', () => {
      const name = generateExportFilename('Bills-Register');
      expect(name).toMatch(/^Bills-Register-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('generates filename with prefix, reference, and date', () => {
      const name = generateExportFilename('Sale-Invoice', 'SV-000123');
      expect(name).toMatch(/^Sale-Invoice-SV-000123-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('uses custom extension', () => {
      const name = generateExportFilename('Report', undefined, 'txt');
      expect(name).toMatch(/\.txt$/);
    });

    it('generates safe filenames', () => {
      const name = generateExportFilename('Customer Aging');
      expect(name).not.toMatch(/\s/);
    });
  });

  describe('formatCsvNumber', () => {
    it('rounds to 2 decimal places', () => {
      expect(formatCsvNumber(123.456)).toBe(123.46);
    });

    it('handles integer', () => {
      expect(formatCsvNumber(100)).toBe(100);
    });

    it('handles zero', () => {
      expect(formatCsvNumber(0)).toBe(0);
    });

    it('handles negative', () => {
      expect(formatCsvNumber(-50.123)).toBe(-50.12);
    });
  });
});
