# Story C.3.1: Request Routing

**Status:** done

## Story

作为 **API Gateway**，
我希望将请求路由到后端服务，
以便请求能够被正确处理。

## 依赖

- **Story C.2.2**: Permission Check Middleware（提供经过权限验证的请求）
- **Story C.2.1**: App-Enterprise Binding Validation（提供 app-enterprise 绑定信息）
- **Story C.1.1**: HMAC Signature Verification（提供 appid）
- **Story C.1.2**: JWT Token Management（提供认证上下文）
- **Story C.1.3**: OAuth Token Endpoint（提供凭证验证）

## 验收标准

### 请求路由
- **Given** 经过认证和权限验证的请求（包含 appid, enterprise_id, permissions）
- **When** 解析请求路径和方法
- **Then** 根据 API 路径前缀路由到相应的后端 Custody 服务
- **And** 保留原始请求头和请求体

### 响应转发
- **Given** 后端 Custody 服务的响应
- **When** 收到响应
- **Then** 将响应转发给原始调用方
- **And** 保持响应状态码
- **And** 添加追踪头信息（X-Trace-Id）

### 错误处理
- **Given** 后端服务返回错误
- **When** 处理响应
- **Then** 映射错误码到平台统一的错误格式
- **And** 返回原始错误消息
- **And** 记录错误日志

### 超时处理
- **Given** 请求转发到后端服务
- **When** 后端服务超时（默认 30 秒）
- **Then** 返回 504 Gateway Timeout
- **And** 记录超时日志

## 任务 / 子任务

- [ ] Task 1: Create routing configuration and types
  - [ ] Define RouteConfig interface
  - [ ] Define BackendServiceConfig interface
  - [ ] Create routing table configuration

- [ ] Task 2: Create HTTP client for backend communication
  - [ ] Implement HttpClient wrapper with axios
  - [ ] Add request/response interceptors
  - [ ] Implement timeout handling

- [ ] Task 3: Create request routing service
  - [ ] Implement path-to-service mapping
  - [ ] Implement request transformation
  - [ ] Implement response transformation

- [ ] Task 4: Create routing middleware
  - [ ] Integrate with permission check middleware
  - [ ] Handle route not found
  - [ ] Attach routing info to request

- [ ] Task 5: Add error mapping utilities
  - [ ] Map Custody error codes to platform codes
  - [ ] Handle network errors
  - [ ] Add retry logic for idempotent requests

- [ ] Task 6: Add unit tests
  - [ ] Test routing configuration
  - [ ] Test HTTP client
  - [ ] Test routing service
  - [ ] Test error handling

## Dev Notes

### 技术栈与约束

- **框架:** Express + TypeScript
- **HTTP 客户端:** axios
- **依赖:** PermissionCheckMiddleware (C.2.2), BindingValidationService (C.2.1)
- **性能要求:** P99 < 500ms, 1000 QPS
- **超时配置:** 默认 30 秒，可配置

### 路由配置

```typescript
// 路由配置接口
interface RouteConfig {
  pathPattern: string;      // 路径模式，如 /api/v1/*
  method?: string;          // HTTP 方法，可选
  backendService: string;   // 后端服务标识
  backendPath: string;      // 后端路径（可包含变量替换）
  timeout?: number;         // 超时时间（毫秒）
  retryable?: boolean;      // 是否可重试
}

// 后端服务配置
interface BackendServiceConfig {
  name: string;
  baseUrl: string;
  healthCheckPath?: string;
  defaultTimeout: number;
}
```

### 路径映射规则

