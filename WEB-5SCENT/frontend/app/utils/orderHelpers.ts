/**
 * Order and Payment Helper Functions
 * Used by QRIS Payment Detail Page and related components
 */

/**
 * Format order code to: #ORD-DD-MM-YYYY-XXX
 * @param orderId - Order ID (numeric)
 * @param createdAt - Order creation timestamp (ISO string or Date)
 * @returns Formatted order code like "#ORD-11-12-2025-007"
 */
export function formatOrderCode(orderId: number, createdAt: string | Date): string {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  
  // Extract DD, MM, YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  // Pad order ID to 3 digits (e.g., 7 → 007)
  const paddedId = String(orderId).padStart(3, '0');
  
  return `#ORD-${day}-${month}-${year}-${paddedId}`;
}

/**
 * Format currency to Indonesian Rupiah format
 * @param amount - Amount in rupiah (numeric)
 * @returns Formatted string like "Rp78.750"
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
 * Format countdown from milliseconds to mm:ss
 * @param milliseconds - Time remaining in milliseconds
 * @returns Formatted string like "04:35" or "0:05"
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return '0:00';
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate time remaining from expired_at timestamp
 * @param expiredAt - Expiry timestamp (ISO string or Date)
 * @returns Milliseconds remaining, or 0 if already expired
 */
export function getTimeRemaining(expiredAt: string | Date): number {
  const expireTime = typeof expiredAt === 'string' ? new Date(expiredAt) : expiredAt;
  const now = new Date();
  const remaining = expireTime.getTime() - now.getTime();
  
  return Math.max(0, remaining);
}

/**
 * Check if a payment has expired
 * @param expiredAt - Expiry timestamp
 * @returns true if expired, false otherwise
 */
export function isPaymentExpired(expiredAt: string | Date): boolean {
  return getTimeRemaining(expiredAt) <= 0;
}
