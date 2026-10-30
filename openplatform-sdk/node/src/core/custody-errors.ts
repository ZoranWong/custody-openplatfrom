/**
 * Custody (`/api/third-party/**`) error codes.
 *
 * GENERATED from docs/third-party-api-error-codes.md by
 * docs/scripts/generate-error-codes.mjs — do not edit by hand.
 */

/** Business error codes thrown by the custody backend behind the gateway. */
export const CustodyErrorCode = {
  ONLY_ACQUIRING_ACCOUNT_ALLOWED: 120042,
  ACCOUNT_BALANCE_NOT_ENOUGH: 300004,
  TASK_NOT_FOUND: 400001,
  INIT_BOARD_FAILED: 400005,
  ACCOUNT_NOT_EXIST: 400006,
  BOARD_EXIST: 400008,
  OPERATION_NOT_SUPPORT: 400011,
  CREATE_ADDRESS_FAILED: 400012,
  UPDATE_ACCOUNT_FAILED: 400013,
  MERCHANT_ACCOUNT_NOT_EXIST: 400026,
  WHITELIST_UPDATE_IN_PROGRESS: 400027,
  BOARD_NOT_EXIST: 400030,
  CREATE_VAULT_FAILED: 400036,
  ACCOUNT_UNIT_NOT_EXIST: 400042,
  ACCOUNT_GROUP_NOT_ACTIVATED: 400048,
  CONTRACT_FACTORY_DEPLOY_FAILED: 400056,
  ACCOUNT_UNIT_NAME_EXIST: 400062,
  PUBLIC_KEY_EXIST: 400067,
  SIGNER_NOT_EXIST_OR_NOT_ENOUGH: 400070,
  ACCOUNT_POOLING: 400083,
  PASSWORD_FORMAT_ERROR: 400099,
  INVALID_PAYOUT_AMOUNT: 400101,
  ENERGY_PERIOD_NOT_START: 400102,
  THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS: 400103,
  MERCHANT_NOT_EXIST: 400109,
  INIT_TREASURY_UNIT_FAILED: 400112,
  BOARD_UPDATE_IN_PROGRESS: 400119,
  FUNDFLOW_UPDATE_IN_PROGRESS: 400120,
  MERCHANT_PROJECT_NOT_EXIST: 400127,
  PAY_TO_ADDRESS_EXCEED_LIMIT: 400214,
  COIN_ACCOUNT_ALREADY_EXISTS: 400215,
  NETWORK_NOT_SUPPORT: 400216,
  CREATE_MERCHANT_FAILED: 400438,
  ADDRESS_BALANCE_NOT_ENOUGH: 400440,
  ADDRESS_BALANCE_CHECK_FAILED: 400441,
} as const;

export type CustodyErrorCodeValue = (typeof CustodyErrorCode)[keyof typeof CustodyErrorCode];

export type CustodyErrorCategory = 'VALIDATION' | 'AUTH' | 'STATE' | 'CAPACITY' | 'INFRA';