```typescript
// API 路径到后端服务的映射
const ROUTE_TABLE: RouteConfig[] = [
  // 企业管理 → Custody Enterprise Service
  {
    pathPattern: '/api/v1/enterprises*',
    backendService: 'custody-enterprise',
    backendPath: '/api/v1/enterprises${1}',
  },
  // 财务单元 → Custody Unit Service
  {
    pathPattern: '/api/v1/units*',
    backendService: 'custody-unit',
    backendPath: '/api/v1/units${1}',
  },
  // 支付 → Custody Payment Service
  {
    pathPattern: '/api/v1/payments*',
    backendService: 'custody-payment',
    backendPath: '/api/v1/payments${1}',
  },
  // 划拨 → Custody Transfer Service
  {
    pathPattern: '/api/v1/transfers*',
    backendService: 'custody-transfer',
    backendPath: '/api/v1/transfers${1}',
  },
  // 归集 → Custody Pooling Service
  {
    pathPattern: '/api/v1/pooling*',
    backendService: 'custody-pooling',
    backendPath: '/api/v1/pooling${1}',
  },
  // 签名 → Custody Signature Service
  {
    pathPattern: '/api/v1/signatures*',
    backendService: 'custody-signature',
    backendPath: '/api/v1/signatures${1}',
  },
  // 交易查询 → Custody Transaction Service
  {
    pathPattern: '/api/v1/transactions*',
    backendService: 'custody-transaction',
    backendPath: '/api/v1/transactions${1}',
  },
  // Webhook 配置 → Custody Webhook Service
  {
    pathPattern: '/api/v1/webhooks*',
    backendService: 'custody-webhook',
    backendPath: '/api/v1/webhooks${1}',
  },
  // 账户 → Custody Account Service
  {
    pathPattern: '/api/v1/accounts*',
    backendService: 'custody-account',
    backendPath: '/api/v1/accounts${1}',
  },
];
```

### HTTP 客户端封装

```typescript
// src/services/http-client.service.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  retryCount?: number;
  retryDelay?: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (reqConfig) => {
        // 添加追踪头
        reqConfig.headers['X-Trace-Id'] = reqConfig.headers['X-Trace-Id'] || generateTraceId();
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.code === 'ECONNABORTED' && this.config.retryCount) {
          // 超时重试
          return this.retryRequest(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    let attempt = 0;
    while (attempt < (this.config.retryCount || 0)) {
      attempt++;
      await this.delay(this.config.retryDelay || 1000);
      try {
        return await this.client.request(config);
      } catch (e) {
        // 继续重试
      }
    }
    throw new Error(`Request failed after ${attempt} retries`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}
```

### 请求路由服务

```typescript
// src/services/request-routing.service.ts

import { HttpClient, HttpClientConfig } from './http-client.service';
import { AuthenticatedRequest } from '../types/jwt.types';

interface RoutingResult {
  allowed: boolean;
  backendService?: string;
  backendPath?: string;
  error_code?: number;
  error_message?: string;
}

export class RequestRoutingService {
  private httpClients: Map<string, HttpClient> = new Map();
  private routeTable: RouteConfig[];

  constructor(routeConfigs: BackendServiceConfig[], routeTable: RouteConfig[]) {
    // 初始化 HTTP 客户端
    for (const config of routeConfigs) {
      this.httpClients.set(config.name, new HttpClient({
        baseUrl: config.baseUrl,
        timeout: config.defaultTimeout,
        retryCount: 3,
        retryDelay: 1000,
      }));
    }
    this.routeTable = routeTable;
  }

  /**
   * 根据请求查找匹配的路由
   */
  findRoute(path: string, method: string): RoutingResult {
    // 精确匹配
    const exactMatch = this.routeTable.find(
      (route) => route.pathPattern === path && (!route.method || route.method === method)
    );
    if (exactMatch) {
      return {
        allowed: true,
        backendService: exactMatch.backendService,
        backendPath: exactMatch.backendPath,
      };
    }

    // 通配符匹配
    const wildcardMatch = this.routeTable.find((route) => {
      if (!route.pathPattern.endsWith('*')) return false;
      const pattern = route.pathPattern.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path) && (!route.method || route.method === method);
    });

    if (wildcardMatch) {
      // 提取路径参数
      const suffix = path.replace(wildcardMatch.pathPattern.replace('*', ''), '');
      const backendPath = wildcardMatch.backendPath.replace('${1}', suffix);

      return {
        allowed: true,
        backendService: wildcardMatch.backendService,
        backendPath,
      };
    }

    return {
      allowed: false,
      error_code: 40401,
      error_message: 'Route not found',
    };
  }

  /**
   * 转发请求到后端服务
   */
  async forwardRequest(
    req: AuthenticatedRequest,
    route: RoutingResult
  ): Promise<any> {
    const client = this.httpClients.get(route.backendService!);
    if (!client) {
      throw new Error(`Backend service not found: ${route.backendService}`);
    }

    const { method, path, body, headers, query } = req;

    // 构建后端请求
    const requestConfig: AxiosRequestConfig = {
      method: method as any,
      url: route.backendPath,
      headers: {
        ...headers,
        'X-Forwarded-For': headers['x-forwarded-for'] || req.ip,
        'X-Forwarded-AppId': req.appid,
        'X-Forwarded-EnterpriseId': req.enterprise_id,
      },
      params: query,
      data: body,
      timeout: 30000, // 30秒
    };

    return client.request(requestConfig);
  }
}
```

