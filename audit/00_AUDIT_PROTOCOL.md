# AUDIT PROTOCOL — COMPLETE READ-ONLY REVERSE ENGINEERING
## Wholesale Distribution + Financial ERP

### Target Application
- **URL:** http://38.92.47.89:8026/
- **Technology:** ASP.NET WebForms (.NET Framework 4.x), SQL Server, SSRS Report Viewer 12.0
- **Application Name:** Global Distribution Services (MotherCare) - Mothercare Distributors

### Audit Methodology
1. **READ-ONLY** — No data was modified in the existing system
2. **HTML scraping** via PowerShell `Invoke-WebRequest` with session management
3. **Form element extraction** via regex pattern matching on raw HTML
4. **Functional inference** from UI elements, field names, button behaviors, and navigation structure
5. **Data privacy** — Actual company data replaced with generic placeholders in documentation

### Verification Classification
Every finding is classified as:
- **OBSERVED_UI** — Directly visible in the application UI
- **OBSERVED_BEHAVIOR** — Behavior observed through safe read-only interaction
- **OBSERVED_API** — API/PostBack behavior observed
- **INFERRED** — Logically inferred from UI/behavior but not directly verified
- **UNKNOWN** — Could not be determined in read-only mode

### Scope
- 6 major modules: Add (Master Data), Entries, Reports, Bills, Stock, Utilities
- 25 accessible pages/forms
- Complete navigation map
- All form fields, buttons, dropdowns, grids documented
- Accounting engine behavior inferred from field names and voucher types
- Tax/discount calculations inferred from field structures
- Inventory behavior inferred from stock module fields

### Limitations
- SSRS reports render server-side; actual report content not accessible via scraping
- Some PostBack behaviors require JavaScript execution (not available in scraping)
- Actual database schema not directly accessible
- Business logic behind button clicks not directly observable without mutation
- Some validation rules could not be tested without data modification

### Files Produced
- 00 through 30 audit files
- MASTER_REVERSE_ENGINEERED_SPEC.md — Consolidated specification
