# 文档索引

本仓库同时包含**对外接入契约**、**平台内部接口**和**研发过程文档**。请先按下表确认文档面向的读者，避免把内部接口当作开放平台接口。

| 文档 | 面向 | 说明 |
| --- | --- | --- |
| [thirdparty-integration-guide.md](./thirdparty-integration-guide.md)（源文件）/ [.html](./thirdparty-integration-guide.html)（分发包） | 第三方开发者 | 对外接入指南（17 章：入驻、签名、OAuth、业务接口、回调、错误码、SDK、附录）。以 md 为准，修改后手工同步更新 html。 |
| [third-party-api-error-codes.md](./third-party-api-error-codes.md) | 第三方开发者 + 实现维护者 | Custody `/api/third-party/**` 全部业务错误码（触发条件、按接口归属、非业务码兜底）。SDK 的 `CustodyErrorCode` / `CustodyErrorCodes` 由 [scripts/generate-error-codes.mjs](./scripts/generate-error-codes.mjs) 从此文件生成。 |
| [signature-spec.md](./signature-spec.md) | 第三方开发者 + 实现维护者 | 通用消息签名规范：Basic / Resource 两种认证结构及签名算法。 |
| [callback-webhook-spec.md](./callback-webhook-spec.md) | 第三方开发者 + 实现维护者 | 回调推送规范：事件类型、请求头、验签、重试、幂等与最佳实践。 |
| [custody-openplatform-api.yaml](./custody-openplatform-api.yaml) | 平台内部 | **Custody 后端上游** OpenAPI，不是网关对外接口。开发者调用的是 `/api/thirdparty/*`（见接入指南）。 |
| [api/README.md](./api/README.md) | 平台内部 / 开发者门户 | 门户内部 API（登录、应用、账单、用户），不是开放平台业务接口；部分路径尚未与当前实现对齐，以 `/api/v1/*` 实现为准。 |
| [plans/](./plans/)、[implementation-artifacts/](./implementation-artifacts/)、[planning-artifacts/](./planning-artifacts/) | 研发过程 | 计划、实施记录、PRD/架构；不作为对外契约。 |
| [architecture/frontend-guide.md](./architecture/frontend-guide.md)、[prd-cregis-custody-2026-02-02-cn.md](./prd-cregis-custody-2026-02-02-cn.md) | 内部 | 开发者门户前端架构规范与主 PRD。 |
| [scripts/verify-integration-guide.mjs](./scripts/verify-integration-guide.mjs) | 维护者 | 路由覆盖校验脚本，检查网关路由是否都已写入接入指南。 |
| [scripts/generate-error-codes.mjs](./scripts/generate-error-codes.mjs) | 维护者 | 从错误码清单生成 SDK 常量、按接口映射，以及 `generated/` 下的文档表格。 |
| [demo.html](./demo.html) | 非文档 / 页面快照 | 开发者门户页面的抓取快照，仅供查看，不是文档，也不作为任何契约。 |

## 阅读顺序

第三方开发者：接入指南 → 消息签名规范 → 回调推送规范。

事实来源优先级：**代码 > 接入指南 > 规范文档**。两份规范与接入指南第 4 / 5 / 14 章互为交叉引用；若文字不一致，以接入指南对应章节为准，并在 [code-defects-from-doc-review.md](../openplatform-api-service/docs/code-defects-from-doc-review.md) 登记。

## 维护规则

文档以代码为准。修改网关路由后必须运行 `node docs/scripts/verify-integration-guide.mjs`，并同步更新 `thirdparty-integration-guide.md` 与 `thirdparty-integration-guide.html`。

新增/删除网关路由时，同步更新 [scripts/verify-integration-guide.mjs](./scripts/verify-integration-guide.mjs) 中的 `EXPECTED_FORWARDED_ROUTES` 与 `LOCAL_ROUTES`，并确保脚本输出 `forwarded=23 local=6 total=29` 且 md/html 均为 `all 29 routes documented`（本仓库当前基数）。

修改 [third-party-api-error-codes.md](./third-party-api-error-codes.md) 后必须运行 `node docs/scripts/generate-error-codes.mjs`，再同步接入指南 15.2 与两份 SDK README 中的错误码表。已知文档缺陷记录在 [code-defects-from-doc-review.md](../openplatform-api-service/docs/code-defects-from-doc-review.md)。
