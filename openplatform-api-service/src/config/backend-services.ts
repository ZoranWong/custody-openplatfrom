/**
 * Backend Services Configuration
 * Defines connection settings for all Custody backend services
 */

import dotenv from 'dotenv';
import { BackendServiceConfig } from '../types/routing.types';

dotenv.config();

/**
 * Backend service configurations
 * Each service maps to a specific Custody microservice
 */
export const BACKEND_SERVICES: BackendServiceConfig[] = [
    {
        name: 'custody-enterprise',
        baseUrl: process.env.CUSTODY_ENTERPRISE_URL || 'http://localhost:4001',
        healthCheckPath: '/health',
        defaultTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
    }
];

/**
 * Get backend service configuration by name
 */
export function getBackendService(name: string): BackendServiceConfig | undefined {
    return BACKEND_SERVICES.find((service) => service.name === name);
}

/**
 * Check if a backend service is configured
 */
export function isBackendServiceConfigured(name: string): boolean {
    return BACKEND_SERVICES.some((service) => service.name === name);
}
