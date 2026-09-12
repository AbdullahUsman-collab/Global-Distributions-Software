/**
 * Step 79 — Reproduce GL → BillDetail chain
 * Exercises the EXACT path: GL click → /bills/:voucherId → getBillDetail
 */

import { describe, it, expect } from 'vitest';
import { handleDemoRequest } from '../../ui/lib/demoData';

// Access DEMO_LEDGER and DEMO_VOUCHERS indirectly via the handler
// Simulate the GL → bill detail flow exactly as the UI does

describe('Step 79 — GL → BillDetail reproduction', () => {

  it('should return bill detail for SV voucher from GL', () => {
    // Step 1: GL loads ledger entries for account 41101 (Sales Revenue)
    const ledgerResult = handleDemoRequest('/api/ledger/41101', 'GET');
    expect(ledgerResult).not.toBeNull();
    expect(Array.isArray(ledgerResult)).toBe(true);
    expect(ledgerResult.length).toBeGreaterThan(0);

    // Step 2: User clicks first voucher number - navigate to /bills/:voucherId
    const firstEntry = ledgerResult[0];
    expect(firstEntry.voucherId).toBeDefined();
    const voucherId = firstEntry.voucherId;

    // Step 3: BillDetailPage calls getBillDetail(voucherId) → GET /api/bills/:id
    const billDetail = handleDemoRequest(`/api/bills/${voucherId}`, 'GET');

    // The critical assertion — does the demo handler return the detail?
    console.log('Voucher ID from GL:', voucherId);
    console.log('Bill detail result:', billDetail ? 'FOUND' : 'NULL');

    expect(billDetail).not.toBeNull();
    expect(billDetail.voucher).toBeDefined();
    expect(billDetail.voucher.id).toBe(voucherId);
  });

  it('should return bill detail for ALL voucher types in GL', () => {
    // Get ALL ledger entries (simulating loading all accounts)
    const accounts = ['11101', '11102', '11201', '11202', '11203', '11204', '11205',
      '11301', '21100', '21101', '21102', '21201', '31101', '41101', '41104',
      '51101', '51104', '61101', '61102', '61103', '61104'];

    const allVoucherIds = new Set<string>();
    for (const acct of accounts) {
      const entries = handleDemoRequest(`/api/ledger/${acct}`, 'GET');
      if (entries && Array.isArray(entries)) {
        for (const e of entries) {
          allVoucherIds.add(e.voucherId);
        }
      }
    }

    console.log('All voucher IDs in GL:', [...allVoucherIds]);

    // For each voucher ID in the GL, clicking it should show detail
    for (const vid of allVoucherIds) {
      const detail = handleDemoRequest(`/api/bills/${vid}`, 'GET');
      console.log(`  ${vid}: ${detail ? 'OK' : 'NULL (ERROR!)'}`);
      expect(detail).not.toBeNull();
      expect(detail.voucher).toBeDefined();
      expect(detail.voucher.id).toBe(vid);
    }
  });

  it('should return bill detail for JV opening balance voucher', () => {
    // The opening balance JV (vch-01) appears in GL for account 11102 (Bank)
    const ledgerResult = handleDemoRequest('/api/ledger/11102', 'GET');
    expect(ledgerResult).not.toBeNull();

    // Find the JV entry
    const jvEntry = ledgerResult.find((e: any) => e.voucherType === 'JV');
    if (jvEntry) {
      console.log('Found JV entry:', jvEntry.voucherId, jvEntry.voucherNumber);
      const detail = handleDemoRequest(`/api/bills/${jvEntry.voucherId}`, 'GET');
      console.log('JV detail result:', detail ? 'OK' : 'NULL (BUG!)');
      expect(detail).not.toBeNull();
    } else {
      console.log('No JV entries for account 11102');
    }
  });

  it('should return bill detail for CR receipt voucher', () => {
    // Cash receipts appear in GL for account 11101 (Cash)
    const ledgerResult = handleDemoRequest('/api/ledger/11101', 'GET');
    if (ledgerResult && Array.isArray(ledgerResult)) {
      const crEntry = ledgerResult.find((e: any) => e.voucherType === 'CR');
      if (crEntry) {
        console.log('Found CR entry:', crEntry.voucherId, crEntry.voucherNumber);
        const detail = handleDemoRequest(`/api/bills/${crEntry.voucherId}`, 'GET');
        console.log('CR detail result:', detail ? 'OK' : 'NULL (BUG!)');
        expect(detail).not.toBeNull();
      }
    }
  });

  it('should return bill detail for BPV payment voucher', () => {
    // Bank payments appear in GL for account 11102 (Bank)
    const ledgerResult = handleDemoRequest('/api/ledger/11102', 'GET');
    if (ledgerResult && Array.isArray(ledgerResult)) {
      const bpvEntry = ledgerResult.find((e: any) => e.voucherType === 'BPV');
      if (bpvEntry) {
        console.log('Found BPV entry:', bpvEntry.voucherId, bpvEntry.voucherNumber);
        const detail = handleDemoRequest(`/api/bills/${bpvEntry.voucherId}`, 'GET');
        console.log('BPV detail result:', detail ? 'OK' : 'NULL (BUG!)');
        expect(detail).not.toBeNull();
      }
    }
  });

  it('should return bill detail for CP cash payment voucher', () => {
    const ledgerResult = handleDemoRequest('/api/ledger/11101', 'GET');
    if (ledgerResult && Array.isArray(ledgerResult)) {
      const cpEntry = ledgerResult.find((e: any) => e.voucherType === 'CP');
      if (cpEntry) {
        console.log('Found CP entry:', cpEntry.voucherId, cpEntry.voucherNumber);
        const detail = handleDemoRequest(`/api/bills/${cpEntry.voucherId}`, 'GET');
        console.log('CP detail result:', detail ? 'OK' : 'NULL (BUG!)');
        expect(detail).not.toBeNull();
      }
    }
  });

  it('all voucher IDs in DEMO_LEDGER should resolve in DEMO_BILLS', () => {
    // Get all voucher IDs from all ledger accounts
    const allAccounts = handleDemoRequest('/api/ledger', 'GET');
    expect(allAccounts).not.toBeNull();

    const voucherIds = [...new Set(allAccounts.map((e: any) => e.voucherId))];
    console.log('All DEMO_LEDGER voucher IDs:', voucherIds);

    // Check each against bills endpoint
    for (const vid of voucherIds) {
      const detail = handleDemoRequest(`/api/bills/${vid}`, 'GET');
      if (!detail) {
        console.error(`BUG CONFIRMED: Voucher ${vid} is in GL but not resolvable via /api/bills/${vid}`);
      }
      expect(detail).not.toBeNull();
    }
  });
});
