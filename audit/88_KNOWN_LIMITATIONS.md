# 88 — KNOWN LIMITATIONS

## Stock Validation & Atomicity Gaps

### 1. Insufficient stock check scope (low priority)
**What:** Sales validate stock before posting. Purchase Returns (PRV) do not.
**Impact:** A PRV could push a product negative if stock is insufficient at the time of return.
**Why not fixed:** Matches legacy ERP behavior; PRVs are rare and typically processed against known received stock.
**Fix:** Add same `sum(quantityOnHand)` validation in `PurchaseReturnService.postPurchaseReturnBill`.

### 2. Sale voucher ↔ stock movement atomicity gap (low priority)
**What:** `SalesService.postSaleBill` validates stock, creates voucher + ISSUE movements, then posts. If the serverless function crashes between creating movements and posting the voucher, stock levels will be decremented while the voucher stays DRAFT (not posted to GL).
**Impact:** Stock count and GL are temporarily out of sync. Both sides are in DRAFT state, so no inconsistent posted entries exist — but manual cleanup would be needed to delete the orphaned DRAFT voucher + movements.
**Why not fixed:** True atomicity requires a PostgreSQL transaction spanning voucher + inventory tables, which the current repository interface doesn't expose. The crash window is milliseconds within a single Vercel serverless function invocation.
**Fix (future):** Introduce a transaction wrapper or outbox pattern. Larger architectural decision.
