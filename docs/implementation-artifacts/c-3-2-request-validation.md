# Story C.3.2: Request Validation

**Status:** done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

作为 **API Gateway**，
我希望验证请求格式，
以便我可以拒绝格式错误的请求。

## 依赖

- **Story C.3.1**: Request Routing（提供路由基础设施）
- **Story C.2.2**: Permission Check Middleware（提供权限上下文）

## 验收标准

### 请求体验证

- **Given** 入站请求
- **When** 验证请求格式
- **Then** 检查必需字段（appid, nonce, timestamp, sign）
- **And** 验证 Content-Type 是否为 application/json
- **And** 验证请求体是否为有效的 JSON

### 请求体验证 - 必填字段

- **Given** 收到的请求
- **When** 缺少必需字段时
- **Then** 返回 400 Bad Request
- **And** 错误码为 40001 (Parameter error)
- **And** 在错误消息中指明缺失的字段

### 请求体验证 - 数据格式

- **Given** 收到的请求体
- **When** 验证数据格式
- **Then** 验证 enterprise_id 格式（如果提供）
- **And** 验证 monetary 字段为有效数字
- **And** 验证 cryptocurrency 字段为支持的币种

### 请求体验证 - 业务规则

- **Given** 收到的请求
- **When** 验证业务规则
- **Then** 验证金额大于 0（如果提供）
- **And** 验证币种是否在白名单中
- **And** 验证地址格式（如果提供）

## 任务 / 子任务

- [ ] Task 1: Create request validation types and schemas
  - [ ] Define RequestValidationSchema interface
  - [ ] Create field validators for common types
  - [ ] Define ValidationResult and ValidationError types

- [ ] Task 2: Implement field-level validators
  - [ ] Implement required fields validator
  - [ ] Implement format validators (email, phone, address)
  - [ ] Implement numeric validators (amount, precision)
  - [ ] Implement enum validators (currency, status)

- [ ] Task 3: Create validation service
  - [ ] Implement validateRequest function
  - [ ] Implement validateBusinessRules function
  - [ ] Add custom validator support

- [ ] Task 4: Create validation middleware
  - [ ] Integrate with routing middleware
  - [ ] Handle validation errors
  - [ ] Attach validation result to request

- [ ] Task 5: Add unit tests
  - [ ] Test field validators
  - [ ] Test validation service
  - [ ] Test middleware integration

## Dev Notes

### 技术栈与约束

- **框架:** Express + TypeScript
- **验证库:** zod 或 express-validator
- **依赖:** Request Routing Service (C.3.1)
- **性能要求:** P99 < 50ms（验证应快速）

### 验证器类型定义

```typescript
// src/types/validation.types.ts

/**
 * 验证规则类型
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'enum' | 'regex' | 'custom';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  message: string;
  custom?: (value: unknown) => boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  code: number;
  message: string;
}

/**
 * 请求体验证配置
 */
export interface RequestValidationConfig {
  validateBasic: boolean;  // 验证 basic 字段
  validateData: boolean;    // 验证 data 字段
  validateBusiness: boolean; // 验证业务规则
}
```

### 通用验证器

```typescript
// src/services/validators/common.validators.ts

import { ValidationRule } from '../types/validation.types';

/**
 * 必需字段验证器
 */
export const requiredValidator: ValidationRule = {
  field: 'required',
  type: 'required',
  message: 'Field is required',
};

/**
 * 字符串验证器
 */
export const stringValidator = (options: {
  min?: number;
  max?: number;
  pattern?: RegExp;
}): ValidationRule => ({
  field: 'string',
  type: 'string',
  ...options,
  message: options.pattern
    ? 'Invalid format'
    : `String length must be between ${options.min} and ${options.max}`,
});

/**
 * 数值验证器
 */
export const numberValidator = (options: {
  min?: number;
  max?: number;
  integer?: boolean;
}): ValidationRule => ({
  field: 'number',
  type: 'number',
  ...options,
  message: `Number must be between ${options.min} and ${options.max}`,
});

/**
 * 枚举验证器
 */
export const enumValidator = (
  allowedValues: string[],
  fieldName: string
): ValidationRule => ({
  field: fieldName,
  type: 'enum',
  enum: allowedValues,
  message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
});

/**
 * 地址验证器
 */
export const addressValidator: ValidationRule = {
  field: 'address',
  type: 'regex',
  pattern: /^[a-zA-Z0-9]{20,60}$/,
  message: 'Invalid address format',
};

/**
 * 金额验证器（支持小数）
 */
export const amountValidator = (options: {
  min?: number;
  max?: number;
  precision?: number;  // 最大小数位数
}): ValidationRule => ({
  field: 'amount',
  type: 'custom',
  ...options,
  message: `Amount must be between ${options.min} and ${options.max}`,
  custom: (value: unknown) => {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return false;
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num <= (options.min || 0)) {
      return false;
    }
    if (options.max && num > options.max) {
      return false;
    }
    if (options.precision !== undefined) {
      const decimals = String(num).split('.')[1]?.length || 0;
      if (decimals > options.precision) {
        return false;
      }
    }
    return true;
  },
});
```

