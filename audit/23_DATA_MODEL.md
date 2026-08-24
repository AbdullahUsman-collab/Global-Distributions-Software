# 23 — DATA MODEL

## Inferred Database Schema

### Table: Main_Heads
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Main_Head_No | INT | PK | Unique code |
| Main_Head_Name | VARCHAR | | Category name |
| Effect | VARCHAR | | Balance Sheet / Profit and Loss / Both |
| SP_ID | INT | FK | Sale Man ID (0 = none) |
| SP_Name | VARCHAR | | Sale Man name (denormalized) |
| Day | VARCHAR | | Day assignment |

### Table: Accounts
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Ac_No | INT | PK | Account number |
| Ac_Name | VARCHAR | | Account/party name |
| Address | VARCHAR | | Physical address |
| owner_name | VARCHAR | | Owner name |
| phone | VARCHAR | | Phone number |
| STN | VARCHAR | | Sales Tax Number |
| NTN | VARCHAR | | National Tax Number |
| CNIC | VARCHAR | | CNIC |
| Main_HeadNo | INT | FK | References Main_Heads |
| approval | VARCHAR | | Approval reference |

### Table: Item_Super_Heads
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| SH_No | INT | PK | Super Head number |
| SH_Name | VARCHAR | | Super Head name |

### Table: Item_Main_Heads
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Item_MainHeadNo | INT | PK | Main Head number |
| Item_MainHeadName | VARCHAR | | Main Head name |
| SH_No | INT | FK | References Item_Super_Heads |

### Table: Items
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Item_No | INT | PK | Item number |
| Item_Name | VARCHAR | | Product name |
| Item_MainHeadNo | INT | FK | References Item_Main_Heads |
| Units | VARCHAR | | Unit of measure |
| Pcs_PerCtn | INT | | Pieces per carton |
| Sale_Rate | DECIMAL | | Selling price |
| Purchase_Rate | DECIMAL | | Purchase/cost price |
| Retail_Price | DECIMAL | | MRP |
| Trade_Disc | DECIMAL | | Trade discount % |
| T_O | INT | | Trade offer |
| Min_Qty | INT | | Minimum order quantity |
| hs_code | VARCHAR | | HS code |
| gst_type | VARCHAR | | VAT / 3RD / 8TH |
| gst | DECIMAL | | GST % |
| fed | DECIMAL | | FED % |
| adv_tax_purchase | DECIMAL | | Advance tax purchase % |
| adv_tax_sale | DECIMAL | | Advance tax sale % |
| Cost_rate | DECIMAL | | Calculated cost (stored) |

### Table: Sale_Men
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Sale_Man | INT | PK | Salesman ID |
| Name | VARCHAR | | Salesman name |

### Table: Vouchers
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Voucher_No | INT | PK | Auto-generated |
| Voucher_Type | VARCHAR | | JV/CV/PV/CP/CR |
| E_Date | DATE | | Entry date |
| UserName | VARCHAR | | Created by |

### Table: Voucher_Lines
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Voucher_No | INT | FK | References Vouchers |
| S_No | INT | | Line number |
| Acc_No | INT | FK | Account number |
| Description | VARCHAR | | Narration |
| Acc_No2 | INT | FK | Reference/contra account |
| Debit | DECIMAL | | Debit amount |
| Credit | DECIMAL | | Credit amount |
| ST_InvNo | VARCHAR | | ST Invoice # |
| ST_Rate | DECIMAL | | ST Rate |
| ST_Amount | DECIMAL | | ST Amount |
| Amt_Excl_Std | DECIMAL | | Amount excl ST |

### Table: Bills
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Voucher_No | INT | PK | Auto-generated |
| Voucher_Type | VARCHAR | | SV/PV/SRV/PRV |
| E_Date | DATE | | Bill date |
| SP_ID | INT | FK | Sale Man |
| Acc_No | INT | FK | Party account |
| Ref_Acc_No | INT | FK | Stock account |
| Description | VARCHAR | | Narration |
| Day | VARCHAR | | Day of week |
| NTN | VARCHAR | | Customer NTN |
| CNIC | VARCHAR | | Customer CNIC |
| Approval | VARCHAR | | Approval ref |
| UserName | VARCHAR | | Created by |
| Vehicle_no | VARCHAR | | Vehicle number |

### Table: Bill_Lines
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| Voucher_No | INT | FK | References Bills |
| Sr_No | INT | | Line number |
| Item_No | INT | FK | References Items |
| Cartons | INT | | Carton quantity |
| Packs | INT | | Piece quantity |
| Rate | DECIMAL | | Sale/purchase rate |
| Trade_Disc | DECIMAL | | Trade discount % |
| TO | INT | | Trade offer |
| ST% | DECIMAL | | Sales tax % |
| F-ST% | DECIMAL | | Further ST % |
| FED% | DECIMAL | | FED % |
| ADV% | DECIMAL | | Advance tax % |
| Amount | DECIMAL | | Line base amount |
| Disc_Amount | DECIMAL | | Discount amount |
| To_Amt | DECIMAL | | After discount |
| GST_Amount | DECIMAL | | GST amount |
| FT_Amount | DECIMAL | | Further tax |
| FED_Amount | DECIMAL | | FED amount |
| ADV_Amount | DECIMAL | | ADV tax |
| Net_Amount | DECIMAL | | Net amount |

### Table: Users
| Column | Type | Key | Description |
|--------|------|-----|-------------|
| UserName | VARCHAR | PK | Login name |
| Password | VARCHAR | | Hashed password |
| Role | VARCHAR | | User role |

## Relationships Diagram
```
Main_Heads ──1:M── Accounts
Item_Super_Heads ──1:M── Item_Main_Heads
Item_Main_Heads ──1:M── Items
Sale_Men ──1:M── Bills
Accounts ──1:M── Vouchers (Acc_No)
Accounts ──1:M── Bills (Acc_No)
Items ──1:M── Bill_Lines
Vouchers ──1:M── Voucher_Lines
Bills ──1:M── Bill_Lines
```
