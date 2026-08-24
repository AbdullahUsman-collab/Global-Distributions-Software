# 03 — MASTER DATA

## Financial Masters

### Account Main Heads (Main_Heads)
**Purpose:** Top-level categories for the Chart of Accounts
**Fields:** Main_Head_No (PK, numeric), Main_Head_Name (text), Effect (Balance Sheet|Profit and Loss|Both), SP_ID (FK to Sale_Men, 0=none), SP_Name (text), Day (text)

**Observed Categories:**
| Code | Name | Effect |
|------|------|--------|
| 1 | CASH AND BANK | Balance Sheet |
| 100 | ASSETS | Balance Sheet |
| 200 | CAPITAL | Balance Sheet |
| 250 | FIX ASSET | Balance Sheet |
| 400 | STAFF ACCOUNTS | Balance Sheet |
| 500 | DEBITORS | Balance Sheet |
| 1000 | INTERNATIONAL CONSUMER PRODUCTS | Balance Sheet |
| 1500 | EXPENSES | Profit and Loss |
| 1600 | INCOME | Profit and Loss |
| 8000 | BUSINESS PARTIES | Balance Sheet |

**Inferred Hierarchy:**
- Balance Sheet accounts: Assets, Liabilities, Equity
- Profit and Loss accounts: Revenue, Expenses
- Each main head can optionally link to a salesman and a day

### Accounts (Accounts)
**Purpose:** Individual account records (parties, banks, cash, etc.)
**Fields:** Ac_No (PK), Ac_Name, Address, owner_name, phone, STN (Sales Tax No), NTN (National Tax No), CNIC, Main_HeadNo (FK to Main_Heads)

**Inferred Relationships:**
- Each account belongs to exactly one Main Head
- Accounts under DEBITORS (500) are customers
- Accounts under BUSINESS PARTIES (8000) are suppliers
- Accounts under CASH AND BANK (1) are cash/bank accounts
- Accounts under EXPENSES (1500) are expense accounts
- Accounts under INCOME (1600) are income accounts

---

## Product Masters

### Item Super Heads
**Purpose:** Highest level product category
**Fields:** SH_No (PK), SH_Name

**Observed:** Only one super head exists: "Mother Care"

### Item Main Heads
**Purpose:** Second-level product category (under Super Head)
**Fields:** Item_MainHeadNo (PK), Item_MainHeadName, SH_No (FK)

**Observed Categories:**
| Code | Name | Super Head |
|------|------|------------|
| 1 | Powder | 1 |
| 50 | Lotion | 1 |
| 100 | Gift Box | 1 |
| 150 | Shampoo | 1 |
| 190 | Pouch | 1 |
| 200 | Soap | 1 |
| 250 | OIL | 1 |
| 300 | Wipes | 1 |
| 400 | NEW SKUs | 1 |

### Items (Products)
**Purpose:** Individual product records
**Fields:** Item_No (PK), Item_Name, Item_MainHeadNo (FK), Units, Pcs_PerCtn, Sale_Rate, Purchase_Rate, Retail_Price, Trade_Disc, T_O, Min_Qty, hs_code, gst_type, gst, fed, adv_tax_purchase, adv_tax_sale, Cost_rate (calculated)

**Tax Types Observed:** VAT, 3RD, 8TH

---

## Distribution Masters

### Sale Men
**Purpose:** Salesman/delivery person records
**Fields:** Sale_Man (PK, numeric), Name

**Observed Records:** 4 salesmen with IDs 6-9

---

## System Masters

### Users
**Purpose:** System user accounts
**Observed:** Administrator user exists. Create New User available via Utilities menu.
**Fields (inferred):** Username, Password (hashed), Role, Created date

### Document Types (Inferred)
| Type | Code | Purpose |
|------|------|---------|
| Sale Voucher | SV | Sales invoice |
| Purchase Voucher | PV | Purchase invoice |
| Sale Return | SRV | Sales return |
| Purchase Return | PRV | Purchase return |
| Journal Voucher | JV | General journal |
| Cash Voucher | CV | Cash transaction |
| Payment Voucher | PV | Bank payment |
| Cash Payment | CP | Cash disbursement |
| Cash Receipt | CR | Cash receipt |

---

## Master Data Relationships

```
Main_Heads (1) ──── (Many) Accounts
Item_Super_Heads (1) ──── (Many) Item_Main_Heads
Item_Main_Heads (1) ──── (Many) Items
Sale_Men (1) ──── (Many) Bills (via cmbacname)
Accounts (1) ──── (Many) Voucher_Lines
Accounts (1) ──── (Many) Bills (party)
Items (1) ──── (Many) Bill_Lines
```

---

## Entities NOT Observed (Inferred/Unknown)

- **Warehouses/Locations** — No warehouse selection observed in forms. INFERRED: single-warehouse system or warehouse not tracked at form level.
- **Price Lists** — Only one price per item (Sale_Rate, Purchase_Rate, Retail_Price). No multi-price-list observed.
- **Customer Types/Categories** — No customer classification beyond Main Head grouping.
- **Payment Terms** — No credit days/credit limit fields observed on Accounts form.
- **Units of Measure** — cmbunits field exists but appears to be a simple text field (not a UOM master).
- **Batches/Lots** — No batch or lot tracking observed.
- **Currency** — Single currency (PKR inferred from context). No multi-currency support observed.
