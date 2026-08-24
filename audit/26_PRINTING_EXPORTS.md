# 26 — PRINTING AND EXPORTS

## Print Functions

### Bill Print
- **Button:** bttnPrint on Sale_Purchase.aspx
- **Output:** Invoice document (format unknown — likely SSRS or custom print)
- **Content (Inferred):** Company header, Invoice #, Date, Party, Items, Amounts, Taxes, Totals

### Voucher Print
- **Button:** bttnPrint on Journal.aspx
- **Output:** Voucher document
- **Content (Inferred):** Voucher #, Date, Account details, Debit/Credit, Narration

### Cash Book Print
- **Button:** bttnPrint on Cash_Book.aspx
- **Output:** Cash book statement

### Account List Print
- **Button:** bttnPrint on Accounts.aspx
- **Output:** List of accounts

### Item List Print
- **Button:** bttnPrint on Items.aspx
- **Output:** List of items

## Export Functions (SSRS Reports)
All SSRS reports support:
- **Excel** (XLS/XLSX)
- **PDF**
- **Word** (DOC/DOCX)

Available on: Ledger, Trial Balance, Balance Sheet, P&L, Aging, Entries List, List of Bills, Item Ledger, Stock Balance

## Print Format
**UNKNOWN** — Report templates are server-side SSRS files, not accessible via scraping.

## Areas NOT VERIFIED
- Custom print format layout
- Whether thermal printer is supported
- Whether print preview exists
- Whether bulk printing exists
- Whether email sending exists
