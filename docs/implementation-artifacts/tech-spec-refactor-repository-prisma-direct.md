---
title: 'Refactor Repository Layer - Prisma Direct Integration'
slug: 'refactor-repository-prisma-direct'
created: '2026-04-17'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Prisma 7.4.2', 'MySQL', '@prisma/adapter-mariadb']
files_to_modify:
  - 'openplatform-api-service/src/database/prisma-client.ts'
  - 'openplatform-api-service/src/repositories/repository.interfaces.ts'
  - 'openplatform-api-service/src/repositories/repository.factory.ts'
  - 'openplatform-api-service/src/repositories/implementations/*.ts'
  - 'openplatform-api-service/src/services/*.service.ts'
  - 'openplatform-api-service/src/controllers/*.controller.ts'
  - 'openplatform-api-service/src/routes/v1/*.routes.ts'
  - 'openplatform-api-service/scripts/seed-admin.ts'
  - 'openplatform-api-service/.env'
  - 'openplatform-api-service/package.json'
  - 'openplatform-api-service/tests/unit/binding-validation.service.test.ts'
  - 'openplatform-api-service/tests/unit/binding-validation.middleware.test.ts'
  - 'openplatform-api-service/tests/integration/mysql-storage.test.ts'
  - 'openplatform-api-service/tests/integration/mysql-performance.test.ts'
code_patterns: ['Repository Pattern', 'Dependency Injection', 'Typed Prisma Client', 'Singleton', 'Prisma Types Direct']
test_patterns: ['vitest', 'supertest', 'in-memory mocks for deleted adapters']
---

# Tech-Spec: Refactor Repository Layer - Prisma Direct Integration

**Created:** 2026-04-17
**Status:** 开发基本完成，修复 Code Review 发现的问题

## Overview

### Problem Statement

当前 Repository 层通过 `StorageAdapter` 抽象层间接访问 Prisma Client，使用 `TABLE_TO_MODEL_MAP` 硬编码映射 + 动态 `this.prisma[modelName]` 调用，**完全丢失 TypeScript 类型安全**。同时 file/memory 适配器是死代码，增加了不必要的复杂度。`resource-authorization.service.ts` 绕过 Repository 工厂直连 Prisma Client，破坏了统一的数据访问层设计。

### Solution

1. 移除 `StorageAdapter` 抽象和 file/memory 适配器
2. 所有 Repository 实现直接注入类型化的 `PrismaClient`（通过 `@prisma/adapter-mariadb`）
3. Repository 接口保留，但方法签名直接使用 Prisma 生成类型
4. 统一 Prisma Client 初始化，简化 `prisma-client.ts`
5. 修复绕过工厂的 Service，统一走 Repository 层
6. 修复所有 Controller/Service 中的字段名对齐问题（Prisma 字段名 vs 旧领域类型字段名）

### Scope

**In Scope:**
- 删除 `storage.adapter.ts` 及 file/memory 实现
- 重构 `repository.factory.ts` — 移除 `createAdapter()`，改为直接注入 PrismaClient
- 重构 6 个 Repository 实现类 — 直接调用 `this.prisma.xxxModel`
- 简化 `prisma-client.ts` — 使用 `@prisma/adapter-mariadb` 驱动
- 修复 `resource-authorization.service.ts` — 改用 Repository
- 修复所有 Controller/Service 中 Prisma 字段名对齐问题
- 修复 Controller 中缺失的方法（`findByFilters`, `count`, `findAll`）
- 修复 seed-admin 脚本（dotenv 加载 + passwordHash 字段）
- 更新 `.env` 中 `STORAGE_TYPE` 从 `file` 改为 `mysql`
- 修复 4 个引用已删除文件的测试

**Out of Scope:**
- 修改 Prisma schema
- 修改数据库结构
- 新增功能（纯内部重构）

## Context for Development

### Codebase Patterns

- **Prisma ORM 7.4.2** — MySQL provider，需要 `@prisma/adapter-mariadb` 运行时驱动
- **Repository Pattern** — 接口定义方法签名 + 具体实现直接调用 Prisma
- **Factory Pattern** — `getIsvUserRepository()` 等工厂函数返回单例，`resetRepositories()` 用于测试
- **关键发现**: TypeScript 领域类型的字段名与 Prisma schema **不匹配**，已全部修复为 Prisma 字段名
  - `ISVUser.password` → `passwordHash`
  - `Application.name` → `appName`，`description` → `appDescription`
  - `Admin.password` → `passwordHash`
  - `Binding` 领域类型与 Prisma 模型完全不同 → 删除 BindingRepository
  - `EndpointPermission` 的领域类型使用 `path`/`required_permissions` vs Prisma `endpoint`/`permission`

### Technical Decisions

