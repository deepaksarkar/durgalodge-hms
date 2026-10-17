// src/lib/currency.ts

/**
 * Converts Paise (integer) to formatted INR Currency string (e.g., 125000 -> "₹1,250.00")
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Converts Rupees input (string or float) to integer Paise for database storage
 */
export function rupeesToPaise(rupees: number | string): number {
  const amount = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts Paise to Rupees float for form editing
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}