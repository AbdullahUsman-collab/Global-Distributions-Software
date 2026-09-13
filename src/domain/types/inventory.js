"use strict";
/**
 * Inventory Domain Types
 * Defines product, warehouse, stock level, and stock movement types.
 *
 * Source of Truth:
 *   - audit/23_DATA_MODEL.md (Items table, Bill_Lines)
 *   - audit/03_MASTER_DATA.md (Item hierarchy, Cost_rate)
 *   - audit/16_CALCULATIONS.md (Stock calculations, AVCO)
 *   - audit/65_LEGACY_COST_RATE_FORMULA_VERIFICATION.md (Cost_rate formula)
 *
 * OWNER-CONFIRMED COST_RATE FORMULA (verified against live legacy ERP):
 *   A = Purchase_Rate (Exclusive Tax Amount)
 *   B = Retail_Price (Inclusive Tax Amount)
 *   D = A × Margin
 *   E = B - D = Cost_rate
 *
 * Example (verified): Purchase_Rate=184.90, Retail_Price=203.39, Margin=0.072
 *   Cost_rate = 203.39 - 184.90 × 0.072 = 203.39 - 13.3128 = 190.0772
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOCK_MOVEMENT_STATUS_LABELS = exports.STOCK_MOVEMENT_TYPE_LABELS = void 0;
exports.calculateStockValue = calculateStockValue;
exports.calculateAVCO = calculateAVCO;
exports.calculateCOGS = calculateCOGS;
exports.calculateGrossProfit = calculateGrossProfit;
exports.calculateCostRate = calculateCostRate;
exports.calculateBillLineTax = calculateBillLineTax;
/* ─── Display Labels ───────────────────────────────────────── */
exports.STOCK_MOVEMENT_TYPE_LABELS = {
    GRN: 'Goods Received Note',
    ISSUE: 'Goods Issue',
    TRANSFER: 'Stock Transfer',
    ADJUSTMENT: 'Stock Adjustment',
    RETURN: 'Stock Return',
};
exports.STOCK_MOVEMENT_STATUS_LABELS = {
    DRAFT: 'Draft',
    POSTED: 'Posted',
    CANCELLED: 'Cancelled',
};
/* ─── Computed Helpers ─────────────────────────────────────── */
/**
 * Calculate stock value.
 * Source: audit/16_CALCULATIONS.md #21
 * Formula: Value = Quantity x Cost_Rate
 */
function calculateStockValue(quantity, unitCost) {
    return quantity * unitCost;
}
/**
 * Calculate AVCO (Average Cost) for incoming stock.
 * Source: audit/16_CALCULATIONS.md #24
 * Formula: New Cost = (Current Qty x Current Cost + Incoming Qty x Incoming Cost) / (Current Qty + Incoming Qty)
 */
function calculateAVCO(currentQty, currentCost, incomingQty, incomingCost) {
    const totalQty = currentQty + incomingQty;
    if (totalQty === 0)
        return 0;
    return (currentQty * currentCost + incomingQty * incomingCost) / totalQty;
}
/**
 * Calculate COGS (Cost of Goods Sold).
 * Source: audit/16_CALCULATIONS.md #22
 * Formula: COGS = Quantity_Sold x Cost_Rate
 */
function calculateCOGS(quantitySold, costRate) {
    return quantitySold * costRate;
}
/**
 * Calculate Gross Profit.
 * Source: audit/16_CALCULATIONS.md #23
 * Formula: Profit = Sale_Amount - COGS
 */
function calculateGrossProfit(saleAmount, cogs) {
    return saleAmount - cogs;
}
/**
 * Calculate Cost Rate from Purchase Rate, Retail Price, and Margin.
 * Source: audit/65_LEGACY_COST_RATE_FORMULA_VERIFICATION.md
 *
 * OWNER-CONFIRMED FORMULA (verified against 18 legacy items):
 *   A = Purchase_Rate (Exclusive Tax Amount)
 *   B = Retail_Price (Inclusive Tax Amount)
 *   D = A × Margin (Margin Amount)
 *   E = B - D = Cost_rate (Cost Rate)
 *
 * Verification (Item 2 — Baby Powder 90 GM):
 *   Purchase_Rate = 184.90, Retail_Price = 203.39, Margin = 0.072
 *   Cost_rate = 203.39 - 184.90 × 0.072 = 203.39 - 13.3128 = 190.0772 ✓
 *
 * Legacy observed Margin = 0.072 (7.2%) consistently across all items.
 * Retail_Price = Purchase_Rate × 1.10 (10% markup).
 * Cost_rate = Purchase_Rate × 1.028 (verified).
 */
function calculateCostRate(purchaseRate, retailPrice, margin) {
    return retailPrice - purchaseRate * margin;
}
function calculateBillLineTax(input) {
    const amount = input.quantity * input.rate;
    const discountAmount = amount * (input.tradeDiscountPercent / 100);
    const toAmount = amount - discountAmount;
    const gstAmount = toAmount * (input.gstPercent / 100);
    const furtherTaxAmount = toAmount * (input.furtherTaxPercent / 100);
    const fedAmount = toAmount * (input.fedPercent / 100);
    const advanceTaxAmount = toAmount * (input.advanceTaxPercent / 100);
    const netAmount = toAmount + gstAmount + furtherTaxAmount + fedAmount + advanceTaxAmount;
    return {
        amount,
        discountAmount,
        toAmount,
        gstAmount,
        furtherTaxAmount,
        fedAmount,
        advanceTaxAmount,
        netAmount,
    };
}
