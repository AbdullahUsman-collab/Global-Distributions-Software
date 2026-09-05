/**
 * Input Validation Utilities
 * Server-side validation for all mutation endpoints.
 *
 * RULE: Never trust client-side TypeScript types as validation.
 * RULE: Reject malformed requests safely without leaking internals.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate required string fields.
 */
export function requiredString(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'string' || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

/**
 * Validate a positive number.
 */
export function positiveNumber(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  return { valid: true };
}

/**
 * Validate a non-negative number.
 */
export function nonNegativeNumber(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value) || value < 0) {
    return { valid: false, error: `${fieldName} must be a non-negative number` };
  }
  return { valid: true };
}

/**
 * Validate an ID string (non-empty, reasonable length).
 */
export function validId(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'string' || value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (value.length > 128) {
    return { valid: false, error: `${fieldName} is too long` };
  }
  return { valid: true };
}

/**
 * Validate a date string (YYYY-MM-DD format).
 */
export function validDate(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return { valid: false, error: `${fieldName} must be in YYYY-MM-DD format` };
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  return { valid: true };
}

/**
 * Validate an enum value.
 */
export function validEnum<T extends string>(value: unknown, fieldName: string, allowed: readonly T[]): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (!allowed.includes(value as T)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowed.join(', ')}` };
  }
  return { valid: true };
}

/**
 * Validate a tax rate percentage (0-100).
 */
export function validTaxRate(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (value < 0 || value > 100) {
    return { valid: false, error: `${fieldName} must be between 0 and 100` };
  }
  return { valid: true };
}

/**
 * Validate an array is non-empty.
 */
export function nonEmptyArray(value: unknown, fieldName: string): ValidationResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { valid: false, error: `${fieldName} must be a non-empty array` };
  }
  return { valid: true };
}

/**
 * Combine multiple validation results.
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) return result;
  }
  return { valid: true };
}

/**
 * Validate request body has expected shape.
 */
export function validateSaleBillDTO(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    validId(body.customerId, 'customerId'),
    validId(body.warehouseId, 'warehouseId'),
    validDate(body.date, 'date'),
    nonEmptyArray(body.lines, 'lines'),
  );
}

/**
 * Validate sale bill line items.
 */
export function validateSaleBillLines(lines: any[]): ValidationResult {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = combineValidations(
      validId(line.productId, `lines[${i}].productId`),
      positiveNumber(line.quantity, `lines[${i}].quantity`),
      nonNegativeNumber(line.rate, `lines[${i}].rate`),
      nonNegativeNumber(line.discount, `lines[${i}].discount`),
      validTaxRate(line.stRate, `lines[${i}].stRate`),
    );
    if (!result.valid) return result;
  }
  return { valid: true };
}

/**
 * Validate sale return DTO.
 */
export function validateSaleReturnDTO(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    validId(body.customerId, 'customerId'),
    validId(body.warehouseId, 'warehouseId'),
    validDate(body.date, 'date'),
    nonEmptyArray(body.lines, 'lines'),
  );
}

/**
 * Validate sale return line items.
 */
export function validateSaleReturnLines(lines: any[]): ValidationResult {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = combineValidations(
      validId(line.productId, `lines[${i}].productId`),
      positiveNumber(line.packs, `lines[${i}].packs`),
      nonNegativeNumber(line.rate, `lines[${i}].rate`),
      nonNegativeNumber(line.tradeDiscountPercent, `lines[${i}].tradeDiscountPercent`),
      validTaxRate(line.gstPercent, `lines[${i}].gstPercent`),
      validTaxRate(line.furtherTaxPercent, `lines[${i}].furtherTaxPercent`),
      validTaxRate(line.fedPercent, `lines[${i}].fedPercent`),
      validTaxRate(line.advanceTaxPercent, `lines[${i}].advanceTaxPercent`),
    );
    if (!result.valid) return result;
  }
  return { valid: true };
}

/**
 * Validate purchase bill DTO.
 */
export function validatePurchaseBillDTO(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    validId(body.supplierId, 'supplierId'),
    validId(body.warehouseId, 'warehouseId'),
    validDate(body.date, 'date'),
    nonEmptyArray(body.lines, 'lines'),
  );
}

/**
 * Validate customer receipt DTO.
 */
export function validateCustomerReceiptDTO(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    validId(body.customerId, 'customerId'),
    validDate(body.date, 'date'),
    positiveNumber(body.amount, 'amount'),
  );
}

/**
 * Validate cash book voucher DTO.
 * Accepts: { type: 'CR'|'CP', cashAccountId, counterAccountId, amount, date, narration }
 */
export function validateCashBookDTO(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    validEnum(body.type, 'type', ['CR', 'CP'] as const),
    validId(body.cashAccountId, 'cashAccountId'),
    validId(body.counterAccountId, 'counterAccountId'),
    positiveNumber(body.amount, 'amount'),
    validDate(body.date, 'date'),
    requiredString(body.narration, 'narration'),
  );
}

/**
 * Validate login credentials.
 */
export function validateLoginCredentials(body: any): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }
  return combineValidations(
    requiredString(body.username, 'username'),
    requiredString(body.password, 'password'),
    validId(body.tenantId, 'tenantId'),
  );
}
