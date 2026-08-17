/**
 * 获取静态资源路径
 * 自动处理 BASE_URL 与 path 之间的 / 连接，避免重复或缺失
 *
 * @param path - 资源路径（如 'logo.svg' 或 '/logo.svg'）
 * @returns 完整资源路径
 */
export function getAssetPath(path: string): string {
  const base = import.meta.env.BASE || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBase}${normalizedPath}`
}