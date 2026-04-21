/**
 * Cregis OpenPlatform Node.js SDK
 * Type definitions
 */

/**
 * SDK Configuration
 */
export interface SDKConfig {
  /** API Base URL */
  baseUrl: string;
  /** Application ID (UUID) */
  appId: string;
  /** Application Secret */
  appSecret: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * OAuth Token Response
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Authorization Result
 */
export interface AuthorizationResult {
  authorizeId: string;
  authorizeUrl?: string;
  expiresIn?: number;
}

/**
 * Basic Info for Signature
 */
export interface BasicInfo {
  appId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

/**
 * Basic Info with Authorization
 */
export interface BasicInfoWithAuthorization extends BasicInfo {
  authorizationId: string;
}

/**
 * Standard API Response
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  traceId?: string;
}

/**
 * Pagination Response
 */
export interface PaginatedResponse<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ Treasury Unit Types ============

/**
 * Business Scope types
 */
export type BusinessScope = 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';

/**
 * Topology types
 */
export type Topology = 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';

/**
 * Coin Info
 */
export interface CoinInfo {
  coinId: string;
  network: string;
}

/**
 * Guardian for multi-signature
 */
export interface Guardian {
  /** Guardian identifier (email) */
  identity: string;
}

/**
 * Fund Control Rule
 */
export interface FundControlRule {
  guardians: string[];
  threshold: string;
  perTransferLimit: string;
  dailyTransferLimit: string;
}

/**
 * Manager Configuration
 */
export interface ManagerConfig {
  coinId: string;
  fundControlRules: FundControlRule[];
}

/**
 * Create Treasury Unit Request
 */
export interface CreateTreasuryUnitRequest {
  businessScope: BusinessScope;
  topology: Topology;
  coinIds: CoinInfo[];
  primaryManager: ManagerConfig[];
  payoutManager: ManagerConfig[];
  riskManager: ManagerConfig[];
}

/**
 * Account Types
 */
export type AccountType =
  | 'PRIMARY'
  | 'PAYIN'
  | 'PAYOUT'
  | 'QUARANTINE'
  | 'RECEIVABLE'
  | 'PRIMARY_ISOLATION'
  | 'PAYIN_ISOLATION'
  | 'PAYOUT_ISOLATION';

/**
 * Treasury Unit Status
 */
export type TreasuryUnitStatus = 'ACTIVATED' | 'FROZEN' | 'CLOSED' | 'PENDING';

/**
 * Account in Treasury Unit
 */
export interface TreasuryAccount {
  accountName: string;
  accountType: string;
}

/**
 * Treasury Unit (Financial Unit)
 */
export interface TreasuryUnit {
  id: number;
  ecode: string;
  name: string;
  custodyServiceMode: BusinessScope;
  coinIds: CoinInfo[];
  accounts: TreasuryAccount[];
  status: TreasuryUnitStatus;
  creationType: string;
  createTime?: string;
}

/**
 * Create Treasury Unit Response
 */
export interface CreateTreasuryUnitResponse {
  id: number;
  ecode: string;
  name: string;
  status: string;
  networks: string[];
  createTime: string;
}

/**
 * Account Address
 */
export interface AccountAddress {
  address: string;
  accountType: string;
  coinId?: string;
  network?: string;
}

/**
 * Get Unit Address Request
 */
export interface GetUnitAddressRequest {
  unitId: number;
  accountType?: string;
  coinId?: string;
  network?: string;
  pageSize?: number;
  pageNum?: number;
}

// ============ Payout Types ============

/**
 * Payout Target
 */
export interface PayoutTarget {
  address: string;
  amount: string;
}

/**
 * Payout Operation types
 */
export type PayoutOperation = 'withdraw' | 'allocate' | 'payout';

/**
 * Create Payout Request
 */
export interface CreatePayoutRequest {
  unitId: number;
  payTo: PayoutTarget[];
  coinId: string;
  network: string;
  operation?: PayoutOperation;
  orderId?: string;
  merchantType: string;
}

/**
 * Payout Order Status
 */
export type PayoutOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Payout Order
 */
export interface PayoutOrder {
  id: number;
  orderId: string;
  unitId: number;
  unitEcode: string;
  coinId: string;
  network: string;
  amount: string;
  fee: string;
  status: PayoutOrderStatus;
  fromAddress: string;
  toAddress: string;
  txHash?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============ Task Types ============

/**
 * Signature Task Status
 */
export type TaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

/**
 * Signature Task
 */
export interface SignatureTask {
  id: number;
  taskId: string;
  unitId: number;
  unitEcode: string;
  taskType: string;
  status: TaskStatus;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Submit Task Request
 */
export interface SubmitTaskRequest {
  signatures?: Record<string, string[]>;
  confirmed: boolean;
}

// ============ Transaction Types ============

/**
 * Activity Types
 */
export type ActivityType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'POOL'
  | 'ALLOCATE'
  | 'LOCK'
  | 'RELEASE';

/**
 * Activity Direction
 */
export type ActivityDirection = 'IN' | 'OUT';

/**
 * Activity Status
 */
export type ActivityStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Activity Record
 */
export interface Activity {
  id: number;
  activityId: string;
  unitId: number;
  unitEcode: string;
  coinId: string;
  network: string;
  type: ActivityType;
  direction: ActivityDirection;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  fee?: string;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  status: ActivityStatus;
  createdAt: string;
}

/**
 * Query Condition
 */
export interface QueryCondition {
  key: string;
  value: string | number;
  oper?: '=' | '!=' | '>' | '<' | 'like';
  join?: 'and' | 'or';
}

/**
 * Pagination Query Options
 */
export interface PaginationQuery {
  pageIndex?: number;
  pageSize?: number;
  sortFields?: string;
  queryList?: QueryCondition[];
}

// ============ Fund Record Types ============

/**
 * Transaction Type for Fund Records
 */
export type TxType =
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ALLOCATE_IN'
  | 'ALLOCATE_OUT'
  | 'POOL_IN'
  | 'POOL_OUT'
  | 'GAS_OUT'
  | 'FEE_OUT';

/**
 * Fund Record
 */
export interface FundRecord {
  id: number;
  recordId: string;
  unitId: number;
  unitEcode: string;
  coinId: string;
  network: string;
  accountType: AccountType;
  txType: TxType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  fee?: string;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  createdAt: string;
}

// ============ Callback Types ============

/**
 * Callback Payload - message body pushed from Cregis platform
 */
export interface CallbackPayload {
  /** Application ID */
  appId: string;
  /** Event type (present for global Application callbacks) */
  event?: CallbackEventType;
  /** Unix timestamp in milliseconds */
  timestamp: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Callback Event Types - events pushed from Cregis platform
 */
export type CallbackEventType =
  | 'authorization.created'
  | 'authorization.revoked'
  | 'authorization.expired'
  | 'transaction.submitted'
  | 'transaction.confirming'
  | 'transaction.completed'
  | 'transaction.failed'
  | 'task.approved'
  | 'task.rejected'

/**
 * HTTP Request object interface (compatible with Express/Koa)
 * For Express: req.headers, req.body
 * For Koa: ctx.request.headers, ctx.request.body
 */
export interface CallbackRequest {
  headers: {
    'x-signature'?: string;
    'x-timestamp'?: string;
    'x-event'?: string;
  };
  body: CallbackPayload;
}
