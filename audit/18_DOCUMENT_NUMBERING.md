# 18 — DOCUMENT NUMBERING

## Observed Numbering

### Voucher Numbers
- Journal.aspx: txtvno field — auto-generated on "New Voucher" click
- Cash_Book.aspx: txtvno field — auto-generated
- Sale_Purchase.aspx: txtvno field — auto-generated on "New Bill" click

### Numbering Pattern (Inferred)
- Sequential within voucher type
- Likely prefixed by voucher type (e.g., JV-001, SV-001)
- Reset annually or continuous (UNKNOWN)

### Account Numbers
- Accounts.aspx: txtacno — appears manually entered or auto-generated
- MainHeads.aspx: txtmhno — manually entered codes (1, 100, 200, etc.)

### Item Numbers
- Items.aspx: txtIemNo — appears manually entered
- ItemMainHeads.aspx: txtITHNo — manually entered codes
- ItemSuperHead.aspx: txtSHNo — manually entered codes

### Sale Man Numbers
- Sale_Man.aspx: txtmhno — manually entered IDs (6, 7, 8, 9)

## Numbering Characteristics
| Entity | Format | Reset | Manual Override |
|--------|--------|-------|-----------------|
| Voucher # | Numeric | Unknown | No (auto-generated) |
| Bill # | Numeric | Unknown | No (auto-generated) |
| Account # | Numeric | No | Yes (entered on creation) |
| Item # | Numeric | No | Yes (entered on creation) |
| Main Head # | Numeric | No | Yes (entered on creation) |

## Areas NOT VERIFIED
- Whether numbering resets per financial year
- Whether prefixes are used
- Whether duplicate detection exists
- Numbering format configuration
