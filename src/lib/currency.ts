/**
 * Veloura 🎀 Salon Manager - Indian Currency & Financial Utilities
 * Standard: Indian Rupee (INR) - Symbol ₹ - Locale en-IN
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an amount into standard Indian Rupees (₹) with en-IN lakh/crore commas.
 * e.g. 1000 -> ₹1,000 | 100000 -> ₹1,00,000 | 1234567 -> ₹12,34,567
 */
export function formatCurrency(amount: number | null | undefined, showDecimals = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  const cleanAmount = Math.round(Number(amount));
  if (showDecimals) {
    return inrDecimalFormatter.format(amount);
  }
  return inrFormatter.format(cleanAmount);
}

/**
 * Formats raw number with en-IN grouping (without currency symbol)
 */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('en-IN').format(Math.round(Number(amount)));
}

/**
 * Safely parses any number input
 */
export function parseAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Calculates subtotal, discount, tax (GST), and grand total with integer precision.
 * Subtotal - Discount + Tax = Grand Total
 */
export function calculateBillTotals(
  subtotal: number,
  discount: number = 0,
  taxRate: number = 18,
  taxEnabled: boolean = true
): {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
} {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeDiscount = Math.max(0, Math.min(safeSubtotal, Math.round(discount)));
  const taxableAmount = Math.max(0, safeSubtotal - safeDiscount);
  
  const taxAmount = taxEnabled && taxRate > 0
    ? Math.round((taxableAmount * taxRate) / 100)
    : 0;

  const grandTotal = taxableAmount + taxAmount;

  return {
    subtotal: safeSubtotal,
    discount: safeDiscount,
    taxableAmount,
    taxRate: taxEnabled ? taxRate : 0,
    taxAmount,
    grandTotal,
  };
}
