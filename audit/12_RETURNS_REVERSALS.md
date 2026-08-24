# 12 — RETURNS / CANCELLATIONS / REVERSALS

## Sale Return (SRV)
**Entry Point:** Sale_Purchase.aspx with cmbvtype = SRV
**Purpose:** Customer returns previously sold goods

**Effect:**
- Increases stock (items returned to inventory)
- Decreases customer receivable
- Reverses the original sale accounting entries

**NOT VERIFIED:**
- Whether original invoice reference is required
- Whether return quantity is limited to original sale quantity
- Whether return rate must match original rate
- Whether return creates credit note

## Purchase Return (PRV)
**Entry Point:** Sale_Purchase.aspx with cmbvtype = PRV
**Purpose:** Return goods to supplier

**Effect:**
- Decreases stock
- Decreases supplier payable
- Reverses purchase accounting entries

## Invoice Cancellation
**NOT OBSERVED** — No cancel button on bill form. Only "Delete Bill" exists.

**Delete Bill behavior (Inferred):**
- Removes the bill record and all line items
- Reverses all accounting entries
- Reverses stock movements
- NOT VERIFIED — requires write access to confirm

## Payment Reversal
**NOT OBSERVED** — No explicit reversal function. May require journal entry adjustment.

## Journal Reversal
**NOT OBSERVED** — "Delete Voucher" exists on Journal.aspx. Effect unknown without write access.

## Correction Method (Inferred)
- Errors corrected via manual journal entries (JV type)
- Or via delete-and-recreate of original transaction
- No systematic reversal workflow observed

## Areas NOT VERIFIED
- Whether deleted transactions are soft-deleted or hard-deleted
- Whether audit trail exists for deletions
- Whether approval is required for reversals
- Whether stock is re-incremented on return
