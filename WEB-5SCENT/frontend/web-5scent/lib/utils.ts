import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Rounds a rating to the nearest 0 or 0.5
 * Examples: 3.5-3.99 rounds to 3.5, 3.0-3.49 rounds to 3.0
 */
export function roundRating(rating: number): number {
  return Math.round(rating * 2) / 2
}

/**
 * Formats order ID in the format: ORD-{DD-MM-YYYY}-{3digit}
 * @param orderId - The order ID number
 * @param createdAt - The order creation date (ISO string or Date object)
 * @returns Formatted order ID string, e.g., "ORD-30-11-2025-001"
 */
export function formatOrderId(orderId: number, createdAt?: string | Date): string {
  const paddedId = String(orderId).padStart(3, '0')
  
  if (!createdAt) {
    return `ORD-${paddedId}`
  }

  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `ORD-${day}-${month}-${year}-${paddedId}`
}
