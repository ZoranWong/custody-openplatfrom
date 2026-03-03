/**
 * JSON Serializer Utility for SDK Client
 * Ensures consistent JSON serialization between client and server
 */

import * as crypto from 'crypto'
import { sortObjectKeys } from './signature'

/**
 * Serialization options
 */
export interface JsonSerializerOptions {
  /**
   * Sort keys recursively (default: true)
   */
  sortKeys?: boolean

  /**
   * Include null values (default: false)
   */
  includeNull?: boolean

  /**
   * Remove undefined values (default: true)
   */
  removeUndefined?: boolean
}

/**
 * Default serialization options
 */
const DEFAULT_OPTIONS: JsonSerializerOptions = {
  sortKeys: true,
  includeNull: false,
  removeUndefined: true
}

/**
 * Preprocess value for serialization
 */
function preprocessValue(value: unknown, options: JsonSerializerOptions): unknown {
  // Handle null
  if (value === null) {
    return options.includeNull ? null : undefined
  }

  // Handle undefined
  if (value === undefined) {
    return undefined
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => preprocessValue(item, options))
  }

  // Handle objects
  if (typeof value === 'object') {
    const processed: Record<string, unknown> = {}
    const source = value as Record<string, unknown>

    for (const key of Object.keys(source)) {
      const processedValue = preprocessValue(source[key], options)
      if (processedValue !== undefined || options.includeNull) {
        processed[key] = processedValue
      }
    }

    if (options.sortKeys) {
      return sortObjectKeys(processed)
    }

    return processed
  }

  // Handle primitives
  return value
}

/**
 * Serialize object to JSON string with consistent formatting
 */
export function serialize(
  data: Record<string, unknown>,
  options: JsonSerializerOptions = DEFAULT_OPTIONS
): string {
  const processed = preprocessValue(data, {
    ...DEFAULT_OPTIONS,
    ...options
  })

  return JSON.stringify(processed)
}

/**
 * Calculate MD5 of serialized JSON
 */
export function calculateJsonMd5(
  data: Record<string, unknown>,
  options: JsonSerializerOptions = DEFAULT_OPTIONS
): string {
  const serialized = serialize(data, options)
  return crypto.createHash('md5').update(serialized).digest('hex')
}

/**
 * Parse JSON string with error handling
 */
export function deserialize<T = unknown>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return null
  }
}

/**
 * Check if two objects would serialize to the same JSON
 */
export function isJsonEqual(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  options: JsonSerializerOptions = DEFAULT_OPTIONS
): boolean {
  const serialized1 = serialize(obj1, options)
  const serialized2 = serialize(obj2, options)
  return serialized1 === serialized2
}

export default {
  serialize,
  deserialize,
  calculateJsonMd5,
  isJsonEqual,
  sortObjectKeys
}
