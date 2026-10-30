#!/usr/bin/env node
/**
 * Generates error-code registries from docs/third-party-api-error-codes.md.
 *
 *   node docs/docs/scripts/generate-error-codes.mjs
 *
 * Outputs:
 *   openplatform-sdk/node/src/core/custody-errors.ts
 *   openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/error/CustodyErrorCodes.java
 *
 * The markdown doc is the single source of truth — edit it, then re-run this.
 * Categories (VALIDATION / AUTH / STATE / CAPACITY / INFRA / UNKNOWN) and the
 * retryable flag are curated in CATEGORY below because the doc does not encode them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC = path.join(root, 'docs/third-party-api-error-codes.md');
const doc = readFileSync(DOC, 'utf8');

const CATEGORY = {
  ACCOUNT_BALANCE_NOT_ENOUGH: ['CAPACITY', false],
  TASK_NOT_FOUND: ['STATE', false],
  INIT_BOARD_FAILED: ['STATE', false],
  ACCOUNT_NOT_EXIST: ['STATE', false],
  BOARD_EXIST: ['STATE', false],
  OPERATION_NOT_SUPPORT: ['VALIDATION', false],
  CREATE_ADDRESS_FAILED: ['INFRA', true],
  UPDATE_ACCOUNT_FAILED: ['INFRA', true],
  WHITELIST_UPDATE_IN_PROGRESS: ['STATE', false],
  BOARD_NOT_EXIST: ['STATE', false],
  CREATE_VAULT_FAILED: ['INFRA', true],
  ACCOUNT_UNIT_NOT_EXIST: ['STATE', false],
  ACCOUNT_GROUP_NOT_ACTIVATED: ['STATE', false],
  CONTRACT_FACTORY_DEPLOY_FAILED: ['INFRA', true],
  ACCOUNT_UNIT_NAME_EXIST: ['STATE', false],
  PUBLIC_KEY_EXIST: ['STATE', false],
  SIGNER_NOT_EXIST_OR_NOT_ENOUGH: ['STATE', false],
  ACCOUNT_POOLING: ['STATE', false],
  PASSWORD_FORMAT_ERROR: ['VALIDATION', false],
  INVALID_PAYOUT_AMOUNT: ['VALIDATION', false],
  ENERGY_PERIOD_NOT_START: ['INFRA', true],
  THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS: ['AUTH', false],
  MERCHANT_NOT_EXIST: ['STATE', false],
  INIT_TREASURY_UNIT_FAILED: ['INFRA', true],
  BOARD_UPDATE_IN_PROGRESS: ['STATE', false],
  FUNDFLOW_UPDATE_IN_PROGRESS: ['STATE', false],
  MERCHANT_PROJECT_NOT_EXIST: ['STATE', false],
  PAY_TO_ADDRESS_EXCEED_LIMIT: ['VALIDATION', false],
  COIN_ACCOUNT_ALREADY_EXISTS: ['STATE', false],
  NETWORK_NOT_SUPPORT: ['VALIDATION', false],
  CREATE_MERCHANT_FAILED: ['INFRA', true],
  ADDRESS_BALANCE_NOT_ENOUGH: ['CAPACITY', false],
  ADDRESS_BALANCE_CHECK_FAILED: ['INFRA', true],
};

// English meanings shown to SDK callers. The markdown doc stays Chinese; the
// javadoc / doc tables keep the Chinese text, the code-facing `meaning` is English.
const MEANING_EN = {
  ONLY_ACQUIRING_ACCOUNT_ALLOWED: 'Only platform-created acquiring accounts can be used as the pooling source',
  ACCOUNT_BALANCE_NOT_ENOUGH: 'Payout account balance is insufficient (or the freeze-row update matched 0 rows; pooling found no usable address / estimated amount below the requested amount)',
  TASK_NOT_FOUND: 'taskId is empty, the task does not exist, or the task does not belong to this resource key',
  INIT_BOARD_FAILED: 'Board threshold is invalid (<= 0 or greater than the guardian count), or the TrustVault initBoard call failed',
  ACCOUNT_NOT_EXIST: 'Account does not exist or does not belong to this company',
  BOARD_EXIST: 'The company already has an AVAILABLE or PENDING board; duplicate initialization is not allowed',
  OPERATION_NOT_SUPPORT: 'Unsupported operation (accountType not PAYIN/PAYOUT/PRIMARY, payout operation not payout/withdraw/allocate, or ecode mismatch when adding a user)',
  CREATE_ADDRESS_FAILED: 'TrustVault getAddress failed while adding a network or creating an address',
  UPDATE_ACCOUNT_FAILED: 'Unexpected error while creating a payout or submitting a task (catch-all)',
  MERCHANT_ACCOUNT_NOT_EXIST: 'Account does not belong to the current ecode / unit when updating the whitelist',
  WHITELIST_UPDATE_IN_PROGRESS: 'A whitelist change for this account is already PENDING',
  BOARD_NOT_EXIST: 'The company has no AVAILABLE board (required for board update, fund control and whitelist changes)',
  CREATE_VAULT_FAILED: 'Project creation returned null or vault initialization failed during merchant registration',
  ACCOUNT_UNIT_NOT_EXIST: 'Treasury unit does not exist, does not belong to this company, or was not created by this developer',
  ACCOUNT_GROUP_NOT_ACTIVATED: 'Payout account is not activated (status = 0)',
  CONTRACT_FACTORY_DEPLOY_FAILED: 'Contract factory deployment failed for the new network',
  ACCOUNT_UNIT_NAME_EXIST: 'A custom treasury unit with this name already exists in the company',
  PUBLIC_KEY_EXIST: 'Public key is already used by another user, or the same email tried to change its public key',
  SIGNER_NOT_EXIST_OR_NOT_ENOUGH: 'No signers available (guardians list empty, or the users have no public key bound)',
  ACCOUNT_POOLING: 'This account is already being pooled (Redis pooling lock is held)',
  PASSWORD_FORMAT_ERROR: 'Password is empty, shorter than 8 characters, or lacks 3 of upper / lower / digit / special',
  INVALID_PAYOUT_AMOUNT: 'Aggregated payout amount is <= 0',
  ENERGY_PERIOD_NOT_START: 'TRON energy rental failed during pooling',
  THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS: 'resourceAccessKey is empty, does not exist, or is not ACTIVE',
  MERCHANT_NOT_EXIST: 'Merchant ecode is empty or the merchant does not exist',
  INIT_TREASURY_UNIT_FAILED: 'TrustVault treasury unit initialization failed or returned a different account count',
  BOARD_UPDATE_IN_PROGRESS: 'A board change is already PENDING',
  FUNDFLOW_UPDATE_IN_PROGRESS: 'A fund-flow change for this vault account is already PENDING',
  MERCHANT_PROJECT_NOT_EXIST: 'No project found for the merchant / treasury unit',
  PAY_TO_ADDRESS_EXCEED_LIMIT: 'Too many payTo addresses (network limit, default 150); one-to-many payouts are not allowed when Travel Rule is enabled',
  COIN_ACCOUNT_ALREADY_EXISTS: 'This coin + network already exists on the unit',
  NETWORK_NOT_SUPPORT: 'The new network is not supported by the project',
  CREATE_MERCHANT_FAILED: 'Merchant persistence returned null during merchant registration',
  ADDRESS_BALANCE_NOT_ENOUGH: 'Source address is empty, or its available amount (excluding held funds and in-flight payouts) cannot cover this payout',
  ADDRESS_BALANCE_CHECK_FAILED: 'Could not acquire the payout address lock (held by another request, or Redis is unavailable)',
};

// ---- §1 错误码总表 -------------------------------------------------------
const s1 = doc.slice(doc.indexOf('## 1. 错误码总表'), doc.indexOf('## 2. 按接口归属'));
const codes = [];
for (const line of s1.split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*`([A-Z_]+)`\s*\|\s*(.+?)\s*\|\s*$/);
  if (m) codes.push({ code: Number(m[1]), constant: m[2], meaning: m[3] });
}
if (codes.length < 30) throw new Error(`parsed only ${codes.length} codes — doc format changed?`);
const EXTRA = {
  // CRM / custody codes that appear in §2 but come from another error enum.
  400026: { constant: 'MERCHANT_ACCOUNT_NOT_EXIST', meaning: 'CRM 错误码：白名单变更时账户不属于当前 ecode / unit', category: 'STATE', retryable: false },
  120042: { constant: 'ONLY_ACQUIRING_ACCOUNT_ALLOWED', meaning: '归集来源账户不是 platform 创建的 acquiring 账户', category: 'VALIDATION', retryable: false },
};
for (const c of codes) {
  if (!CATEGORY[c.constant]) throw new Error(`missing CATEGORY for ${c.constant}`);
  [c.category, c.retryable] = CATEGORY[c.constant];
}
for (const [code, info] of Object.entries(EXTRA)) codes.push({ code: Number(code), ...info });
for (const c of codes) {
  c.meaningEn = MEANING_EN[c.constant];
  if (!c.meaningEn) throw new Error(`missing MEANING_EN for ${c.constant}`);
}
codes.sort((a, b) => a.code - b.code);

// ---- §2 按接口归属 -------------------------------------------------------
const s2 = doc.slice(doc.indexOf('## 2. 按接口归属'), doc.indexOf('## 3. 上游透传码'));
const SECTION_ROUTES = {
  '2.1': ['treasury-create'],
  '2.2': ['treasury-create-custom'],
  '2.3': ['merchant-register'],
  '2.4': ['user-add'],
  '2.5': ['board-init'],
  '2.6': ['board-update'],
  '2.7': ['treasury-add-coins'],
  '2.8': ['treasury-payout'],
  '2.9': ['treasury-pooling'],
  '2.10': ['treasury-submit-task'],
  '2.11': ['treasury-fund-control-update'],
  '2.12': ['treasury-whiltlist-update'],
};

// §2.13 / §2.14 enumerate one row per custody path — map each row to its routeId.
const PATH_ROUTES = {
  '/list/{key}': 'treasury-list',
  '/list-unit-account/{key}/{unitId}': 'treasury-list-unit-account',
  '/get-unit-address/{key}/{cusAccountId}': 'treasury-address-by-account',
  '/get-unit-address/{key}': 'treasury-address',
  '/activities/{key}': 'treasury-activities',
  '/transfer-out-orders/{key}': 'treasury-transfer-out',
  '/transfer-in-orders/{key}': 'treasury-transfer-in',
  '/fund-records/{key}': 'treasury-fund-records',
  '/unit-fund-records/{key}': 'treasury-unit-fund-records',
  '/create-unit-address/{key}/{cusAccountId}/{number}': 'treasury-create-unit-address-by-account',
  '/create-unit-address/{key}/{unitId}/{accountTypy}/{network}/{coinId}/{number}': 'treasury-create-unit-address',
};
const byRoute = {};
const known = new Set(codes.map((c) => c.code));
for (const num of ['2.13', '2.14']) {
  const start = s2.indexOf(`### ${num} `);
  if (start < 0) throw new Error(`section ${num} not found`);
  const next = s2.slice(start + 1).search(/\n### \d+\.\d+ /);
  const body = next < 0 ? s2.slice(start) : s2.slice(start, start + 1 + next);
  for (const line of body.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*$/);
    if (!m) continue;
    const route = PATH_ROUTES[m[1].trim()];
    if (!route) throw new Error(`no routeId for custody path ${m[1]}`);
    byRoute[route] = [...new Set([...m[2].matchAll(/\b(\d{6})\b/g)].map((x) => Number(x[1])))].sort((a, b) => a - b);
  }
}

for (const [num, routes] of Object.entries(SECTION_ROUTES)) {
  const start = s2.indexOf(`### ${num} `);
  if (start < 0) throw new Error(`section ${num} not found`);
  const next = s2.slice(start + 1).search(/\n### \d+\.\d+ /);
  const body = next < 0 ? s2.slice(start) : s2.slice(start, start + 1 + next);
  const found = new Set();
  for (const m of body.matchAll(/\b(\d{6})\b/g)) {
    const code = Number(m[1]);
    if (known.has(code) || EXTRA[code]) found.add(code);
  }
  for (const r of routes) byRoute[r] = [...found].sort((a, b) => a - b);
}

// ---- emit TS -------------------------------------------------------------
const tsConst = codes.map((c) => `  ${c.constant}: ${c.code},`).join('\n');
const tsInfo = codes
  .map((c) => `  [CustodyErrorCode.${c.constant}]: {\n    constant: '${c.constant}',\n    meaning: ${JSON.stringify(c.meaningEn)},
    meaningZh: ${JSON.stringify(c.meaning)},\n    category: '${c.category}',\n    retryable: ${c.retryable},\n  },`)
  .join('\n');
const tsRoutes = Object.entries(byRoute)
  .map(([r, list]) => `  '${r}': [${list.map((n) => `CustodyErrorCode.${codes.find((c) => c.code === n).constant}`).join(', ')}],`)
  .join('\n');

writeFileSync(path.join(root, 'openplatform-sdk/node/src/core/custody-errors.ts'), `/**
 * Custody (\`/api/third-party/**\`) error codes.
 *
 * GENERATED from docs/third-party-api-error-codes.md by
 * docs/scripts/generate-error-codes.mjs — do not edit by hand.
 */