### 请求体验证器

```typescript
// src/services/validators/request.validators.ts

import { ValidationRule } from '../types/validation.types';
import {
  requiredValidator,
  stringValidator,
  enumValidator,
  amountValidator,
} from './common.validators';

/**
 * API 请求 basic 字段验证规则
 */
export const basicFieldValidators: ValidationRule[] = [
  {
    field: 'appid',
    type: 'required',
    message: 'appid is required',
  },
  {
    field: 'appid',
    type: 'string',
    min: 10,
    max: 64,
    message: 'appid must be 10-64 characters',
  },
  {
    field: 'nonce',
    type: 'required',
    message: 'nonce is required',
  },
  {
    field: 'nonce',
    type: 'string',
    min: 8,
    max: 128,
    message: 'nonce must be 8-128 characters',
  },
  {
    field: 'timestamp',
    type: 'required',
    message: 'timestamp is required',
  },
  {
    field: 'timestamp',
    type: 'custom',
    message: 'timestamp must be a valid Unix timestamp',
    custom: (value: unknown) => {
      const ts = Number(value);
      return !isNaN(ts) && ts > 0 && ts <= 9999999999999;
    },
  },
  {
    field: 'sign',
    type: 'required',
    message: 'sign is required',
  },
  {
    field: 'sign',
    type: 'string',
    min: 64,
    max: 128,
    message: 'sign must be 64-128 characters (HMAC-SHA256)',
  },
];

/**
 * enterprise_id 验证规则
 */
export const enterpriseIdValidator: ValidationRule[] = [
  {
    field: 'enterprise_id',
    type: 'string',
    min: 10,
    max: 64,
    message: 'enterprise_id must be 10-64 characters',
  },
];

/**
 * 金额验证规则
 */
export const amountValidators: ValidationRule[] = [
  {
    field: 'amount',
    type: 'required',
    message: 'amount is required',
  },
  amountValidator({ min: 0.00000001, max: 999999999999, precision: 8 }),
];

/**
 * 币种验证规则
 */
export const currencyValidators: ValidationRule[] = [
  {
    field: 'currency',
    type: 'required',
    message: 'currency is required',
  },
  enumValidator(
    ['BTC', 'ETH', 'USDT', 'USDC', 'DAI', 'BCH', 'LTC', 'XRP'],
    'currency'
  ),
];
```

### 验证服务

```typescript
// src/services/validation.service.ts

import { Request, Response, NextFunction } from 'express';
import {
  ValidationResult,
  ValidationError,
  ValidationRule,
  RequestValidationConfig,
} from '../types/validation.types';
import { errorMapper } from './error-mapper.service';

export interface ValidationServiceConfig {
  config: RequestValidationConfig;
}

/**
 * 请求体验证服务
 */
export class ValidationService {
  private config: RequestValidationConfig;

  constructor(config?: Partial<ValidationServiceConfig>) {
    this.config = {
      validateBasic: config?.config?.validateBasic ?? true,
      validateData: config?.config?.validateData ?? true,
      validateBusiness: config?.config?.validateBusiness ?? true,
    };
  }

  /**
   * 验证请求体
   */
  validateRequest(body: unknown, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];

    if (!body || typeof body !== 'object') {
      return {
        valid: false,
        errors: [
          {
            field: 'body',
            code: 40001,
            message: 'Request body is required and must be an object',
          },
        ],
      };
    }

    const requestBody = body as Record<string, unknown>;

    for (const rule of rules) {
      const value = requestBody[rule.field];

      // 必填验证
      if (rule.required || rule.type === 'required') {
        if (value === undefined || value === null || value === '') {
          errors.push({
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} is required`,
          });
          continue;
        }
      }

      // 如果值为空且不是必填，跳过后续验证
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // 类型验证
      const error = this.validateField(value, rule);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(
    value: unknown,
    rule: ValidationRule
  ): ValidationError | null {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a string`,
          };
        }
        if (rule.min !== undefined && value.length < rule.min) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} must be at least ${rule.min} characters`,
          };
        }
        if (rule.max !== undefined && value.length > rule.max) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} must be at most ${rule.max} characters`,
          };
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `Invalid format for ${rule.field}`,
          };
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be a number`,
          };
        }
        if (rule.min !== undefined && num < rule.min) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} must be at least ${rule.min}`,
          };
        }
        if (rule.max !== undefined && num > rule.max) {
          return {
            field: rule.field,
            code: 40001,
            message: rule.message || `${rule.field} must be at most ${rule.max}`,
          };
        }
        if (rule.integer && !Number.isInteger(num)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `${rule.field} must be an integer`,
          };
        }
        break;

      case 'enum':
        if (rule.enum && !rule.enum.includes(value as string)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message ||
              `${rule.field} must be one of: ${rule.enum.join(', ')}`,
          };
        }
        break;

      case 'custom':
        if (rule.custom && !rule.custom(value)) {
          return {
            field: rule.field,
            code: 40002,
            message: rule.message || `Invalid value for ${rule.field}`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * 获取验证结果
   */
  getErrorResponse(result: ValidationResult, traceId: string) {
    if (result.valid) {
      return null;
    }

    const firstError = result.errors[0];
    return errorMapper.mapError(
      {
        code: firstError.code,
        message: result.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('; '),
      },
      traceId
    );
  }
}
```

