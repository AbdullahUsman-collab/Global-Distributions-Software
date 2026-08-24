# 22 — API / NETWORK ARCHITECTURE

## Technology Stack
- **Frontend:** ASP.NET WebForms with server-side ViewState
- **Backend:** .NET Framework 4.x (C# or VB.NET)
- **Database:** SQL Server (inferred from SSRS)
- **Reporting:** SSRS Report Viewer 12.0
- **Session:** ASP.NET Session State (server-side)

## Communication Pattern
- **Form submissions:** HTTP POST with ViewState
- **PostBack mechanism:** `__doPostBack(eventTarget, eventArgument)`
- **No REST API observed** — All communication via WebForms PostBack
- **No AJAX/JSON observed** — Full page postbacks

## ViewState
- All page state managed via encrypted ViewState
- `__VIEWSTATE` — Encrypted page state
- `__VIEWSTATEGENERATOR` — Generator identifier
- `__EVENTVALIDATION` — Event validation hash
- `__PREVIOUSPAGE` — Navigation stack

## Network Characteristics
- No client-side routing
- No SPA (Single Page Application) behavior
- Full page reloads on every action
- Server-rendered HTML

## External Dependencies
- Microsoft.Reporting.WebForms (SSRS)
- WebResource.axd (scripts)
- ScriptResource.axd (scripts)

## Areas NOT VERIFIED
- Whether API endpoints exist behind the WebForms
- Whether there are any AJAX callbacks
- Whether SignalR or real-time communication exists
- Database connection string location
- Server configuration
