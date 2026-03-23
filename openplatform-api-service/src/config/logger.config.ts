/**
 * Logger Configuration
 * Configuration for log storage, rotation, and environment-specific settings
 */

import path from 'path';
import fs from 'fs';

// Environment
const env = process.env.NODE_ENV || 'development';

/**
 * Log directory paths
 */
export const logPaths = {
  root: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  access: 'access',
  error: 'error',
  audit: 'audit',
  application: 'application',
};

/**
 * Ensure log directories exist
 */
export function ensureLogDirectories(): void {
  const dirs = [
    logPaths.root,
    path.join(logPaths.root, logPaths.access),
    path.join(logPaths.root, logPaths.error),
    path.join(logPaths.root, logPaths.audit),
    path.join(logPaths.root, logPaths.application),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Log rotation configuration
 */
export const logRotation = {
  maxSize: process.env.LOG_MAX_SIZE || '10m', // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10), // 7 days
    // Access logs: 7 days retention
    accessRetentionDays: 7,
    // Audit logs: 7 days retention
    auditRetentionDays: 7,
    // Error logs: 7 days retention
    errorRetentionDays: 7,
};

/**
 * Log levels per environment
 */
export const logLevels = {
  development: {
    console: 'debug',
    file: 'info',
    audit: 'warn',
    error: 'debug',
  },
  production: {
    console: 'warn',
    file: 'info',
    audit: 'warn',
    error: 'error',
  },
  test: {
    console: 'debug',
    file: 'info',
    audit: 'debug',
    error: 'debug',
  },
};

/**
 * Get current environment log level configuration
 */
export function getLogLevels() {
  return logLevels[env as keyof typeof logLevels] || logLevels.development;
}

/**
 * Log output configuration
 */
export const logOutput = {
  // Enable file logging
  enableFileLogging: env === 'production' || process.env.ENABLE_FILE_LOGGING === 'true',

  // Enable console logging
  enableConsoleLogging: true,

  // Enable structured JSON logging
  useJsonFormat: env === 'production',

  // Sample rate for high-volume endpoints (0-1)
  // Set to < 1 for sampling in high-traffic environments
  sampleRate: parseFloat(process.env.LOG_SAMPLE_RATE || '1'),

  // Endpoints to exclude from logging
  excludePaths: [
    '/health',
    '/healthcheck',
    '/ready',
  ],

  // Paths that are high-volume and might need sampling
  highVolumePaths: [
    '/api/v1/usage',
    '/api/v1/stats',
  ],
};

//console.log(`Logger configuration initialized for environment: ${env}`, logOutput, process.env);

/**
 * Sensitive fields to mask in logs
 */
export const sensitiveFields = [
  'password',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'authorization',
  'x-api-key',
  'x-api-secret',
];

/**
 * Mask sensitive data in object
 */
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Logger configuration object
 */
export interface LoggerConfig {
  env: string;
  logDir: string;
  paths: typeof logPaths;
  rotation: typeof logRotation;
  levels: ReturnType<typeof getLogLevels>;
  output: typeof logOutput;
  sensitiveFields: string[];
}

/**
 * Get complete logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return {
    env,
    logDir: logPaths.root,
    paths: logPaths,
    rotation: logRotation,
    levels: getLogLevels(),
    output: logOutput,
    sensitiveFields,
  };
}

/**
 * Initialize logger configuration
 * Call this at application startup
 */
export function initLoggerConfig(): LoggerConfig {
  ensureLogDirectories();
  return getLoggerConfig();
}

export default {
  logPaths,
  ensureLogDirectories,
  logRotation,
  getLogLevels,
  logOutput,
  sensitiveFields,
  maskSensitiveData,
  getLoggerConfig,
  initLoggerConfig,
};
