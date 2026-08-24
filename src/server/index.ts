/**
 * Local Development Server
 * Demonstrates the domain foundation with mock adapters.
 * 
 * DEVELOPMENT ONLY - For testing and verification.
 */

import http from 'http';
import { MockTenantAdapter } from '../domain/adapters/mock/MockTenantAdapter';
import { MockUserAdapter } from '../domain/adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter } from '../domain/adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter } from '../domain/adapters/mock/MockSessionAdapter';
import { MockAuthService } from '../domain/adapters/mock/MockAuthService';

// Initialize mock adapters
const tenantAdapter = new MockTenantAdapter();
const userAdapter = new MockUserAdapter();
const credentialsAdapter = new MockUserCredentialsAdapter();
const sessionAdapter = new MockSessionAdapter();
const authService = new MockAuthService(
  tenantAdapter,
  userAdapter,
  credentialsAdapter,
  sessionAdapter
);

// Simple in-memory session store for demo
const activeSessions: Map<string, { userId: string; tenantId: string }> = new Map();

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route handling
  if (url.pathname === '/' && req.method === 'GET') {
    // Home page with API documentation
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Distribution Software ERP - Domain Foundation</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #1e40af; }
          h2 { color: #047857; margin-top: 30px; }
          .endpoint { background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .method { font-weight: bold; color: #7c3aed; }
          code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; }
          .success { color: #047857; }
          .error { color: #dc2626; }
          button { background: #1e40af; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
          button:hover { background: #1e3a8a; }
          #result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Distribution Software ERP</h1>
        <p>Domain Foundation - Local Development Server</p>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
          <p><span class="method">GET</span> <code>/api/tenants</code> - List all active tenants</p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> <code>/api/auth/login</code> - Authenticate user</p>
          <p>Body: <code>{ "username": "admin", "password": "admin123", "tenantId": "tenant-demo-wholesale-001" }</code></p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> <code>/api/auth/validate</code> - Validate session</p>
          <p>Body: <code>{ "sessionId": "..." }</code></p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> <code>/api/auth/logout</code> - End session</p>
          <p>Body: <code>{ "sessionId": "..." }</code></p>
        </div>
        
        <h2>Interactive Demo</h2>
        <p>Click buttons to test the authentication flow:</p>
        
        <button onclick="listTenants()">1. List Tenants</button>
        <button onclick="loginAdmin()">2. Login as Admin</button>
        <button onclick="loginManager()">3. Login as Manager</button>
        <button onclick="loginInactive()">4. Login as Inactive User</button>
        <button onclick="loginWrongPassword()">5. Login with Wrong Password</button>
        
        <div id="result"></div>
        
        <script>
          let currentSessionId = null;
          
          async function listTenants() {
            const res = await fetch('/api/tenants');
            const data = await res.json();
            showResult('Tenants:', data);
          }
          
          async function loginAdmin() {
            await doLogin('admin', 'admin123', 'tenant-demo-wholesale-001');
          }
          
          async function loginManager() {
            await doLogin('manager', 'manager123', 'tenant-demo-wholesale-001');
          }
          
          async function loginInactive() {
            await doLogin('former', 'former123', 'tenant-demo-wholesale-001');
          }
          
          async function loginWrongPassword() {
            await doLogin('admin', 'wrongpassword', 'tenant-demo-wholesale-001');
          }
          
          async function doLogin(username, password, tenantId) {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password, tenantId })
            });
            const data = await res.json();
            if (data.success) {
              currentSessionId = data.session.sessionId;
            }
            showResult('Login Result:', data);
          }
          
          function showResult(title, data) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<strong>' + title + '</strong><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            resultDiv.style.background = data.success ? '#d1fae5' : '#fee2e2';
          }
        </script>
      </body>
      </html>
    `);
  } else if (url.pathname === '/api/tenants' && req.method === 'GET') {
    // List tenants
    const tenants = await tenantAdapter.getPublicTenants();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tenants, null, 2));
  } else if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    // Login
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { username, password, tenantId } = JSON.parse(body);
        const result = await authService.authenticate({ username, password, tenantId });
        if (result.success) {
          activeSessions.set(result.session.sessionId, {
            userId: result.user.id,
            tenantId: result.session.tenantId
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
      }
    });
  } else if (url.pathname === '/api/auth/validate' && req.method === 'POST') {
    // Validate session
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { sessionId } = JSON.parse(body);
        const session = await authService.validateSession(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: !!session, session }, null, 2));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, error: 'Invalid request body' }));
      }
    });
  } else if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    // Logout
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { sessionId } = JSON.parse(body);
        const result = await authService.logout(sessionId);
        activeSessions.delete(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: result }, null, 2));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
      }
    });
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Distribution Software ERP - Domain Foundation Server       ║
║  Running on http://localhost:${PORT}                          ║
║                                                              ║
║  Endpoints:                                                  ║
║  - GET  /              Home page with API docs               ║
║  - GET  /api/tenants   List all active tenants               ║
║  - POST /api/auth/login    Authenticate user                 ║
║  - POST /api/auth/validate Validate session                  ║
║  - POST /api/auth/logout   End session                       ║
║                                                              ║
║  Mock Credentials:                                           ║
║  - admin/admin123 (Demo Wholesale)                           ║
║  - manager/manager123 (Demo Wholesale)                       ║
║  - clerk/clerk123 (Demo Wholesale)                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