/** Business error codes thrown by the custody backend behind the gateway. */
export const CustodyErrorCode = {
${tsConst}
} as const;

export type CustodyErrorCodeValue = (typeof CustodyErrorCode)[keyof typeof CustodyErrorCode];

export type CustodyErrorCategory = 'VALIDATION' | 'AUTH' | 'STATE' | 'CAPACITY' | 'INFRA';

export interface CustodyErrorInfo {
  /** Symbolic name as returned in \`message\` (e.g. \`BOARD_NOT_EXIST\`). */
  constant: string;
  /** What the code means / when it is raised (English). */
  meaning: string;
  /** Chinese wording from docs/third-party-api-error-codes.md. */
  meaningZh: string;
  category: CustodyErrorCategory;
  /**
   * Whether a plain retry can help. Most custody business errors are sticky
   * (same request → same error); only infra/transient ones are flagged.
   * Callers must still review the meaning before retrying.
   */
  retryable: boolean;
}

export const CustodyErrorInfo: Record<number, CustodyErrorInfo> = {
${tsInfo}
};

/**
 * Custody paths → the error codes that path can return (doc §2).
 * Keys are gateway \`routeId\`s from \`openplatform-api-service/src/config/forward-routes.ts\`.
 */
export const CustodyErrorsByRoute: Record<string, readonly number[]> = {
${tsRoutes}
};
`);

// ---- emit Java -----------------------------------------------------------
const jConst = codes
  .map((c) => `    /** ${c.meaning.replace(/\*\//g, '*\\/')} */\n    ${c.constant}(${c.code}, "${c.category}", ${c.retryable}, ${JSON.stringify(c.meaningEn)}),`)
  .join('\n');
writeFileSync(
  path.join(root, 'openplatform-sdk/java/cregis-sdk-core/src/main/java/com/cregis/sdk/core/error/CustodyErrorCodes.java'),
  `package com.cregis.sdk.core.error;