### 路由中间件

```typescript
// src/middleware/request-routing.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import { RequestRoutingService } from '../services/request-routing.service';

export function createRequestRoutingMiddleware(
  routingService: RequestRoutingService
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 查找匹配的路由
      const route = routingService.findRoute(req.path, req.method);

      if (!route.allowed) {
        res.status(404).json({
          code: route.error_code,
          message: route.error_message,
          trace_id: res.getHeader('X-Trace-Id'),
        });
        return;
      }

      // 将路由信息附加到请求
      (req as any).routingInfo = {
        backendService: route.backendService,
        backendPath: route.backendPath,
      };

      next();
    } catch (error) {
      logger.error('Routing error', { error, path: req.path });
      res.status(500).json({
        code: 50001,
        message: 'Internal routing error',
        trace_id: res.getHeader('X-Trace-Id'),
      });
    }
  };
}
```

### 错误码映射

```typescript
// src/utils/error-mapper.ts

// Custody 错误码到平台错误码的映射
const ERROR_CODE_MAP: Record<number, number> = {
  // 400 系列
  40001: 40001, // 参数错误
  40002: 40002, // 格式错误
  40003: 40003, // 业务规则错误

  // 401 系列
  40101: 40101, // 未认证
  40102: 40102, // Token 过期

  // 403 系列
  40301: 40301, // 无权限
  40302: 40302, // 资源不存在

  // 500 系列
  50001: 50001, // 内部错误
  50002: 50002, // 服务不可用
};

export function mapErrorCode(custodyCode: number): number {
  return ERROR_CODE_MAP[custodyCode] || 50002;
}

export interface PlatformError {
  code: number;
  message: string;
  trace_id?: string;
}

export function mapErrorResponse(custodyResponse: any, traceId: string): PlatformError {
  return {
    code: mapErrorCode(custodyResponse.code || 50002),
    message: custodyResponse.message || 'Unknown error',
    trace_id: traceId,
  };
}
```

### 请求处理流程

```
Request Flow:
1. Signature Verification (C.1.1) → Extract appid
2. JWT Middleware (C.1.2) → Validate token
3. Binding Validation (C.2.1) → Validate binding, attach permissions
4. Permission Check (C.2.2) → Verify endpoint permissions
5. Request Routing (C.3.1) → Forward to backend service ⬅️ 当前 Story
6. Response → Return to caller
```

### 项目结构

