# 文档索引

本仓库同时包含**对外接入契约**、**平台内部接口**和**研发过程文档**。请先按下表确认文档面向的读者，避免把内部接口当作开放平台接口。

| 文档 | 面向 | 说明 |
| --- | --- | --- |
| [thirdparty-integration-guide.md](./thirdparty-integration-guide.md) / [.html](./thirdparty-integration-guide.html) | 第三方开发者 | 对外接入指南（17 章：入驻、签名、OAuth、业务接口、回调、错误码、SDK、附录）。 |
| [signature-spec.md](./signature-spec.md) | 第三方开发者 + 实现维护者 | 通用消息签名规范：Basic / Resource 两种认证结构及签名算法。 |
| [callback-webhook-spec.md](./callback-webhook-spec.md) | 第三方开发者 + 实现维护者 | 回调推送规范：事件类型、请求头、验签、重试、幂等与最佳实践。 |
| [custody-openplatform-api.yaml](./custody-openplatform-api.yaml) | 平台内部 | **Custody 后端上游** OpenAPI，不是网关对外接口。开发者调用的是 `/api/thirdparty/*`（见接入指南）。 |
| [api/README.md](./api/README.md) | 平台内部 / 开发者门户 | 门户内部 API（登录、应用、账单、用户），不是开放平台业务接口。 |
| [plans/](./plans/)、[implementation-artifacts/](./implementation-artifacts/)、[planning-artifacts/](./planning-artifacts/) | 研发过程 | 计划、实施记录、PRD/架构；不作为对外契约。 |
| [architecture/frontend-guide.md](./architecture/frontend-guide.md)、[prd-cregis-custody-2026-02-02-cn.md](./prd-cregis-custody-2026-02-02-cn.md) | 内部 | 开发者门户前端架构规范与主 PRD。 |
| [scripts/verify-integration-guide.mjs](./scripts/verify-integration-guide.mjs) | 维护者 | 路由覆盖校验脚本，检查网关路由是否都已写入接入指南。 |

## 阅读顺序

第三方开发者：接入指南 → 消息签名规范 → 回调推送规范。签名规范与回调规范是接入指南对应章节的独立完整版本，两者冲突时以代码为准。

## 维护规则

文档以代码为准。修改网关路由后必须运行 `node docs/scripts/verify-integration-guide.mjs`，并同步更新 `thirdparty-integration-guide.md` 与 `thirdparty-integration-guide.html`。已知文档缺陷记录在 `openplatform-api-service/docs/code-defects-from-doc-review.md`。
