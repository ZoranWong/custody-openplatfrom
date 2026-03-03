---
stepsCompleted: []
workflowType: 'prd'
classification:
  projectType: 'Backend Infrastructure - 数据库迁移'
  domain: 'Fintech - 加密货币托管 (Crypto Custody)'
  complexity: 'High'
  projectContext: '存量系统扩展 - MySQL迁移'
---

# PRD v2 - MySQL数据库迁移

**Author:** zoran wang
**Date:** 2026-02-27
**Version:** 2.0
**Status:** Draft

## 1. 项目背景

### 1.1 当前状态

- **存储方案**：当前使用内存存储（In-Memory）
- **适用场景**：MVP演示和开发测试
- **数据持久化**：应用重启后数据丢失

### 1.2 迁移目标

- **存储方案**：MySQL 8.0+
- **适用场景**：生产环境部署
- **数据持久化**：数据持久化存储，支持数据恢复

### 1.3 迁移范围

| 模块 | 数据表 | 优先级 |
|------|--------|--------|
| 开发者账号 | developers | P0 |
| 应用信息 | applications | P0 |
| ISV企业信息 | isv_enterprises | P0 |
| 授权信息 | authorizations | P0 |
| API调用日志 | api_logs | P1 |
| Webhook配置 | webhooks | P1 |
| 指标数据 | metrics | P2 |
| 追踪数据 | traces | P2 |

## 2. 功能需求

### 2.1 核心需求

**F-01: 数据持久化**
- 所有业务数据存储到MySQL
- 支持事务处理
- 支持数据备份恢复

**F-02: 连接池管理**
- MySQL连接池配置
- 连接超时处理
- 连接复用

**F-03: 数据迁移脚本**
- 初始化数据库表结构
- 迁移现有内存数据到MySQL
- 数据校验

**F-04: 配置管理**
- 数据库连接配置外部化
- 支持多环境配置（dev/staging/prod）

### 2.2 数据模型

#### 2.2.1 developers 表

```sql
CREATE TABLE developers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  company VARCHAR(255),
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
);
```

#### 2.2.2 applications 表

```sql
CREATE TABLE applications (
  id VARCHAR(36) PRIMARY KEY,
  developer_id VARCHAR(36) NOT NULL,
  app_name VARCHAR(100) NOT NULL,
  app_description TEXT,
  app_secret VARCHAR(64) NOT NULL,
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
  INDEX idx_developer (developer_id),
  INDEX idx_app_secret (app_secret)
);
```

#### 2.2.3 isv_enterprises 表

```sql
CREATE TABLE isv_enterprises (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(36) NOT NULL,
  enterprise_name VARCHAR(255) NOT NULL,
  enterprise_id VARCHAR(100),
  business_license_url TEXT,
  contact_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  kyb_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  kyb_reviewed_at TIMESTAMP NULL,
  kyb_reviewed_by VARCHAR(36),
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_app (app_id),
  INDEX idx_kyb_status (kyb_status)
);
```

#### 2.2.4 authorizations 表

```sql
CREATE TABLE authorizations (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  enterprise_id VARCHAR(36),
  authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (enterprise_id) REFERENCES isv_enterprises(id) ON DELETE SET NULL,
  INDEX idx_app_user (app_id, user_id),
  INDEX idx_enterprise (enterprise_id)
);
```

#### 2.2.5 api_logs 表

```sql
CREATE TABLE api_logs (
  id VARCHAR(36) PRIMARY KEY,
  trace_id VARCHAR(36),
  app_id VARCHAR(36) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_headers JSON,
  request_body JSON,
  response_status INT,
  response_body JSON,
  response_time INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_app_time (app_id, created_at),
  INDEX idx_trace (trace_id),
  INDEX idx_endpoint (endpoint)
);
```

#### 2.2.6 webhooks 表

```sql
CREATE TABLE webhooks (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(36) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(64),
  event_types JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_app (app_id)
);
```

#### 2.2.7 metrics 表

```sql
CREATE TABLE metrics (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(36) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(20, 2),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_app_period (app_id, period_start),
  INDEX idx_type (metric_type)
);
```

#### 2.2.8 traces 表

```sql
CREATE TABLE traces (
  id VARCHAR(36) PRIMARY KEY,
  trace_id VARCHAR(36) NOT NULL,
  app_id VARCHAR(36),
  service_name VARCHAR(100),
  operation_name VARCHAR(255),
  span_id VARCHAR(36),
  parent_span_id VARCHAR(36),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INT,
  status ENUM('pending', 'completed', 'error') DEFAULT 'pending',
  tags JSON,
  logs JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trace (trace_id),
  INDEX idx_app (app_id),
  INDEX idx_time (start_time)
);
```

### 2.3 迁移策略

**方案：一次性迁移**
- 停止服务
- 导出内存数据
- 初始化MySQL表结构
- 导入数据
- 验证数据完整性
- 启动服务

**回滚方案**
- 保留内存存储作为降级方案
- 配置开关控制存储选择

## 3. 非功能需求

### 3.1 性能需求

- 连接池大小：默认10，最大50
- 查询超时：30秒
- 支持并发请求：1000 QPS

### 3.2 安全需求

- 密码加密存储（bcrypt）
- SQL注入防护（参数化查询）
- 敏感数据脱敏

### 3.3 可用性需求

- 数据库连接重试机制
- 连接池耗尽告警
- 数据备份策略

## 4. 实施计划

### 4.1 Phase 1: 基础设施

- [ ] 创建数据库连接模块
- [ ] 配置管理
- [ ] 连接池实现

### 4.2 Phase 2: 数据模型

- [ ] 创建表结构定义
- [ ] 实现Repository层
- [ ] 迁移现有数据

### 4.3 Phase 3: 功能集成

- [ ] 替换内存存储
- [ ] 集成测试
- [ ] 性能测试

## 5. 验收标准

- [ ] 所有API响应时间 < 200ms（P99）
- [ ] 数据持久化验证通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 支持生产环境部署
