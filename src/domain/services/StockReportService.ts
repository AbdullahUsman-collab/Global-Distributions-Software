/**
 * Stock Report Service
 * Generates stock reports including Stock Balance With Activity.
 *
 * READ-ONLY — does not create, modify, or delete any inventory data.
 *
 * Source of Truth:
 *   - audit/07_INVENTORY_ENGINE.md
 *   - audit/24_stockbwa.html
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md
 */

import { Product, StockMovement, StockBWAFilter, StockBWARow, StockBWAReport } from '../types/inventory';
import { IInventoryRepository } from '../repositories/IInventoryRepository';

/* ─── Helpers ──────────────────────────────────────────────── */

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ─── Service ──────────────────────────────────────────────── */

export class StockReportService {
  constructor(
    private inventoryRepo: IInventoryRepository,
  ) {}

  /**
   * Generate Stock Balance With Activity report.
   *
   * Formula (from audit/07_INVENTORY_ENGINE.md):
   *   Closing = Opening + GRN + Returns - Issues - TransfersOut + Adjustments
   *
   * Movement type mapping (from audit/37):
   *   GRN → incoming (purchases received)
   *   ISSUE → outgoing (sales issued)
   *   RETURN → incoming (sale returns) — stock comes back
   *   TRANSFER → source decrease, destination increase
   *   ADJUSTMENT → positive increase, negative decrease
   *
   * Only POSTED movements are included.
   */
  async generateStockBWA(filter: StockBWAFilter): Promise<StockBWAReport> {
    const [products, allMovements] = await Promise.all([
      this.inventoryRepo.getProducts(filter.tenantId),
      this.inventoryRepo.getStockMovements(filter.tenantId),
    ]);

    // Filter to POSTED movements only
    const postedMovements = allMovements.filter(m => m.status === 'POSTED');

    // Build product lookup map
    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    // Determine which products to include
    let targetProducts = products.filter(p => p.isActive);
    if (filter.productId) {
      targetProducts = targetProducts.filter(p => p.id === filter.productId);
    }

    // Build per-product activity aggregates
    const productActivity = new Map<string, {
      openingGrn: number;
      openingIssue: number;
      openingReturn: number;
      openingAdjPos: number;
      openingAdjNeg: number;
      openingTransferIn: number;
      openingTransferOut: number;
      periodGrn: number;
      periodIssue: number;
      periodReturn: number;
      periodAdjPos: number;
      periodAdjNeg: number;
      periodTransferIn: number;
      periodTransferOut: number;
    }>();

    for (const p of targetProducts) {
      productActivity.set(p.id, {
        openingGrn: 0, openingIssue: 0, openingReturn: 0,
        openingAdjPos: 0, openingAdjNeg: 0,
        openingTransferIn: 0, openingTransferOut: 0,
        periodGrn: 0, periodIssue: 0, periodReturn: 0,
        periodAdjPos: 0, periodAdjNeg: 0,
        periodTransferIn: 0, periodTransferOut: 0,
      });
    }

    // Categorize movements into opening vs period
    for (const mov of postedMovements) {
      const act = productActivity.get(mov.productId);
      if (!act) continue;

      const isBeforeStart = mov.movementDate < filter.startDate;
      const isInRange = mov.movementDate >= filter.startDate && mov.movementDate <= filter.endDate;

      if (!isBeforeStart && !isInRange) continue;

      const target = isBeforeStart ? act : act;

      switch (mov.movementType) {
        case 'GRN':
          if (isBeforeStart) target.openingGrn += mov.quantity;
          else target.periodGrn += mov.quantity;
          break;
        case 'ISSUE':
          if (isBeforeStart) target.openingIssue += mov.quantity;
          else target.periodIssue += mov.quantity;
          break;
        case 'RETURN':
          if (isBeforeStart) target.openingReturn += mov.quantity;
          else target.periodReturn += mov.quantity;
          break;
        case 'TRANSFER': {
          // Transfer: decrease source, increase destination
          const isDestination = mov.toWarehouseId && !mov.fromWarehouseId;
          const isSource = mov.fromWarehouseId && !mov.toWarehouseId;
          if (isBeforeStart) {
            if (isDestination) target.openingTransferIn += mov.quantity;
            else if (isSource) target.openingTransferOut += mov.quantity;
            else { target.openingTransferIn += mov.quantity; target.openingTransferOut += mov.quantity; }
          } else {
            if (isDestination) target.periodTransferIn += mov.quantity;
            else if (isSource) target.periodTransferOut += mov.quantity;
            else { target.periodTransferIn += mov.quantity; target.periodTransferOut += mov.quantity; }
          }
          break;
        }
        case 'ADJUSTMENT': {
          // Positive adjustments increase stock, negative decrease
          const isPositive = mov.quantity > 0;
          if (isBeforeStart) {
            if (isPositive) target.openingAdjPos += mov.quantity;
            else target.openingAdjNeg += Math.abs(mov.quantity);
          } else {
            if (isPositive) target.periodAdjPos += mov.quantity;
            else target.periodAdjNeg += Math.abs(mov.quantity);
          }
          break;
        }
      }
    }

    // Build report rows
    const rows: StockBWARow[] = [];
    let totalOpeningQty = 0;
    let totalGrnQty = 0;
    let totalIssueQty = 0;
    let totalReturnQty = 0;
    let totalAdjustmentQty = 0;
    let totalTransferInQty = 0;
    let totalTransferOutQty = 0;
    let totalClosingQty = 0;

    for (const p of targetProducts) {
      const act = productActivity.get(p.id)!;

      // Opening = GRN + Return + AdjPos + TransferIn - Issue - AdjNeg - TransferOut
      const openingQty = r2(
        act.openingGrn + act.openingReturn + act.openingAdjPos + act.openingTransferIn
        - act.openingIssue - act.openingAdjNeg - act.openingTransferOut
      );

      const grnQty = r2(act.periodGrn);
      const issueQty = r2(act.periodIssue);
      const returnQty = r2(act.periodReturn);
      const adjustmentQty = r2(act.periodAdjPos - act.periodAdjNeg);
      const transferInQty = r2(act.periodTransferIn);
      const transferOutQty = r2(act.periodTransferOut);

      const closingQty = r2(
        openingQty + grnQty + returnQty + adjustmentQty + transferInQty - issueQty - transferOutQty
      );

      rows.push({
        productId: p.id,
        productCode: p.sku,
        productName: p.name,
        unit: p.unit,
        openingQty,
        grnQty,
        issueQty,
        returnQty,
        adjustmentQty,
        transferInQty,
        transferOutQty,
        closingQty,
      });

      totalOpeningQty += openingQty;
      totalGrnQty += grnQty;
      totalIssueQty += issueQty;
      totalReturnQty += returnQty;
      totalAdjustmentQty += adjustmentQty;
      totalTransferInQty += transferInQty;
      totalTransferOutQty += transferOutQty;
      totalClosingQty += closingQty;
    }

    // Sort by product code (legacy StockBWA sorts by Item_No)
    rows.sort((a, b) => a.productCode.localeCompare(b.productCode));

    return {
      startDate: filter.startDate,
      endDate: filter.endDate,
      rows,
      totalOpeningQty: r2(totalOpeningQty),
      totalGrnQty: r2(totalGrnQty),
      totalIssueQty: r2(totalIssueQty),
      totalReturnQty: r2(totalReturnQty),
      totalAdjustmentQty: r2(totalAdjustmentQty),
      totalTransferInQty: r2(totalTransferInQty),
      totalTransferOutQty: r2(totalTransferOutQty),
      totalClosingQty: r2(totalClosingQty),
    };
  }
}
