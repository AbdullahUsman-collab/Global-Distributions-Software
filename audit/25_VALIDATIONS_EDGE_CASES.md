# 25 — VALIDATIONS AND EDGE CASES

## Observed Validations

### Login
- Username and password required
- Invalid credentials show error message
- Session created on success

### Main Heads
- Head # required (numeric)
- Name required
- Effect selection required

### Accounts
- Account # required
- Account Name required
- Main Head selection required

### Items
- Item # required
- Item Name required
- Category required
- Rates required (purchase, sale, retail)

### Voucher Entry
- Voucher type required
- Date required
- Account required
- At least one line entry
- Debit must equal Credit for balanced entry

### Bill Entry
- Voucher type required
- Date required
- Party account required
- At least one line item
- Item selection required
- Quantity required

## Validations NOT Observed (Unknown)

### Data Integrity
- Duplicate account number handling
- Duplicate item number handling
- Referential integrity enforcement
- Required field enforcement level

### Financial
- Negative stock allowed?
- Zero quantity allowed?
- Zero rate allowed?
- Credit limit enforcement
- Credit days enforcement
- Date range validation
- Period lock enforcement

### Business Rules
- Return quantity limited to original sale?
- Return rate must match original?
- Bill editing after posting
- Approval workflow
- Concurrent access handling

## Edge Cases NOT Tested
- Very large quantities
- Very large amounts
- Special characters in names
- Very long descriptions
- Multiple currency transactions
- Zero-value transactions
- Self-referencing accounts
- Circular references
