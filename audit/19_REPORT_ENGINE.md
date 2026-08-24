# 19 — REPORT ENGINE

## Report Technology
**SSRS (SQL Server Reporting Services)** — ReportViewer web control (version 12.0.0.0)

## Report Navigation Pattern
All reports follow the same pattern:
1. Filter screen with input fields
2. "Refresh" button to load report
3. SSRS ReportViewer renders the report
4. Toolbar: Pagination, Search, Export (Excel, PDF, Word)

## Complete Report Inventory

### Financial Reports
| # | Report | Page | Filters | Output |
|---|--------|------|---------|--------|
| 1 | Account Ledger | Ledger.aspx | Account, Type (Normal/Sales Tax), Date Range | Transaction list with balance |
| 2 | Trial Balance | TrailBalance.aspx | Account range, Date range, Main Head | Debit/Credit totals |
| 3 | Trial Balance With Activity | TrailBWA.aspx | Account range, Date range, Main Head | Detailed activity |
| 4 | Balance Sheet | BalanceSheet.aspx | Account range, Date Range | Assets = Liabilities + Equity |
| 5 | Profit & Loss | BalanceSheet.aspx | Account range, Date Range | Income - Expenses |
| 6 | Aging Report | Aging.aspx | Account range, Date, Main Head | Outstanding by age |

### Distribution Reports
| # | Report | Page | Filters | Output |
|---|--------|------|---------|--------|
| 7 | Entries List | JournalEntriesList.aspx | Voucher Type, Date Range | All vouchers |
| 8 | List of Bills | ListofBills.aspx | Voucher Type, Date, Party, Item, Sale Man | All bills |
| 9 | Item Ledger | ItemLedger.aspx | Item, Date Range | Item transactions |
| 10 | Stock Balance | StockBalance.aspx | Item Range, Date Range | Current stock |
| 11 | Stock Balance With Activity | StockBWA.aspx | Item Range, Date Range | Stock with movements |

## Report Parameters Detail

### Ledger Report
| Parameter | Field | Type |
|-----------|-------|------|
| Account Name | TxtAcName | Autocomplete |
| Account # | txtacno | Text |
| Type | DDLType | Dropdown: Normal, Sales Tax |
| From Date | txtDate1 | Date |
| To Date | txtDate2 | Date |
| Search By A/c# | txtacno2 | Text |

### Trial Balance
| Parameter | Field | Type |
|-----------|-------|------|
| From A/c# | txtAcNo1 | Text |
| To A/c# | TxtAcNo2 | Text |
| From Date | txtDate1 | Date |
| To Date | txtDate2 | Date |
| Main Head | cmbacname | Dropdown |
| Main Head # | txtMHNo | Hidden |

### Aging Report
| Parameter | Field | Type |
|-----------|-------|------|
| From A/c# | txtAcNo1 | Text |
| To A/c# | TxtAcNo2 | Text |
| To Date | txtDate1 | Date |
| Main Head | cmbacname | Dropdown |
| Main Head # | txtMHNo | Hidden |

### Balance Sheet / P&L
| Parameter | Field | Type |
|-----------|-------|------|
| From A/c# | txtAcNo1 | Text |
| To A/c# | TxtAcNo2 | Text |
| From Date | txtDate1 | Date |
| To Date | txtDate2 | Date |

## Export Options
- Excel (XLS/XLSX)
- PDF
- Word (DOC/DOCX)

## Report Limitations (Observed)
- SSRS ReportViewer requires script support (error observed: "Your browser does not support scripts")
- Reports are server-rendered — content not accessible via HTML scraping
- Report parameters toggled via UI button
