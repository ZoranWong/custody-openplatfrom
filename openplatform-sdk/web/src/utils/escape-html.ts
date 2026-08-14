/**
 * Escape HTML special characters to prevent XSS attacks.
 *
 * Escapes the five characters that have special meaning in HTML:
 * - & (ampersand) becomes &amp;
 * - < (less-than) becomes &lt;
 * - > (greater-than) becomes &gt;
 * - " (double-quote) becomes &quot;
 * - ' (single-quote) becomes &#x27;
 *
 * This is critical when inserting user-provided data into HTML
 * attribute values or element content via innerHTML.
 */
export function escapeHtml(str: string): string {
    if (str == null) {
        return '';
    }
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}