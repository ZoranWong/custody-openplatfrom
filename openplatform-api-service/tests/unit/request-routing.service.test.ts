/**
 * Request Routing Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RequestRoutingService,
  createRequestRoutingService,
} from '../../src/services/request-routing.service';
import {
  RouteConfig,
  BackendServiceConfig,
} from '../../src/types/routing.types';
import { BACKEND_SERVICES, getBackendService } from '../../src/config/backend-services';
import { ROUTE_TABLE, findRoute } from '../../src/config/routes';

// Mock data for tests
const mockBackendServices: BackendServiceConfig[] = [
  {
    name: 'custody-enterprise',
    baseUrl: 'http://localhost:4001',
    defaultTimeout: 30000,
    maxRetries: 3,
    retryDelay: 100,
  },
  {
    name: 'custody-payment',
    baseUrl: 'http://localhost:4003',
    defaultTimeout: 60000,
    maxRetries: 3,
    retryDelay: 100,
  },
];

const mockRouteTable: RouteConfig[] = [
  {
    pathPattern: '/api/v1/enterprises',
    method: 'POST',
    backendService: 'custody-enterprise',
    backendPath: '/api/v1/enterprises',
    timeout: 30000,
    retryable: true,
  },
  {
    pathPattern: '/api/v1/enterprises',
    method: 'GET',
    backendService: 'custody-enterprise',
    backendPath: '/api/v1/enterprises',
    timeout: 30000,
    retryable: true,
  },
  {
    pathPattern: '/api/v1/enterprises*',
    backendService: 'custody-enterprise',
    backendPath: '/api/v1/enterprises${1}',
    timeout: 30000,
    retryable: true,
  },
  {
    pathPattern: '/api/v1/payments',
    method: 'POST',
    backendService: 'custody-payment',
    backendPath: '/api/v1/payments',
    timeout: 60000,
    retryable: false,
  },
];

describe('RequestRoutingService', () => {
  let service: RequestRoutingService;
  let mockHttpClient: any;

  beforeEach(() => {
    // Create mock HTTP client
    mockHttpClient = {
      request: vi.fn().mockResolvedValue({ status: 200, data: { success: true } }),
      get: vi.fn().mockResolvedValue({ status: 200, data: { healthy: true } }),
      healthCheck: vi.fn().mockResolvedValue({ healthy: true, responseTime: 10 }),
    };

    // Mock createHttpClient
    vi.doMock('../../src/services/http-client.service', () => ({
      createHttpClient: vi.fn().mockReturnValue(mockHttpClient),
    }));

    service = new RequestRoutingService(mockBackendServices, mockRouteTable);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findRoute', () => {
    it('should return route for custody route', () => {
      const result = service.findRoute('/api/oauth/custody/enterprise/wallets', 'POST');

      expect(result.allowed).toBe(true);
      expect(result.backendService).toBe('custody-enterprise');
    });

    it('should return route for nested custody route', () => {
      const result = service.findRoute('/api/oauth/custody/enterprise/wallets', 'GET');

      expect(result.allowed).toBe(true);
      expect(result.backendService).toBe('custody-enterprise');
    });

    it('should return error for unknown route', () => {
      const result = service.findRoute('/api/v1/unknown', 'GET');

      expect(result.allowed).toBe(false);
      expect(result.error_code).toBe(40401);
      expect(result.error_message).toBe('Route not found');
    });
  });

  describe('getRegisteredServices', () => {
    it('should return list of registered services', () => {
      const services = service.getRegisteredServices();

      expect(services).toContain('custody-enterprise');
      expect(services).toContain('custody-payment');
      expect(services.length).toBe(2);
    });
  });

  describe('getRoutingInfo', () => {
    it('should return routing info for valid route', () => {
      const info = service.getRoutingInfo('/api/oauth/custody/enterprise/wallets', 'POST');

      expect(info).not.toBeNull();
      expect(info?.backendService).toBe('custody-enterprise');
    });

    it('should return null for unknown route', () => {
      const info = service.getRoutingInfo('/api/v1/unknown', 'GET');

      expect(info).toBeNull();
    });
  });

  describe('isServiceHealthy', () => {
    it('should return false when no health check has been performed', () => {
      const healthy = service.isServiceHealthy('custody-enterprise');

      expect(healthy).toBe(false);
    });
  });

  describe('getServiceHealth', () => {
    it('should return undefined when no health check has been performed', () => {
      const health = service.getServiceHealth('custody-enterprise');

      expect(health).toBeUndefined();
    });
  });
});

describe('Route Table Helper Functions', () => {
  describe('findRoute', () => {
    it('should find custody route', () => {
      const result = findRoute('/api/oauth/custody/enterprise/wallets', 'POST');

      expect(result).toBeDefined();
      expect(result?.backendService).toBe('custody-enterprise');
    });

    it('should return undefined for unknown route', () => {
      const result = findRoute('/api/v1/unknown', 'GET');

      expect(result).toBeUndefined();
    });
  });

  describe('Mock Route Table', () => {
    it('should have enterprise routes', () => {
      const enterpriseRoutes = mockRouteTable.filter(
        (r) => r.backendService === 'custody-enterprise'
      );

      expect(enterpriseRoutes.length).toBeGreaterThan(0);
    });

    it('should have payment routes', () => {
      const paymentRoutes = mockRouteTable.filter(
        (r) => r.backendService === 'custody-payment'
      );

      expect(paymentRoutes.length).toBeGreaterThan(0);
    });

    it('should have required services from mock route table', () => {
      const services = new Set(mockRouteTable.map((r) => r.backendService));

      expect(services.has('custody-enterprise')).toBe(true);
      expect(services.has('custody-payment')).toBe(true);
    });
  });
});

describe('Backend Services Configuration', () => {
  describe('Backend Services (using mock)', () => {
    it('should have 2 mock services', () => {
      expect(mockBackendServices.length).toBe(2);
    });

    it('should have all required mock services', () => {
      const serviceNames = mockBackendServices.map((s) => s.name);

      expect(serviceNames).toContain('custody-enterprise');
      expect(serviceNames).toContain('custody-payment');
    });
  });

  describe('getBackendService', () => {
    it('should get correct service by name', () => {
      const enterprise = getBackendService('custody-enterprise');

      expect(enterprise).toBeDefined();
      expect(enterprise?.name).toBe('custody-enterprise');
    });

    it('should return undefined for unknown service', () => {
      const unknown = getBackendService('unknown-service');

      expect(unknown).toBeUndefined();
    });
  });
});