```
openplatform-api-service/
├── src/
│   ├── services/
│   │   ├── http-client.service.ts        # HTTP 客户端封装
│   │   ├── request-routing.service.ts   # 请求路由逻辑
│   │   └── error-mapper.service.ts      # 错误码映射
│   │
│   ├── middleware/
│   │   └── request-routing.middleware.ts  # 路由中间件
│   │
│   ├── config/
│   │   ├── routes.ts                    # 路由表配置
│   │   └── backend-services.ts          # 后端服务配置
│   │
│   └── types/
│       └── routing.types.ts              # 路由相关类型
│
└── tests/
    └── unit/
        ├── http-client.test.ts
        ├── request-routing.service.test.ts
        └── request-routing.middleware.test.ts
```

### 后端服务配置示例

```typescript
// src/config/backend-services.ts

import dotenv from 'dotenv';
dotenv.config();

export const BACKEND_SERVICES: BackendServiceConfig[] = [
  {
    name: 'custody-enterprise',
    baseUrl: process.env.CUSTODY_ENTERPRISE_URL || 'http://localhost:4001',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-unit',
    baseUrl: process.env.CUSTODY_UNIT_URL || 'http://localhost:4002',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-payment',
    baseUrl: process.env.CUSTODY_PAYMENT_URL || 'http://localhost:4003',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-transfer',
    baseUrl: process.env.CUSTODY_TRANSFER_URL || 'http://localhost:4004',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-pooling',
    baseUrl: process.env.CUSTODY_POOLING_URL || 'http://localhost:4005',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-signature',
    baseUrl: process.env.CUSTODY_SIGNATURE_URL || 'http://localhost:4006',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-transaction',
    baseUrl: process.env.CUSTODY_TRANSACTION_URL || 'http://localhost:4007',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-webhook',
    baseUrl: process.env.CUSTODY_WEBHOOK_URL || 'http://localhost:4008',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
  {
    name: 'custody-account',
    baseUrl: process.env.CUSTODY_ACCOUNT_URL || 'http://localhost:4009',
    healthCheckPath: '/health',
    defaultTimeout: 30000,
  },
];
```

### 性能考虑

- HTTP 客户端使用连接池
- 响应数据直接流式转发（大文件场景）
- 路由查找使用 Map 而非遍历
- 超时和重试机制防止挂起请求
- 健康检查用于后端服务发现（可选）

### 与 Story C.2.2 的集成

1. **输入来源:** Permission Check 中间件已将 `req.permissions` 附加
2. **路由决策:** 使用 `req.path` 和 `req.method` 进行路由匹配
3. **请求转发:** 保留原始请求头，添加转发头
4. **错误处理:** 映射 Custody 错误码到平台错误码

### 参考文献

- [Source: docs/planning-artifacts/epics.md#Story-C.3.1]
- [Source: docs/planning-artifacts/architecture.md#API-Gateway-详细结构]
- [Story C.2.2: Permission Check Middleware](/docs/implementation-artifacts/c-2-2-permission-check-middleware.md)
- [Story C.1.1: HMAC Signature Verification](/docs/implementation-artifacts/c-1-1-hmac-signature-verification.md)

## Dev Agent Record

### Agent Model Used

MiniMax-M2.1

### Debug Log References

### Completion Notes List

### File List

**New Files:**
- `openplatform-api-service/src/types/routing.types.ts` - 路由类型定义
- `openplatform-api-service/src/config/routes.ts` - 路由表配置
- `openplatform-api-service/src/config/backend-services.ts` - 后端服务配置
- `openplatform-api-service/src/services/http-client.service.ts` - HTTP 客户端封装
- `openplatform-api-service/src/services/request-routing.service.ts` - 请求路由服务
- `openplatform-api-service/src/services/error-mapper.service.ts` - 错误码映射
- `openplatform-api-service/src/middleware/request-routing.middleware.ts` - 路由中间件
- `openplatform-api-service/tests/unit/http-client.test.ts` - HTTP 客户端测试
- `openplatform-api-service/tests/unit/request-routing.service.test.ts` - 路由服务测试
- `openplatform-api-service/tests/unit/request-routing.middleware.test.ts` - 路由中间件测试
