/**
 * Date formatting utilities
 * Locale-aware date formatting without external dependencies
 */

/**
 * Format date to locale-aware string
 * @param dateStr - ISO date string
 * @param format - 'datetime' | 'date' | 'time'
 * @param locale - locale string, e.g. 'zh' | 'en'
 */
export function formatDate(
  dateStr: string | undefined | null,
  format: 'datetime' | 'date' | 'time' = 'datetime',
  locale: string = 'zh'
): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const isEn = locale === 'en'

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
  } catch (e) {
    console.error('Error formatting date:', e)
    return dateStr
  }
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateOnly(dateStr: string | undefined | null, locale?: string): string {
  return formatDate(dateStr, 'date', locale)
}