### 验证中间件

```typescript
// src/middleware/validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/jwt.types';
import { ValidationService } from '../services/validation.service';
import { basicFieldValidators } from '../services/validators/request.validators';
import { errorMapper } from '../services/error-mapper.service';

/**
 * 创建请求体验证中间件
 */
export function createValidationMiddleware(
  validators: { basic?: ValidationRule[]; data?: ValidationRule[] } = {}
) {
  const validationService = new ValidationService();

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const traceId = (req as any).traceId || 'unknown';
    const contentType = req.headers['content-type'];

    // 验证 Content-Type
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!contentType || !contentType.includes('application/json')) {
        res.status(400).json(
          errorMapper.mapError(
            {
              code: 40002,
              message: 'Content-Type must be application/json',
            },
            traceId
          )
        );
        return;
      }
    }

    // 验证 basic 字段（如果需要）
    if (validators.basic && req.body?.basic) {
      const basicResult = validationService.validateRequest(
        req.body.basic,
        validators.basic
      );

      if (!basicResult.valid) {
        const error = validationService.getErrorResponse(basicResult, traceId);
        res.status(400).json(error);
        return;
      }
    }

    // 验证 data 字段（如果需要）
    if (validators.data && req.body?.data) {
      const dataResult = validationService.validateRequest(
        req.body.data,
        validators.data
      );

      if (!dataResult.valid) {
        const error = validationService.getErrorResponse(dataResult, traceId);
        res.status(400).json(error);
        return;
      }
    }

    // 将验证结果附加到请求
    (req as any).validationResult = {
      valid: true,
      validatedAt: new Date().toISOString(),
    };

    next();
  };
}

/**
 * 默认请求体验证中间件（验证 basic 字段）
 */
export const defaultValidationMiddleware = createValidationMiddleware({
  basic: basicFieldValidators,
});
```

### API 端点验证规则配置

