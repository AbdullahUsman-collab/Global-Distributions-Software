#!/usr/bin/env node
/**
 * Step 51: Full End-to-End ERP UAT + Demo Rehearsal
 * Runs server and tests in a single process to avoid Windows background process issues.
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0, skipped = 0;
const results = [];

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
function pass(phase, name) { passed++; results.push({ phase, name, status: 'PASS' }); log('✅', `[${phase}] ${name}`); }
function fail(phase, name, err) { failed++; results.push({ phase, name, status: 'FAIL', error: String(err) }); log('❌', `[${phase}] ${name}: ${err}`); }
function skip(phase, name, reason) { skipped++; results.push({ phase, name, status: 'SKIP', reason }); log('⏭️', `[${phase}] ${name}: ${reason}`); }

async function req(method, path, body, cookie) {
  const url = new URL(path, BASE);
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: url.pathname + url.search,
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-csrf-token' },
  };
  if (cookie) options.headers['Cookie'] = cookie;
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        let newCookie = cookie;
        if (setCookie) {
          const match = setCookie.find(c => c.startsWith('erp_session='));
          if (match) newCookie = match.split(';')[0];
        }
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json, cookie: newCookie, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function cookieStr(cookies) {
  return Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ');
}

async function run() {
  console.log('\n' + '='.repeat(70));
  console.log('  STEP 51: FULL END-TO-END ERP UAT + DEMO REHEARSAL');
  console.log('='.repeat(70) + '\n');

  // ─── PHASE 0: Start Server ─────────────────────────────────
  console.log('\n--- PHASE 0: Server Startup ---');
  const serverProc = spawn('node', ['--import', 'tsx', 'src/server/index.ts'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  let serverReady = false;
  serverProc.stdout.on('data', (d) => {
    const s = d.toString();
    process.stdout.write(s);
    if (s.includes('Distribution Software ERP')) serverReady = true;
  });
  serverProc.stderr.on('data', (d) => process.stderr.write(d.toString()));

  // Wait for server to be ready
  for (let i = 0; i < 20; i++) {
    if (serverReady) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!serverReady) {
    // Try anyway
    await new Promise(r => setTimeout(r, 3000));
  }

  try {
    // ─── PHASE 1: Health Check ─────────────────────────────────
    console.log('\n--- PHASE 1: Health Check ---');
    try {
      const health = await req('GET', '/api/health');
      if (health.status === 200) pass('PHASE 1', 'Health check returns 200');
      else fail('PHASE 1', 'Health check', `Status ${health.status}`);
    } catch (e) {
      fail('PHASE 1', 'Health check', e.message);
    }

    // ─── PHASE 2: Public Endpoints ─────────────────────────────
    console.log('\n--- PHASE 2: Public Endpoints ---');
    let tenantCookie;
    try {
      const tenants = await req('GET', '/api/tenants');
      if (tenants.status === 200 && Array.isArray(tenants.body)) {
        pass('PHASE 2', `Tenants list: ${tenants.body.length} tenants`);
      } else {
        fail('PHASE 2', 'Tenants list', `Status ${tenants.status}`);
      }
    } catch (e) { fail('PHASE 2', 'Tenants list', e.message); }

    // ─── PHASE 3: Authentication ───────────────────────────────
    console.log('\n--- PHASE 3: Authentication ---');
    const cookies = {};
    const brands = {};
    
    for (const cred of [
      { username: 'admin', password: 'admin123', label: 'ADMIN' },
      { username: 'manager', password: 'manager123', label: 'MANAGER' },
      { username: 'clerk', password: 'clerk123', label: 'CLERK' },
    ]) {
      try {
        const login = await req('POST', '/api/auth/login', {
          username: cred.username,
          password: cred.password,
          tenantId: 'tenant-demo-wholesale-001',
        });
        if (login.status === 200 && login.cookie) {
          cookies[cred.label] = login.cookie;
          const me = await req('GET', '/api/auth/me', null, login.cookie);
          if (me.status === 200 && me.body.user) {
            brands[cred.label] = me.body.user.brandAccess || me.body.user.tenantId;
            pass('PHASE 3', `Login ${cred.label}: user=${me.body.user.username}, role=${me.body.user.role}`);
          } else {
            fail('PHASE 3', `Login ${cred.label} /me`, `Status ${me.status}`);
          }
        } else {
          fail('PHASE 3', `Login ${cred.label}`, `Status ${login.status}`);
        }
      } catch (e) { fail('PHASE 3', `Login ${cred.label}`, e.message); }
    }

    // Test invalid login
    try {
      const bad = await req('POST', '/api/auth/login', { username: 'admin', password: 'wrong', tenantId: 'tenant-demo-wholesale-001' });
      if (bad.status === 401) pass('PHASE 3', 'Invalid login rejected (401)');
      else fail('PHASE 3', 'Invalid login should be 401', `Status ${bad.status}`);
    } catch (e) { fail('PHASE 3', 'Invalid login', e.message); }

    // ─── PHASE 4: Unauthenticated Access ───────────────────────
    console.log('\n--- PHASE 4: Unauthenticated Access ---');
    for (const ep of ['/api/sales', '/api/purchases', '/api/cash-book', '/api/customers', '/api/suppliers', '/api/settings']) {
      try {
        const r = await req('GET', ep);
        if (r.status === 401) pass('PHASE 4', `GET ${ep} → 401 (protected)`);
        else fail('PHASE 4', `GET ${ep} should be 401`, `Status ${r.status}`);
      } catch (e) { fail('PHASE 4', `GET ${ep}`, e.message); }
    }

    // ─── PHASE 5: SPA Routing ──────────────────────────────────
    console.log('\n--- PHASE 5: SPA Routing ---');
    for (const route of ['/dashboard', '/finance', '/inventory', '/cash-book', '/settings', '/customers', '/suppliers', '/brand-access']) {
      try {
        const r = await req('GET', route);
        if (r.status === 200 && typeof r.body === 'string' && r.body.includes('id="root"')) {
          pass('PHASE 5', `SPA route ${route} → index.html`);
        } else {
          fail('PHASE 5', `SPA route ${route}`, `Status ${r.status}, has root: ${typeof r.body === 'string' && r.body.includes('id="root"')}`);
        }
      } catch (e) { fail('PHASE 5', `SPA route ${route}`, e.message); }
    }

    // ─── PHASE 6: Dashboard ────────────────────────────────────
    console.log('\n--- PHASE 6: Dashboard ---');
    try {
      const d = await req('GET', '/api/dashboard', null, cookies.ADMIN);
      if (d.status === 200) pass('PHASE 6', 'Dashboard data loaded');
      else fail('PHASE 6', 'Dashboard', `Status ${d.status}`);
    } catch (e) { fail('PHASE 6', 'Dashboard', e.message); }

    // ─── PHASE 7: COA (Chart of Accounts) ─────────────────────
    console.log('\n--- PHASE 7: Chart of Accounts ---');
    let accountId;
    try {
      const coa = await req('GET', '/api/accounts', null, cookies.ADMIN);
      if (coa.status === 200 && Array.isArray(coa.body)) {
        pass('PHASE 7', `COA list: ${coa.body.length} accounts`);
        if (coa.body.length > 0) accountId = coa.body[0].id;
      } else if (coa.status === 200 && coa.body.accounts) {
        pass('PHASE 7', `COA list: ${coa.body.accounts.length} accounts`);
        if (coa.body.accounts.length > 0) accountId = coa.body.accounts[0].id;
      } else {
        fail('PHASE 7', 'COA list', `Status ${coa.status}, body type: ${typeof coa.body}`);
      }
    } catch (e) { fail('PHASE 7', 'COA list', e.message); }

    // ─── PHASE 8: Customers ────────────────────────────────────
    console.log('\n--- PHASE 8: Customers ---');
    let customerId;
    try {
      const c = await req('GET', '/api/customers', null, cookies.ADMIN);
      if (c.status === 200) {
        const list = Array.isArray(c.body) ? c.body : (c.body.customers || []);
        pass('PHASE 8', `Customers list: ${list.length} customers`);
        if (list.length > 0) customerId = list[0].id;
      } else {
        fail('PHASE 8', 'Customers list', `Status ${c.status}`);
      }
    } catch (e) { fail('PHASE 8', 'Customers list', e.message); }

    // Create customer
    let newCustId;
    try {
      // First create an AR account for this customer
      const arAcct = await req('POST', '/api/accounts', {
        accountCode: `AR-UAT-${Date.now()}`,
        accountName: 'UAT Customer AR',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        level: 4,
        isPosting: true,
      }, cookies.ADMIN);
      const arAcctId = arAcct.body?.id;
      if (!arAcctId) {
        fail('PHASE 8', 'AR account create for customer', `Status ${arAcct.status} ${JSON.stringify(arAcct.body)}`);
      }

      const c = await req('POST', '/api/customers', {
        name: 'UAT Test Customer',
        phone: '0300-1234567',
        address: 'UAT Test Address, Lahore',
        accountHeadId: arAcctId || '',
      }, cookies.ADMIN);
      if (c.status === 200 || c.status === 201) {
        newCustId = c.body?.id || c.body?.customer?.id;
        pass('PHASE 8', `Customer created: ${newCustId}`);
      } else {
        fail('PHASE 8', 'Customer create', `Status ${c.status} ${JSON.stringify(c.body)}`);
      }
    } catch (e) { fail('PHASE 8', 'Customer create', e.message); }

    // ─── PHASE 9: Suppliers ────────────────────────────────────
    console.log('\n--- PHASE 9: Suppliers ---');
    let supplierId;
    try {
      const s = await req('GET', '/api/suppliers', null, cookies.ADMIN);
      if (s.status === 200) {
        const list = Array.isArray(s.body) ? s.body : (s.body.suppliers || []);
        pass('PHASE 9', `Suppliers list: ${list.length} suppliers`);
        if (list.length > 0) supplierId = list[0].id;
      } else {
        fail('PHASE 9', 'Suppliers list', `Status ${s.status}`);
      }
    } catch (e) { fail('PHASE 9', 'Suppliers list', e.message); }

    // ─── PHASE 10: Inventory ───────────────────────────────────
    console.log('\n--- PHASE 10: Inventory ---');
    try {
      const inv = await req('GET', '/api/products', null, cookies.ADMIN);
      if (inv.status === 200) {
        const list = Array.isArray(inv.body) ? inv.body : (inv.body.products || []);
        pass('PHASE 10', `Products list: ${list.length} products`);
      } else {
        fail('PHASE 10', 'Products list', `Status ${inv.status}`);
      }
    } catch (e) { fail('PHASE 10', 'Products list', e.message); }
    try {
      const wh = await req('GET', '/api/warehouses', null, cookies.ADMIN);
      if (wh.status === 200) pass('PHASE 10', 'Warehouses list loaded');
      else fail('PHASE 10', 'Warehouses list', `Status ${wh.status}`);
    } catch (e) { fail('PHASE 10', 'Warehouses list', e.message); }
    try {
      const sl = await req('GET', '/api/stock-levels', null, cookies.ADMIN);
      if (sl.status === 200) pass('PHASE 10', 'Stock levels loaded');
      else fail('PHASE 10', 'Stock levels', `Status ${sl.status}`);
    } catch (e) { fail('PHASE 10', 'Stock levels', e.message); }

    // ─── PHASE 11: Settings ────────────────────────────────────
    console.log('\n--- PHASE 11: Settings ---');
    try {
      const s = await req('GET', '/api/settings', null, cookies.ADMIN);
      if (s.status === 200) pass('PHASE 11', 'Settings loaded');
      else fail('PHASE 11', 'Settings', `Status ${s.status}`);
    } catch (e) { fail('PHASE 11', 'Settings', e.message); }

    // ─── PHASE 12: Brand Access ────────────────────────────────
    console.log('\n--- PHASE 12: Brand Access ---');
    try {
      const ba = await req('GET', '/api/users/user-admin-001/brand-access', null, cookies.ADMIN);
      if (ba.status === 200) {
        const list = Array.isArray(ba.body) ? ba.body : (ba.body.access || ba.body.data || []);
        pass('PHASE 12', `Brand access: ${list.length} entries for admin user`);
      } else {
        fail('PHASE 12', 'Brand access', `Status ${ba.status} ${JSON.stringify(ba.body)}`);
      }
    } catch (e) { fail('PHASE 12', 'Brand access', e.message); }

    // ─── PHASE 13: Voucher Creation (End-to-End) ──────────────
    console.log('\n--- PHASE 13: Voucher Creation ---');
    
    // First create a product for the sale
    let productId;
    try {
      const prod = await req('POST', '/api/products', {
        name: 'UAT Test Product',
        sku: `UAT-${Date.now()}`,
        category: 'General',
        unit: 'PCS',
        pcsPerCarton: 12,
        purchaseRate: 400,
        saleRate: 500,
        retailPrice: 550,
      }, cookies.ADMIN);
      if (prod.status === 200 || prod.status === 201) {
        productId = prod.body?.id || prod.body?.product?.id;
        pass('PHASE 13', `Product created: ${productId}`);
      } else {
        fail('PHASE 13', 'Product create', `Status ${prod.status} ${JSON.stringify(prod.body)}`);
      }
    } catch (e) { fail('PHASE 13', 'Product create', e.message); }

    // Get warehouse ID
    let warehouseId;
    try {
      const wh = await req('GET', '/api/warehouses', null, cookies.ADMIN);
      if (wh.status === 200) {
        const list = Array.isArray(wh.body) ? wh.body : (wh.body.warehouses || []);
        if (list.length > 0) warehouseId = list[0].id;
      }
    } catch (e) { /* ignore */ }

    if (newCustId && warehouseId) {
      // Create a Sales Voucher (SV)
      try {
        const sv = await req('POST', '/api/sales', {
          date: new Date().toISOString().split('T')[0],
          reference: 'UAT-SV-001',
          customerId: newCustId,
          warehouseId: warehouseId,
          lines: [{
            productId: productId,
            quantity: 10,
            rate: 500,
            discount: 0,
            stRate: 0,
          }],
        }, cookies.ADMIN);
        if (sv.status === 200 || sv.status === 201) {
          const svId = sv.body?.id || sv.body?.voucherId;
          pass('PHASE 13', `Sale voucher created: ${svId}`);

          // Post the sale
          if (svId) {
            try {
              const posted = await req('POST', `/api/sales/${svId}/post`, {}, cookies.ADMIN);
              if (posted.status === 200) pass('PHASE 13', `Sale voucher posted: ${svId}`);
              else fail('PHASE 13', 'Sale voucher post', `Status ${posted.status} ${JSON.stringify(posted.body)}`);
            } catch (e) { fail('PHASE 13', 'Sale voucher post', e.message); }
          }
        } else {
          fail('PHASE 13', 'Sale voucher create', `Status ${sv.status} ${JSON.stringify(sv.body)}`);
        }
      } catch (e) { fail('PHASE 13', 'Sale voucher create', e.message); }
    } else {
      skip('PHASE 13', 'Sale voucher create', `Missing newCustId=${newCustId} or warehouseId=${warehouseId}`);
    }

    // ─── PHASE 14: Cash Book ───────────────────────────────────
    console.log('\n--- PHASE 14: Cash Book ---');
    try {
      // First get cash book accounts (cash/bank accounts)
      const cbAccts = await req('GET', '/api/cash-book/accounts', null, cookies.ADMIN);
      if (cbAccts.status === 200) {
        pass('PHASE 14', `Cash book accounts: ${JSON.stringify(cbAccts.body).substring(0, 120)}...`);
        // Get cash book entries for the first cash account
        const accounts = Array.isArray(cbAccts.body) ? cbAccts.body : [];
        if (accounts.length > 0) {
          const cashAccountId = accounts[0].id || accounts[0].accountId;
          const cb = await req('GET', `/api/cash-book?accountId=${cashAccountId}&startDate=2025-01-01&endDate=2026-12-31`, null, cookies.ADMIN);
          if (cb.status === 200) pass('PHASE 14', 'Cash book entries loaded');
          else fail('PHASE 14', 'Cash book entries', `Status ${cb.status}`);
        } else {
          skip('PHASE 14', 'Cash book entries', 'No cash accounts found');
        }
      } else {
        fail('PHASE 14', 'Cash book accounts', `Status ${cbAccts.status}`);
      }
    } catch (e) { fail('PHASE 14', 'Cash book', e.message); }

    // ─── PHASE 15: Reports ────────────────────────────────────
    console.log('\n--- PHASE 15: Reports ---');
    const dateParams = '?startDate=2025-01-01&endDate=2026-12-31';
    for (const [name, ep] of [
      ['Trial Balance', `/api/reports/trial-balance${dateParams}`],
      ['Balance Sheet', `/api/reports/balance-sheet${dateParams}`],
      ['Profit & Loss', `/api/reports/profit-and-loss${dateParams}`],
      ['General Ledger', `/api/ledger${dateParams}`],
    ]) {
      try {
        const r = await req('GET', ep, null, cookies.ADMIN);
        if (r.status === 200) pass('PHASE 15', `${name} loaded`);
        else fail('PHASE 15', `${name}`, `Status ${r.status} ${JSON.stringify(r.body).substring(0, 100)}`);
      } catch (e) { fail('PHASE 15', `${name}`, e.message); }
    }

    // ─── PHASE 16: Bills ──────────────────────────────────────
    console.log('\n--- PHASE 16: Bills ---');
    try {
      const b = await req('GET', '/api/bills', null, cookies.ADMIN);
      if (b.status === 200) pass('PHASE 16', 'Bills list loaded');
      else fail('PHASE 16', 'Bills list', `Status ${b.status}`);
    } catch (e) { fail('PHASE 16', 'Bills list', e.message); }

    // ─── PHASE 17: RBAC — Role-Based Access Control ───────────
    console.log('\n--- PHASE 17: RBAC Enforcement ---');
    // Clerk should NOT be able to create accounts
    if (cookies.CLERK) {
      try {
        const r = await req('POST', '/api/accounts', {
          code: '99999',
          name: 'UAT Test Account',
          type: 'EXPENSE',
        }, cookies.CLERK);
        if (r.status === 403) pass('PHASE 17', 'Clerk blocked from creating accounts (403)');
        else fail('PHASE 17', 'Clerk should be blocked from creating accounts', `Status ${r.status}`);
      } catch (e) { fail('PHASE 17', 'RBAC test', e.message); }
    } else {
      skip('PHASE 17', 'RBAC test', 'No clerk cookie');
    }

    // Manager should be able to create sales
    if (cookies.MANAGER) {
      try {
        const r = await req('GET', '/api/sales', null, cookies.MANAGER);
        if (r.status === 200) pass('PHASE 17', 'Manager can read sales');
        else fail('PHASE 17', 'Manager should read sales', `Status ${r.status}`);
      } catch (e) { fail('PHASE 17', 'Manager sales read', e.message); }
    }

    // ─── PHASE 18: Tenant Isolation ────────────────────────────
    console.log('\n--- PHASE 18: Tenant Isolation ---');
    // Login as admin for tenant-demo-distribution-002
    let distCookie;
    try {
      const login = await req('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123',
        tenantId: 'tenant-demo-distribution-002',
      });
      if (login.status === 200 && login.cookie) {
        distCookie = login.cookie;
        pass('PHASE 18', 'Login to distribution-002 succeeded');
      } else {
        fail('PHASE 18', 'Login to distribution-002', `Status ${login.status}`);
      }
    } catch (e) { fail('PHASE 18', 'Login to distribution-002', e.message); }

    if (distCookie) {
      // Try to create a sale — should be isolated to distribution-002
      try {
        const r = await req('GET', '/api/customers', null, distCookie);
        if (r.status === 200) {
          pass('PHASE 18', 'Distribution-002 can read its own customers');
        } else {
          fail('PHASE 18', 'Distribution-002 customers', `Status ${r.status}`);
        }
      } catch (e) { fail('PHASE 18', 'Distribution-002 customers', e.message); }
    }

    // ─── PHASE 19: Logout + Session Invalidation ───────────────
    console.log('\n--- PHASE 19: Logout + Session Invalidation ---');
    let logoutCookie;
    try {
      const lo = await req('POST', '/api/auth/logout', {}, cookies.ADMIN);
      if (lo.status === 200) {
        logoutCookie = lo.cookie; // Should be cleared
        pass('PHASE 19', 'Logout succeeded');
      } else {
        fail('PHASE 19', 'Logout', `Status ${lo.status}`);
      }
    } catch (e) { fail('PHASE 19', 'Logout', e.message); }

    // Try accessing protected route after logout — should fail
    try {
      const r = await req('GET', '/api/sales', null, cookies.ADMIN);
      if (r.status === 401) pass('PHASE 19', 'Session invalidated after logout (401)');
      else fail('PHASE 19', 'Session should be invalid after logout', `Status ${r.status}`);
    } catch (e) { fail('PHASE 19', 'Session invalidation', e.message); }

    // ─── PHASE 20: Frontend Refresh Regression ─────────────────
    console.log('\n--- PHASE 20: Frontend Refresh Regression ---');
    // SPA routes should all return index.html
    let spaOk = true;
    for (const route of ['/', '/login', '/dashboard', '/finance', '/inventory', '/settings']) {
      try {
        const r = await req('GET', route);
        if (r.status !== 200 || (typeof r.body === 'string' && !r.body.includes('id="root"'))) {
          spaOk = false;
          fail('PHASE 20', `SPA refresh regression: ${route}`, `Status ${r.status}`);
        }
      } catch (e) { fail('PHASE 20', `SPA refresh: ${route}`, e.message); spaOk = false; }
    }
    if (spaOk) pass('PHASE 20', 'All SPA routes return index.html correctly');

  } catch (e) {
    fail('GLOBAL', 'Unexpected error', e.message);
  } finally {
    // ─── SHUTDOWN ──────────────────────────────────────────────
    console.log('\n--- SHUTDOWN ---');
    serverProc.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 2000));
    serverProc.kill('SIGKILL');
  }

  // ─── SUMMARY ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('  UAT SUMMARY');
  console.log('='.repeat(70));
  console.log(`  ✅ Passed:   ${passed}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  ⏭️  Skipped:  ${skipped}`);
  console.log(`  Total:       ${passed + failed + skipped}`);
  console.log('='.repeat(70));
  
  if (failed > 0) {
    console.log('\n  FAILURES:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    - [${r.phase}] ${r.name}: ${r.error}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

run();
