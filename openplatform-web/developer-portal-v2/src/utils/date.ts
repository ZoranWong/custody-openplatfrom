/**
 * Date formatting utilities
 * Locale-aware date formatting without external dependencies
 */

import { useI18n } from 'vue-i18n'

/**
 * Format date to locale-aware string
 * @param dateStr - ISO date string
 * @param format - 'datetime' | 'date' | 'time'
 */
export function formatDate(dateStr: string | undefined | null, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
  if (!dateStr) return '-'
  try {
    const { locale } = useI18n()
    const date = new Date(dateStr)
    const isEn = locale.value === 'en'

    const pad = (n: number) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())

    switch (format) {
      case 'date':
        return isEn ? `${m}/${d}/${y}` : `${y}-${m}-${d}`
      case 'time':
        return `${h}:${min}:${s}`
      case 'datetime':
      default:
        return isEn ? `${m}/${d}/${y} ${h}:${min}` : `${y}-${m}-${d} ${h}:${min}`
    }
  } catch {
    return dateStr
  }
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateOnly(dateStr: string | undefined | null): string {
  return formatDate(dateStr, 'date')
}