export interface CustodyErrorInfo {
  /** Symbolic name as returned in `message` (e.g. `BOARD_NOT_EXIST`). */
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
  [CustodyErrorCode.ONLY_ACQUIRING_ACCOUNT_ALLOWED]: {
    constant: 'ONLY_ACQUIRING_ACCOUNT_ALLOWED',
    meaning: "Only platform-created acquiring accounts can be used as the pooling source",
    meaningZh: "归集来源账户不是 platform 创建的 acquiring 账户",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.ACCOUNT_BALANCE_NOT_ENOUGH]: {
    constant: 'ACCOUNT_BALANCE_NOT_ENOUGH',
    meaning: "Payout account balance is insufficient (or the freeze-row update matched 0 rows; pooling found no usable address / estimated amount below the requested amount)",
    meaningZh: "出金账户余额不足；账户冻结行更新影响行数为 0；归集时无可用地址或预估金额不足",
    category: 'CAPACITY',
    retryable: false,
  },
  [CustodyErrorCode.TASK_NOT_FOUND]: {
    constant: 'TASK_NOT_FOUND',
    meaning: "taskId is empty, the task does not exist, or the task does not belong to this resource key",
    meaningZh: "`taskId` 为空、按 taskId / 主键都查不到、或任务 ecode 与当前 key 不一致",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.INIT_BOARD_FAILED]: {
    constant: 'INIT_BOARD_FAILED',
    meaning: "Board threshold is invalid (<= 0 or greater than the guardian count), or the TrustVault initBoard call failed",
    meaningZh: "初始化 Board 时门限非法（≤0 或 > 守护人数），或 TrustVault `initBoard` 非 200",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.ACCOUNT_NOT_EXIST]: {
    constant: 'ACCOUNT_NOT_EXIST',
    meaning: "Account does not exist or does not belong to this company",
    meaningZh: "账户不存在或不属于当前企业：加币种引用外部账户、创建地址、出金、归集、修改资金流、修改白名单",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.BOARD_EXIST]: {
    constant: 'BOARD_EXIST',
    meaning: "The company already has an AVAILABLE or PENDING board; duplicate initialization is not allowed",
    meaningZh: "企业已有 `AVAILABLE` 或 `PENDING` 的 Board，不允许重复初始化",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.OPERATION_NOT_SUPPORT]: {
    constant: 'OPERATION_NOT_SUPPORT',
    meaning: "Unsupported operation (accountType not PAYIN/PAYOUT/PRIMARY, payout operation not payout/withdraw/allocate, or ecode mismatch when adding a user)",
    meaningZh: "添加用户时 ecode 与 key 所属企业不一致；地址查询的 accountType 非 PAYIN/PAYOUT/PRIMARY；出金 operation 非 payout/withdraw/allocate",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.CREATE_ADDRESS_FAILED]: {
    constant: 'CREATE_ADDRESS_FAILED',
    meaning: "TrustVault getAddress failed while adding a network or creating an address",
    meaningZh: "加币种新增网络、或按账户创建地址时，TrustVault `getAddress` 非 200",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.UPDATE_ACCOUNT_FAILED]: {
    constant: 'UPDATE_ACCOUNT_FAILED',
    meaning: "Unexpected error while creating a payout or submitting a task (catch-all)",
    meaningZh: "出金、提交任务的兜底 catch：任何非 `SparkException` 的异常",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.MERCHANT_ACCOUNT_NOT_EXIST]: {
    constant: 'MERCHANT_ACCOUNT_NOT_EXIST',
    meaning: "Account does not belong to the current ecode / unit when updating the whitelist",
    meaningZh: "CRM 错误码：白名单变更时账户不属于当前 ecode / unit",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.WHITELIST_UPDATE_IN_PROGRESS]: {
    constant: 'WHITELIST_UPDATE_IN_PROGRESS',
    meaning: "A whitelist change for this account is already PENDING",
    meaningZh: "同账户已有 `PENDING` 的白名单变更",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.BOARD_NOT_EXIST]: {
    constant: 'BOARD_NOT_EXIST',
    meaning: "The company has no AVAILABLE board (required for board update, fund control and whitelist changes)",
    meaningZh: "修改 Board、资金流、白名单时企业没有 `AVAILABLE` 的 Board",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.CREATE_VAULT_FAILED]: {
    constant: 'CREATE_VAULT_FAILED',
    meaning: "Project creation returned null or vault initialization failed during merchant registration",
    meaningZh: "三方注册企业时建项目返回 null，或 `ProjectInitHandler` 创建金库失败",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.ACCOUNT_UNIT_NOT_EXIST]: {
    constant: 'ACCOUNT_UNIT_NOT_EXIST',
    meaning: "Treasury unit does not exist, does not belong to this company, or was not created by this developer",
    meaningZh: "unit 不存在、不属于当前企业，或不是当前开发者创建的",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.ACCOUNT_GROUP_NOT_ACTIVATED]: {
    constant: 'ACCOUNT_GROUP_NOT_ACTIVATED',
    meaning: "Payout account is not activated (status = 0)",
    meaningZh: "出金账户 `status = 0`（未激活）",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.CONTRACT_FACTORY_DEPLOY_FAILED]: {
    constant: 'CONTRACT_FACTORY_DEPLOY_FAILED',
    meaning: "Contract factory deployment failed for the new network",
    meaningZh: "创建 unit、加币种时新网络的合约工厂部署失败",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.ACCOUNT_UNIT_NAME_EXIST]: {
    constant: 'ACCOUNT_UNIT_NAME_EXIST',
    meaning: "A custom treasury unit with this name already exists in the company",
    meaningZh: "自定义 unit 名称在企业内已存在",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.PUBLIC_KEY_EXIST]: {
    constant: 'PUBLIC_KEY_EXIST',
    meaning: "Public key is already used by another user, or the same email tried to change its public key",
    meaningZh: "公钥已被其他用户占用；或同一邮箱试图更换公钥",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.SIGNER_NOT_EXIST_OR_NOT_ENOUGH]: {
    constant: 'SIGNER_NOT_EXIST_OR_NOT_ENOUGH',
    meaning: "No signers available (guardians list empty, or the users have no public key bound)",
    meaningZh: "初始化 Board 时 guardians 为空；加币种下发资金流任务时 TrustVault 未返回签名人",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.ACCOUNT_POOLING]: {
    constant: 'ACCOUNT_POOLING',
    meaning: "This account is already being pooled (Redis pooling lock is held)",
    meaningZh: "该账户正在归集中（Redis 归集锁被占用）",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.PASSWORD_FORMAT_ERROR]: {
    constant: 'PASSWORD_FORMAT_ERROR',
    meaning: "Password is empty, shorter than 8 characters, or lacks 3 of upper / lower / digit / special",
    meaningZh: "密码为空、长度不足 8 位，或大小写/数字/特殊字符不足 3 类",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.INVALID_PAYOUT_AMOUNT]: {
    constant: 'INVALID_PAYOUT_AMOUNT',
    meaning: "Aggregated payout amount is <= 0",
    meaningZh: "出金 payTo 按地址聚合后总金额 ≤ 0",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.ENERGY_PERIOD_NOT_START]: {
    constant: 'ENERGY_PERIOD_NOT_START',
    meaning: "TRON energy rental failed during pooling",
    meaningZh: "归集时 TRON 能量租赁失败",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS]: {
    constant: 'THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS',
    meaning: "resourceAccessKey is empty, does not exist, or is not ACTIVE",
    meaningZh: "`resourceAccessKey` 为空、不存在或状态非 `ACTIVE`（除注册企业外所有接口）",
    category: 'AUTH',
    retryable: false,
  },
  [CustodyErrorCode.MERCHANT_NOT_EXIST]: {
    constant: 'MERCHANT_NOT_EXIST',
    meaning: "Merchant ecode is empty or the merchant does not exist",
    meaningZh: "企业 ecode 为空或企业不存在（注册企业的入驻编排链路）",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.INIT_TREASURY_UNIT_FAILED]: {
    constant: 'INIT_TREASURY_UNIT_FAILED',
    meaning: "TrustVault treasury unit initialization failed or returned a different account count",
    meaningZh: "TrustVault 初始化 unit 非 200，或返回账户数与请求不一致",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.BOARD_UPDATE_IN_PROGRESS]: {
    constant: 'BOARD_UPDATE_IN_PROGRESS',
    meaning: "A board change is already PENDING",
    meaningZh: "已有 `PENDING` 的 Board 变更",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.FUNDFLOW_UPDATE_IN_PROGRESS]: {
    constant: 'FUNDFLOW_UPDATE_IN_PROGRESS',
    meaning: "A fund-flow change for this vault account is already PENDING",
    meaningZh: "同金库账户已有 `PENDING` 的资金流变更",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST]: {
    constant: 'MERCHANT_PROJECT_NOT_EXIST',
    meaning: "No project found for the merchant / treasury unit",
    meaningZh: "按 key 的企业找不到项目；出金时按 unit 找不到项目",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.PAY_TO_ADDRESS_EXCEED_LIMIT]: {
    constant: 'PAY_TO_ADDRESS_EXCEED_LIMIT',
    meaning: "Too many payTo addresses (network limit, default 150); one-to-many payouts are not allowed when Travel Rule is enabled",
    meaningZh: "出金付款地址数超过网络上限（默认 150）；Travel Rule 开启时一对多付款",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.COIN_ACCOUNT_ALREADY_EXISTS]: {
    constant: 'COIN_ACCOUNT_ALREADY_EXISTS',
    meaning: "This coin + network already exists on the unit",
    meaningZh: "加币种时该币种 + 网络已存在",
    category: 'STATE',
    retryable: false,
  },
  [CustodyErrorCode.NETWORK_NOT_SUPPORT]: {
    constant: 'NETWORK_NOT_SUPPORT',
    meaning: "The new network is not supported by the project",
    meaningZh: "加币种的新网络不在项目支持网络内",
    category: 'VALIDATION',
    retryable: false,
  },
  [CustodyErrorCode.CREATE_MERCHANT_FAILED]: {
    constant: 'CREATE_MERCHANT_FAILED',
    meaning: "Merchant persistence returned null during merchant registration",
    meaningZh: "三方注册企业时企业落库返回 null",
    category: 'INFRA',
    retryable: true,
  },
  [CustodyErrorCode.ADDRESS_BALANCE_NOT_ENOUGH]: {
    constant: 'ADDRESS_BALANCE_NOT_ENOUGH',
    meaning: "Source address is empty, or its available amount (excluding held funds and in-flight payouts) cannot cover this payout",
    meaningZh: "出金来源地址为空；或地址可用额（扣除隔离资金与其他在途出金）不足以覆盖本单",
    category: 'CAPACITY',
    retryable: false,
  },
  [CustodyErrorCode.ADDRESS_BALANCE_CHECK_FAILED]: {
    constant: 'ADDRESS_BALANCE_CHECK_FAILED',
    meaning: "Could not acquire the payout address lock (held by another request, or Redis is unavailable)",
    meaningZh: "出金地址锁获取失败、被其他请求持有，或 Redis 不可用（fail-closed）",
    category: 'INFRA',
    retryable: true,
  },
};

