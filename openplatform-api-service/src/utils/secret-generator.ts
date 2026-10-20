import crypto from 'node:crypto';

export type AppSecretEnv = 'test' | 'beta';

/**
 * Generate a cryptographically secure app secret.
 *
 * Format: `sk_{env}_{48-char URL-safe Base64 random string}`
 * Total length: 57 characters.
 *
 * Examples:
 *   sk_beta_xK9mN2pQ4rS6tU8vW0yA1bC3dE5fG7hI9jK1lM3nO5p
 *   sk_test_A3bC5dE7fG9hI1jK3lM5nO7pQ9rS1tU3vW5xY7zA9b
 *
 * @param env - Environment prefix, defaults to 'beta'
 */
export function generateAppSecret(env: AppSecretEnv = 'beta'): string {
  const randomBytes = crypto.randomBytes(36);
  const randomStr = randomBytes.toString('base64url');
  return `sk_${env}_${randomStr}`;
}

/**
 * Mask an app secret for display.
 *
 * Shows the prefix segment (`sk_beta_`) plus 3 characters, then the last 4.
 * Example: `sk_beta_xK9m...O5p`
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 20) {
    return secret;
  }
  const underscore = secret.indexOf('_', 3); // end of the env segment
  const prefixEnd = underscore > 0 ? underscore : 8; // exclusive index of the env separator
  const head = secret.slice(0, prefixEnd + 1 + 3); // prefix + separator + 3 random chars
  const tail = secret.slice(-4);
  return `${head}...${tail}`;
}