1. **Repository 直接注入 PrismaClient** — 不再需要 StorageAdapter 中间层
2. **保留 Repository 接口抽象** — 便于测试 mock 和未来替换数据源
3. **Prisma Client 单例** — 通过 `getPrismaClient()` 全局获取，使用 `@prisma/adapter-mariadb`
4. **字段名对齐** — Controller/Service 全面使用 Prisma 字段名，废弃旧领域类型映射
5. **删除不存在的功能** — `BindingRepository`、`permittedUsers`、`updateApplicationPermissions` 因无对应 Prisma 模型而删除

## Implementation Plan

### Completed Tasks

- [x] Task 1: 简化 Prisma Client 初始化 — 使用 `@prisma/adapter-mariadb` 驱动
- [x] Task 2: 删除 StorageAdapter 及相关死代码（storage.adapter.ts, file-storage.adapter.ts, mysql-storage.adapter.ts, repository.ts base, binding.repository.ts）
- [x] Task 3: 移除 BaseRepository，改用直接实现（每个 impl 自行管理 PrismaClient）
- [x] Task 4: 重构 6 个 Repository 实现 — 直接调用 `this.prisma.xxxModel.xxx()`
- [x] Task 5: 重构 Repository 工厂函数 — 单例 + 直接 new Impl(getPrismaClient())
- [x] Task 6: 修复绕过工厂的 Service — `resource-authorization.service.ts` 改用 `getOauthResourceRepository()`
- [x] Task 7: 修复 Controller/Service 字段名对齐 — admin-auth.controller.ts, isv-auth.controller.ts, admin-auth.service.ts, isv-user.service.ts, permission-check.service.ts
- [x] Task 8: 修复 Routes — isv.routes.ts（permittedUsers, callbackUrl, updateApplicationPermissions）, admin-auth.routes.ts（getDeveloperHistory）
- [x] Task 9: 修复 seed-admin 脚本 — 添加 dotenv/config, passwordHash 字段
- [x] Task 10: 更新 .env — STORAGE_TYPE=file → mysql
- [x] Task 11: 修复类型文件 — binding.types.ts, isv.types.ts, permission.types.ts 移除 storage.adapter 导入
- [x] Task 12: 验证 — tsc --noEmit 零报错，应用启动成功，数据库连接正常

- [x] Task 13: 删除 4 个引用已删除 adapter 的测试文件
- [x] Task 14: authorization.repository.ts upsert 并发安全 — 使用 Prisma 原生 upsert
- [x] Task 15: seed-admin.ts 默认密码改为环境变量/随机生成
- [x] Task 16: findByFilters where clause 改为 Prisma.IsvDeveloperWhereInput
- [x] Task 17: 修复测试 mock 数据 (isv-user.service.test.ts, resource-authorization.service.test.ts)

### Acceptance Criteria

- [x] AC 1: TypeScript 类型检查通过（tsc --noEmit 零报错）
- [x] AC 2: 无 StorageAdapter 引用残留
- [x] AC 3: Service 层无直接 getPrismaClient() 调用
- [x] AC 4: Repository 方法编译期类型推断正确
- [x] AC 5: Prisma Client 成功连接 MySQL 且 health check 通过
- [ ] AC 6: 所有测试通过（待修复 4 个测试文件后验证）
- [ ] AC 7: upsert 并发安全（待 Task 14）
- [ ] AC 8: seed 脚本不再硬编码默认密码（待 Task 15）

## Additional Context

### Dependencies

- Prisma 7.4.2 + MySQL（已配置）
- `@prisma/adapter-mariadb` 运行时必需（Prisma 7 需要驱动适配器）
- Prisma Client 已生成（`npx prisma generate`）
- `.env` 中 `STORAGE_TYPE=mysql`，`DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` 已配置

### Testing Strategy

- 编译检查：`tsc --noEmit` 已通过
- 应用启动：数据库连接成功，health check 返回 `database: connected`
- 待修复：4 个测试文件引用已删除的 adapter，需删除或重写
- 待验证：修复后运行 `npm run test` 确认全部通过

### Security Notes (from Code Review)

1. **upsert 竞态条件** — `authorization.repository.ts` 的 upsert 方法不是原子的，高并发时可能创建重复记录
2. **seed 默认密码** — `Admin123!` 硬编码在代码中，需改为环境变量
3. **全量查询统计** — `getDeveloperStats` 拉 10000 条记录做内存统计，数据量大时有 OOM 风险

### Notes

- **Prisma 7 需要 adapter** — 不同于 Prisma 6 的 `datasources` 选项，Prisma 7 要求通过构造函数传入 `adapter`
- 此重构是纯内部重构，不影响外部 API 行为
- Repository 接口保留用于测试 mock，如果未来不需要可删除
- 本次重构同时修复了大量因类型不匹配导致的 Controller/Service bug，超出了纯 Repository 层的范围
