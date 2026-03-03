/**
 * Environment variable utilities
 */

export function getEnv(name: string, required = false): string | undefined {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`${name} environment variable is required`)
  }
  return value
}

export function getEnvOrDefault(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}