```typescript
// src/config/validation-rules.ts

import { ValidationRule } from '../types/validation.types';
import {
  requiredValidator,
  stringValidator,
  numberValidator,
  enumValidator,
  amountValidator,
} from '../services/validators/common.validators';

/**
 * 企业管理端点验证规则
 */
export const enterpriseValidationRules: {
  create: ValidationRule[];
  update: ValidationRule[];
} = {
  create: [
    {
      field: 'name',
      type: 'required',
      message: 'Enterprise name is required',
    },
    {
      field: 'name',
      type: 'string',
      min: 2,
      max: 200,
      message: 'Enterprise name must be 2-200 characters',
    },
    {
      field: 'business_license',
      type: 'required',
      message: 'Business license is required',
    },
    {
      field: 'business_license',
      type: 'string',
      min: 10,
      max: 50,
      message: 'Invalid business license format',
    },
  ],
  update: [
    {
      field: 'name',
      type: 'string',
      min: 2,
      max: 200,
      message: 'Enterprise name must be 2-200 characters',
    },
  ],
};

/**
 * 支付端点验证规则
 */
export const paymentValidationRules: {
  create: ValidationRule[];
} = {
  create: [
    {
      field: 'unit_id',
      type: 'required',
      message: 'Unit ID is required',
    },
    {
      field: 'unit_id',
      type: 'string',
      min: 10,
      max: 64,
      message: 'Invalid unit ID format',
    },
    {
      field: 'amount',
      type: 'required',
      message: 'Amount is required',
    },
    amountValidator({ min: 0.00000001, max: 999999999999, precision: 8 }),
    {
      field: 'currency',
      type: 'required',
      message: 'Currency is required',
    },
    enumValidator(
      ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'],
      'currency'
    ),
    {
      field: 'recipient_address',
      type: 'required',
      message: 'Recipient address is required',
    },
    {
      field: 'recipient_address',
      type: 'string',
      min: 20,
      max: 60,
      message: 'Invalid recipient address format',
    },
    {
      field: 'memo',
      type: 'string',
      max: 200,
      message: 'Memo must be at most 200 characters',
    },
  ],
};

/**
 * 划拨端点验证规则
 */
export const transferValidationRules: {
  create: ValidationRule[];
} = {
  create: [
    {
      field: 'from_unit_id',
      type: 'required',
      message: 'Source unit ID is required',
    },
    {
      field: 'to_unit_id',
      type: 'required',
      message: 'Destination unit ID is required',
    },
    {
      field: 'amount',
      type: 'required',
      message: 'Amount is required',
    },
    amountValidator({ min: 0.00000001, max: 999999999999, precision: 8 }),
    {
      field: 'currency',
      type: 'required',
      message: 'Currency is required',
    },
    enumValidator(
      ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'],
      'currency'
    ),
  ],
};

/**
 * 归集端点验证规则
 */
export const poolingValidationRules: {
  create: ValidationRule[];
} = {
  create: [
    {
      field: 'from_accounts',
      type: 'required',
      message: 'Source accounts are required',
    },
    {
      field: 'from_accounts',
      type: 'custom',
      message: 'from_accounts must be a non-empty array',
      custom: (value: unknown) =>
        Array.isArray(value) && value.length > 0,
    },
    {
      field: 'to_account_id',
      type: 'required',
      message: 'Destination account ID is required',
    },
    {
      field: 'currency',
      type: 'required',
      message: 'Currency is required',
    },
    enumValidator(
      ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'],
      'currency'
    ),
  ],
};
```

### 项目结构

```
openplatform-api-service/
├── src/
│   ├── types/
│   │   └── validation.types.ts              # 验证类型定义
│   │
│   ├── services/
│   │   ├── validation.service.ts            # 验证服务
│   │   └── validators/
│   │       ├── common.validators.ts         # 通用验证器
│   │       └── request.validators.ts        # 请求体验证器
│   │
│   ├── middleware/
│   │   └── validation.middleware.ts         # 验证中间件
│   │
│   └── config/
│       └── validation-rules.ts              # API 端点验证规则
│
└── tests/
    └── unit/
        ├── validation.service.test.ts       # 验证服务测试
        └── validation.middleware.test.ts    # 验证中间件测试
```

### 性能考虑

- 验证器应为纯函数，无副作用
- 复杂验证（如正则表达式）应预编译
- 验证失败应快速返回，避免不必要的后续处理
- 可考虑使用 zod 进行 schema 验证，性能更好

### 与 Story C.3.1 的集成

1. **中间件顺序:** Validation → Permission Check → Request Routing
2. **验证结果:** 附加到 `req.validationResult`
3. **错误处理:** 验证失败直接返回 400，不继续路由

### 请求处理流程

```
Request Flow:
1. Signature Verification (C.1.1) → Extract appid
2. JWT Middleware (C.1.2) → Validate token
3. Binding Validation (C.2.1) → Validate binding
4. Permission Check (C.2.2) → Verify permissions
5. Request Validation (C.3.2) → Validate request format ⬅️ 当前 Story
6. Request Routing (C.3.1) → Forward to backend
7. Response → Return to caller
```

### 参考文献

- [Source: docs/planning-artifacts/epics.md#Story-C.3.2]
- [Source: docs/planning-artifacts/architecture.md#API-Gateway-详细结构]
- [Story C.3.1: Request Routing](/docs/implementation-artifacts/c-3-1-request-routing.md)
- [Story C.2.2: Permission Check Middleware](/docs/implementation-artifacts/c-2-2-permission-check-middleware.md)

## Dev Agent Record

### Agent Model Used

MiniMax-M2.1

### Debug Log References

### Completion Notes List

### File List

**New Files:**
- `openplatform-api-service/src/types/validation.types.ts` - 验证类型定义
- `openplatform-api-service/src/services/validation.service.ts` - 验证服务
- `openplatform-api-service/src/services/validators/common.validators.ts` - 通用验证器
- `openplatform-api-service/src/services/validators/request.validators.ts` - 请求体验证器
- `openplatform-api-service/src/middleware/validation.middleware.ts` - 验证中间件
- `openplatform-api-service/src/config/validation-rules.ts` - API 端点验证规则
- `openplatform-api-service/tests/unit/validation.service.test.ts` - 验证服务测试
- `openplatform-api-service/tests/unit/validation.middleware.test.ts` - 验证中间件测试