/**
 * Custody paths → the error codes that path can return (doc §2).
 * Keys are gateway `routeId`s from `openplatform-api-service/src/config/forward-routes.ts`.
 */
export const CustodyErrorsByRoute: Record<string, readonly number[]> = {
  'treasury-list': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-list-unit-account': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-address-by-account': [CustodyErrorCode.ACCOUNT_UNIT_NOT_EXIST, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-address': [CustodyErrorCode.OPERATION_NOT_SUPPORT, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-activities': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-transfer-out': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-transfer-in': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-fund-records': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-unit-fund-records': [CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-create-unit-address-by-account': [CustodyErrorCode.CREATE_ADDRESS_FAILED, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-create-unit-address': [CustodyErrorCode.ACCOUNT_NOT_EXIST, CustodyErrorCode.CREATE_ADDRESS_FAILED, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-create': [CustodyErrorCode.CONTRACT_FACTORY_DEPLOY_FAILED, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.INIT_TREASURY_UNIT_FAILED, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST],
  'treasury-create-custom': [CustodyErrorCode.CONTRACT_FACTORY_DEPLOY_FAILED, CustodyErrorCode.ACCOUNT_UNIT_NAME_EXIST, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.INIT_TREASURY_UNIT_FAILED, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST],
  'merchant-register': [CustodyErrorCode.CREATE_VAULT_FAILED, CustodyErrorCode.PUBLIC_KEY_EXIST, CustodyErrorCode.PASSWORD_FORMAT_ERROR, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.MERCHANT_NOT_EXIST, CustodyErrorCode.CREATE_MERCHANT_FAILED],
  'user-add': [CustodyErrorCode.OPERATION_NOT_SUPPORT, CustodyErrorCode.PUBLIC_KEY_EXIST, CustodyErrorCode.PASSWORD_FORMAT_ERROR, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'board-init': [CustodyErrorCode.INIT_BOARD_FAILED, CustodyErrorCode.BOARD_EXIST, CustodyErrorCode.SIGNER_NOT_EXIST_OR_NOT_ENOUGH, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST],
  'board-update': [CustodyErrorCode.BOARD_NOT_EXIST, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.BOARD_UPDATE_IN_PROGRESS, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST],
  'treasury-add-coins': [CustodyErrorCode.ACCOUNT_NOT_EXIST, CustodyErrorCode.CREATE_ADDRESS_FAILED, CustodyErrorCode.ACCOUNT_UNIT_NOT_EXIST, CustodyErrorCode.CONTRACT_FACTORY_DEPLOY_FAILED, CustodyErrorCode.SIGNER_NOT_EXIST_OR_NOT_ENOUGH, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST, CustodyErrorCode.COIN_ACCOUNT_ALREADY_EXISTS, CustodyErrorCode.NETWORK_NOT_SUPPORT],
  'treasury-payout': [CustodyErrorCode.ACCOUNT_BALANCE_NOT_ENOUGH, CustodyErrorCode.ACCOUNT_NOT_EXIST, CustodyErrorCode.OPERATION_NOT_SUPPORT, CustodyErrorCode.UPDATE_ACCOUNT_FAILED, CustodyErrorCode.ACCOUNT_UNIT_NOT_EXIST, CustodyErrorCode.ACCOUNT_GROUP_NOT_ACTIVATED, CustodyErrorCode.INVALID_PAYOUT_AMOUNT, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.MERCHANT_PROJECT_NOT_EXIST, CustodyErrorCode.PAY_TO_ADDRESS_EXCEED_LIMIT, CustodyErrorCode.ADDRESS_BALANCE_NOT_ENOUGH, CustodyErrorCode.ADDRESS_BALANCE_CHECK_FAILED],
  'treasury-pooling': [CustodyErrorCode.ACCOUNT_BALANCE_NOT_ENOUGH, CustodyErrorCode.ACCOUNT_NOT_EXIST, CustodyErrorCode.ACCOUNT_UNIT_NOT_EXIST, CustodyErrorCode.ACCOUNT_POOLING, CustodyErrorCode.ENERGY_PERIOD_NOT_START, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-submit-task': [CustodyErrorCode.TASK_NOT_FOUND, CustodyErrorCode.UPDATE_ACCOUNT_FAILED, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
  'treasury-fund-control-update': [CustodyErrorCode.ACCOUNT_NOT_EXIST, CustodyErrorCode.BOARD_NOT_EXIST, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS, CustodyErrorCode.FUNDFLOW_UPDATE_IN_PROGRESS],
  'treasury-whiltlist-update': [CustodyErrorCode.MERCHANT_ACCOUNT_NOT_EXIST, CustodyErrorCode.WHITELIST_UPDATE_IN_PROGRESS, CustodyErrorCode.BOARD_NOT_EXIST, CustodyErrorCode.THIRD_PARTY_RESOURCE_KEY_NOT_EXISTS],
};
