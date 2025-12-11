/**
 * Order Helper Functions
 * Utility functions for formatting order data, currency, countdown, and time calculations
 */

/**
 * Format order ID with date pattern: #ORD-DD-MM-YYYY-XXX
 * @param orderId - Numeric order ID
 * @param createdAt - ISO date string or Date object
 * @returns Formatted order code like "#ORD-11-12-2025-007"
 */
export function formatOrderCode(orderId: number, createdAt: string | Date): string {
  const date = new Date(createdAt);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const id = String(orderId).padStart(3, '0');
  return `#ORD-${day}-${month}-${year}-${id}`;
}

/**
 * Format amount to Indonesian Rupiah currency format
 * @param amount - Numeric amount
 * @returns Formatted currency string like "Rp78.750"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format milliseconds to mm:ss countdown format
 * @param milliseconds - Time in milliseconds
 * @returns Formatted countdown like "4:35" or "0:00"
 */
export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate time remaining until expired_at timestamp
 * @param expiredAt - ISO date string when payment expires
 * @returns Milliseconds remaining, or 0 if already expired
 */
export function getTimeRemaining(expiredAt: string): number {
  const now = new Date().getTime();
  const expiryTime = new Date(expiredAt).getTime();
  const remaining = expiryTime - now;
  return Math.max(0, remaining);
}

/**
 * Check if payment has expired
 * @param expiredAt - ISO date string when payment expires
 * @returns true if current time is past expiredAt, false otherwise
 */
export function isPaymentExpired(expiredAt: string): boolean {
  return getTimeRemaining(expiredAt) <= 0;
}
