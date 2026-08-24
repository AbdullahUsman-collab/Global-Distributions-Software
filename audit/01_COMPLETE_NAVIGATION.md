# 01 — COMPLETE NAVIGATION MAP

## Navigation Architecture

The application uses a horizontal CSS-based menu with 6 top-level modules, each containing submenus. Menu items use ASP.NET PostBack for server-side navigation.

### Navigation Menu Structure

```
Global Distribution Services (MotherCare) — Mothercare Distributors
├── 1. ADD (Master Data)
│   ├── 1.1 Accounts Main Head → MainHeads.aspx
│   ├── 1.2 Accounts → Accounts.aspx
│   ├── 1.3 Item Super Heads → ItemSuperHead.aspx
│   ├── 1.4 Items Main Head → ItemMainHeads.aspx
│   ├── 1.5 Items → Items.aspx
│   ├── 1.6 Sale Man → Sale_Man.aspx
│   ├── 1.7 Delete Item and Transfer Data → DelItem.aspx
│   ├── 1.8 Delete A/c and Shift Data → DelAccount.aspx
│   └── 1.9 Change Area of a Party → AcTransfer.aspx
│
├── 2. ENTRIES
│   ├── 2.1 Journal Entry → Journal.aspx
│   ├── 2.2 Cash Book → Cash_Book.aspx
│   └── 2.3 Entries List → JournalEntriesList.aspx
│
├── 3. REPORTS
│   ├── 3.1 Ledger → Ledger.aspx
│   ├── 3.2 Trail Balance → TrailBalance.aspx
│   ├── 3.3 Trail Balance With Activity → TrailBWA.aspx
│   ├── 3.4 Balance Sheet / Profit and Loss → BalanceSheet.aspx
│   └── 3.5 Aging Report → Aging.aspx
│
├── 4. BILLS
│   ├── 4.1 Sale/Purchase Bill → Sale_Purchase.aspx
│   └── 4.2 List of Bills → ListofBills.aspx
│
├── 5. STOCK
│   ├── 5.1 Item Ledger → ItemLedger.aspx
│   ├── 5.2 Stock Balance → StockBalance.aspx
│   └── 5.3 Stock Balance With Activity → StockBWA.aspx
│
└── 6. UTILITIES
    ├── 6.1 Create New User → (PostBack: "Utilities\Create New User")
    ├── 6.2 Change Password → ChangePassword.aspx
    └── 6.3 Log out → Default.aspx
```

### Page-to-Module Mapping

| # | Page | Module | Submodule | URL |
|---|------|--------|-----------|-----|
| 1 | Login | System | Authentication | Default.aspx |
| 2 | Home Page | System | Dashboard | MainPage.aspx |
| 3 | Accounts Main Head | Add | Financial Masters | MainHeads.aspx |
| 4 | Accounts | Add | Financial Masters | Accounts.aspx |
| 5 | Item Super Heads | Add | Product Masters | ItemSuperHead.aspx |
| 6 | Items Main Head | Add | Product Masters | ItemMainHeads.aspx |
| 7 | Items | Add | Product Masters | Items.aspx |
| 8 | Sale Man | Add | Distribution Masters | Sale_Man.aspx |
| 9 | Delete Item | Add | Data Maintenance | DelItem.aspx |
| 10 | Delete Account | Add | Data Maintenance | DelAccount.aspx |
| 11 | Account Transfer | Add | Data Maintenance | AcTransfer.aspx |
| 12 | Journal Entry | Entries | Voucher Entry | Journal.aspx |
| 13 | Cash Book | Entries | Cash Entry | Cash_Book.aspx |
| 14 | Entries List | Entries | Voucher Reports | JournalEntriesList.aspx |
| 15 | Sale/Purchase Bill | Bills | Invoice Entry | Sale_Purchase.aspx |
| 16 | List of Bills | Bills | Invoice Reports | ListofBills.aspx |
| 17 | Ledger | Reports | Account Reports | Ledger.aspx |
| 18 | Trial Balance | Reports | Financial Reports | TrailBalance.aspx |
| 19 | Trial Balance WA | Reports | Financial Reports | TrailBWA.aspx |
| 20 | Balance Sheet / P&L | Reports | Financial Statements | BalanceSheet.aspx |
| 21 | Aging Report | Reports | Receivable Reports | Aging.aspx |
| 22 | Item Ledger | Stock | Stock Reports | ItemLedger.aspx |
| 23 | Stock Balance | Stock | Stock Reports | StockBalance.aspx |
| 24 | Stock Balance WA | Stock | Stock Reports | StockBWA.aspx |
| 25 | Change Password | Utilities | User Management | ChangePassword.aspx |

### Navigation Behaviors

- **Top-level menu items** use CSS popout menus (appear on hover, disappearAfter: 500ms)
- **Entries, Reports, Bills, Stock, Utilities** submenus trigger `__doPostBack` server-side events
- **Add** submenu items navigate directly via href links
- **Back buttons** on every form navigate to MainPage.aspx
- **No breadcrumb navigation** — flat hierarchy
- **No tab navigation** — each screen is a separate page
- **Session-based authentication** — redirects to login on session expiry

### Entry Points

- **Primary entry:** Login page (Default.aspx)
- **After login:** MainPage.aspx (dashboard with navigation menu)
- **No deep linking** — all pages require authenticated session
- **No URL parameters** — state managed via ViewState and PostBack

### Exit Points

- **Logout:** Returns to Default.aspx (login page)
- **Back button:** Returns to MainPage.aspx from any form
- **No confirmation dialogs** observed for navigation away from unsaved data