/**
 * Custody (/api/third-party/**) error codes, as thrown through the gateway.
 *
 * GENERATED from docs/third-party-api-error-codes.md by
 * docs/scripts/generate-error-codes.mjs — do not edit by hand.
 */
public enum CustodyErrorCodes {
${jConst}
    ;

    private final int code;
    private final String category;
    private final boolean retryable;
    private final String meaning;

    CustodyErrorCodes(int code, String category, boolean retryable, String meaning) {
        this.code = code;
        this.category = category;
        this.retryable = retryable;
        this.meaning = meaning;
    }

    public int getCode() {
        return code;
    }

    /** VALIDATION / AUTH / STATE / CAPACITY / INFRA */
    public String getCategory() {
        return category;
    }

    /** Whether a plain retry can help (most business errors are sticky). */
    public boolean isRetryable() {
        return retryable;
    }

    /** Human-readable meaning / trigger conditions (English). */
    public String getMeaning() {
        return meaning;
    }

    /** Returns the enum constant for a numeric code, or {@code null} if unknown. */
    public static CustodyErrorCodes fromCode(int code) {
        for (CustodyErrorCodes value : values()) {
            if (value.code == code) {
                return value;
            }
        }
        return null;
    }
}
`);


// ---- emit markdown fragments (docs) --------------------------------------
const PARAM_ROUTE_NAMES = {
  'treasury-create': '创建财务单元 `POST /api/thirdparty/treasury/create`',
  'treasury-create-custom': '创建自定义结构 `POST /api/thirdparty/treasury/create-custom`',
  'merchant-register': '注册商户企业 `POST /api/thirdparty/merchant/register`',
  'user-add': '添加企业用户 `POST /api/thirdparty/user/add`',
  'board-init': '初始化 Board `POST /api/thirdparty/board/init`',
  'board-update': '修改 Board `POST /api/thirdparty/board/update`',
  'treasury-add-coins': '添加币种 `POST /api/thirdparty/treasury/add-coins`',
  'treasury-payout': '发起出金 `POST /api/thirdparty/treasury/payout`',
  'treasury-pooling': '发起归集 `POST /api/thirdparty/treasury/pooling`',
  'treasury-submit-task': '提交审批 `POST /api/thirdparty/treasury/submit-task/{taskId}`',
  'treasury-fund-control-update': '更新资金流规则 `POST /api/thirdparty/treasury/fund-control-update`',
  'treasury-whiltlist-update': '更新白名单 `POST /api/thirdparty/treasury/whitelist-update`',
  'treasury-list': '查询财务单元列表 `POST /api/thirdparty/treasury/list`',
  'treasury-list-unit-account': '查询账户列表 `POST /api/thirdparty/treasury/list-unit-account/{unitId}`',
  'treasury-address': '查询地址 `POST /api/thirdparty/treasury/address`',
  'treasury-address-by-account': '查询地址 `POST /api/thirdparty/treasury/address-by-account/{cusAccountId}`',
  'treasury-activities': '查询活动记录 `POST /api/thirdparty/treasury/activities`',
  'treasury-transfer-out': '查询出金订单 `POST /api/thirdparty/treasury/transfer-out-orders`',
  'treasury-transfer-in': '查询入金订单 `POST /api/thirdparty/treasury/transfer-in-orders`',
  'treasury-fund-records': '查询账户资金流水 `POST /api/thirdparty/treasury/fund-records`',
  'treasury-unit-fund-records': '查询单元资金流水 `POST /api/thirdparty/treasury/unit-fund-records`',
  'treasury-create-unit-address': '按单元+类型创建地址 `POST /api/thirdparty/treasury/create-unit-address/...`',
  'treasury-create-unit-address-by-account': '按账户创建地址 `POST /api/thirdparty/treasury/create-unit-address-by-account/...`',
};
const codeByNumber = Object.fromEntries(codes.map((c) => [c.code, c]));
const esc = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const mdTable = [
  '| `code` | 常量 | 分类 | 可重试 | 含义 / 触发条件 |',
  '|--------|------|------|--------|----------------|',
  ...codes.map((c) => `| \`${c.code}\` | \`${c.constant}\` | ${c.category} | ${c.retryable ? '是' : '否'} | ${esc(c.meaning)} |`),
].join('\n');

const mdByInterface = [
  '| 接口 | 可能返回的业务码 |',
  '|------|------------------|',
  ...Object.entries(byRoute).map(([r, list]) => {
    const codesText = list.length
      ? list.map((n) => `\`${n}\` ${codeByNumber[n].constant}`).join('<br>')
      : '（仅网关码，见第 15.1 节）';
    return `| ${PARAM_ROUTE_NAMES[r]} | ${codesText} |`;
  }),
].join('\n');

writeFileSync(path.join(root, 'docs/generated/error-codes-table.md'),
  `<!-- GENERATED by docs/scripts/generate-error-codes.mjs from docs/third-party-api-error-codes.md -->\n\n${mdTable}\n`);

writeFileSync(path.join(root, 'docs/generated/error-codes-by-interface.md'),
  `<!-- GENERATED by docs/scripts/generate-error-codes.mjs from docs/third-party-api-error-codes.md -->\n\n${mdByInterface}\n`);

console.log(`codes=${codes.length} routes=${Object.keys(byRoute).length}`);
for (const [r, list] of Object.entries(byRoute)) console.log(`  ${r}: ${list.join(',')}`);
