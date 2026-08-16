/**
 * Cregis OpenPlatform Node.js SDK
 * Complete type definitions aligned with custody API YAML specification
 */

// ============ Core Types ============

export interface SDKConfig {
  baseUrl: string;
  appId: string;
  appSecret: string;
  timeout?: number;
  debug?: boolean;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  traceId?: string;
}

export interface PaginatedResponse<T = unknown> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

// ============ Signature Types ============

export interface BasicInfo {
  appId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export interface BasicInfoWithAuthorization extends BasicInfo {
  authorizationId: string;
}

// ============ OAuth Types ============

export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthorizationResult {
  authorizeId: string;
  authorizeUrl?: string;
  expiresIn?: number;
}

export interface GetAuthorizationUrlRequest {
  permissions: string[];
  state: string;
  callback?: string;
  token?: string;
}

export interface VerifyOAuthTokenRequest {
  oauthToken: string;
}

// ============ Treasury Unit Types ============

export type BusinessScope = 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';
export type Topology = 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';
export type AccountType = 'PRIMARY' | 'PAYIN' | 'PAYOUT' | 'QUARANTINE' | 'RECEIVABLE' | 'GENERAL_GAS' | 'FREEZE' | 'DEPOSIT' | 'DIRTY';
export type TreasuryUnitStatus = 'ACTIVATED' | 'FROZEN' | 'CLOSED' | 'PENDING';

export interface CoinInfo {
  coinId: string;
  network: string;
}

export interface FundControlRule {
  guardians: string[];
  threshold: string;
  perTransferLimit: string;
  dailyTransferLimit: string;
}

export interface ManagerConfig {
  coinId: string;
  fundControlRules: FundControlRule[];
}

export interface WhiteListCreateRequest {
  network: string;
  address: string;
  alias?: string;
}

export interface AnyCallRule {
  guardians: string[];
  threshold: string;
  allowedCommands: string[];
}

export interface CreateTreasuryUnitRequest {
  unitName: string;
  businessScope: BusinessScope;
  businessPurpose?: string;
  topology: Topology;
  coinIds: CoinInfo[];
  autoSignUrl?: string;
  primaryManager: ManagerConfig[];
  primaryWhiteList?: WhiteListCreateRequest[];
  primaryAnycallRules?: AnyCallRule[];
  thirdPartyEcode?: string;
  remark?: string;
  payoutManager: ManagerConfig[];
  payinAnycallRules?: AnyCallRule[];
  payoutAnycallRules?: AnyCallRule[];
  riskAnycallRules?: AnyCallRule[];
}

export interface CreateTreasuryUnitResponse {
  id: number;
  name: string;
  ecode: string;
  vaultCode: string;
  groupCode: string;
  custodialBusinessScope: string;
  networks: string[];
  status: string;
  gmaId: string;
  caaFactoryAddresses: Array<{ network: string; address: string }>;
  factoryStatus: number;
  sort: number;
  remark: string;
  createTime: string;
  updateTime: string;
}

export interface TreasuryUnit {
  id: number;
  ecode: string;
  projectId: number;
  name: string;
  merchantType: string;
  custodyServiceMode: string;
  coinIds: CoinInfo[];
  accounts: Array<{ account_name: string; account_type: string }>;
  status: string;
  sort: number;
  creationType: string;
  developerId: string;
  remark: string;
  createTime: string;
  updateTime: string;
}

export interface GetUnitAddressRequest {
  unitId: number;
  accountType?: AccountType;
  pageSize?: number;
  pageNum?: number;
  coinId?: string;
  network?: string;
}

export interface CreateUnitAddressRequest {
  unitId: number;
  accountTypy: 'PRIMARY' | 'PAYOUT' | 'PAYIN';
  network: string;
  coinId: string;
  number: number;
}

export interface UnitAccount {
  id: number;
  ecode: string;
  vaultCode: string;
  vaultAccountId: string;
  projectId: number;
  treasuryUnitId: number;
  accountName: string;
  fundFlowCode: string;
  anycallCode: string;
  autoSignUrl: string;
  balance: number;
  freezeBalance: number;
  holdBalance: number;
  coinId: string;
  network: string;
  type: AccountType;
  status: number;
  income: number;
  outcome: number;
  isSmart: boolean;
  remark: string;
  createTime: string;
  updateTime: string;
}

// ============ Pooling Types ============

export interface PoolingRequest {
  unitId: number;
  amount: number;
  coinId: string;
  network: string;
  lang?: string;
  note?: string;
  includes?: string[];
  excludes?: string[];
}

// ============ Payout Types ============

export type PayoutOperation = 'withdraw' | 'allocate' | 'payout';
export type MerchantType = 'NON_FINANCIAL_CORPORATE' | 'REGULATED_VASP' | 'INTERNAL_SYSTEM';

export interface PayTo {
  to: string;
  amount: number;
}

export interface TravelRuleRequest {
  referenceId: string;
  payload: string;
}

export interface CreatePayoutRequest {
  payTo: PayTo[];
  from?: string;
  unitId: number;
  coinId: string;
  network: string;
  operation?: string;
  fromAddress?: string;
  toCusAccountId?: number;
  username?: string;
  userId?: string;
  orderId?: string;
  note?: string;
  lang?: string;
  initiator?: string;
  merchantType: MerchantType;
  travelRule: TravelRuleRequest;
}

export interface PayoutOrder {
  id: number;
  taskId: string;
  orderId: string;
  inputAmount: string;
  totalAmount: number;
  fundFlowCode: string;
  orderState: string;
  payToList: PayTo[];
  note: string;
  businessId: string;
  coinId: string;
  network: string;
  txId: string;
  fee: string;
  createTime: string;
  updateTime: string;
}

// ============ Task Types ============

export interface SubmitTaskRequest {
  signatures?: Record<string, string[]>;
  confirmed: boolean;
}

export interface WCCIPCmdAuditTask {
  id: number;
  taskId: string;
  vaultCode: string;
  projectId: number;
  accountId: string;
  accountType: string;
  submitter: string;
  ecode: string;
  cmdType: string;
  businessId: string;
  state: string;
  businessType: string;
  taskType: string;
  taskOperation: string;
  initiator: string;
  createTime: string;
  updateTime: string;
}

// ============ Query Types ============

export interface QueryCondition {
  key: string;
  value: string | number;
  oper?: '=' | '!=' | '>' | '<' | 'like';
  join?: 'and' | 'or';
}

export interface PaginationQuery {
  pageIndex?: number;
  pageSize?: number;
  sortFields?: string;
  queryList?: QueryCondition[];
}

export interface PageRequest {
  pageSize?: number;
  pageNum?: number;
  sortFields?: string;
}

// ============ Activity Types ============

export interface ProjectUnitActivity {
  id: number;
  ecode: string;
  projectId: number;
  treasuryUnitId: number;
  cusAccountId: number;
  accountType: string;
  cpAccountId: number;
  coinId: string;
  network: string;
  type: string;
  amount: number;
  direction: 'IN' | 'OUT';
  orderId: string;
  businessId: string;
  status: string;
  travelRuleStatus: string;
  kytStatus: string;
  createTime: string;
  updateTime: string;
}

// ============ Transfer Order Types ============

export interface ProjectUnitTransferOutOrder {
  id: number;
  taskId: string;
  orderId: string;
  inputAmount: string;
  totalAmount: number;
  fundFlowCode: string;
  orderState: string;
  payToList: PayTo[];
  note: string;
  businessId: string;
  coinId: string;
  network: string;
  txId: string;
  fee: string;
  ecode: string;
  vaultCode: string;
  projectId: number;
  cusAccountId: number;
  address: string;
  createTime: string;
  updateTime: string;
}

export interface ProjectUnitTransferInOrder {
  id: number;
  orderId: string;
  cpAddress: string;
  amount: number;
  coinId: string;
  network: string;
  orderState: string;
  type: number;
  initiator: number;
  note: string;
  ecode: string;
  vaultCode: string;
  projectId: number;
  cusAccountId: number;
  address: string;
  txId: string;
  fee: string;
  createTime: string;
  updateTime: string;
}

// ============ Fund Record Types ============

export type TxType = 'TRANSFER_IN' | 'TRANSFER_OUT' | 'WITHDRAW' | 'ALLOCATE_IN' | 'ALLOCATE_OUT' | 'POOL_IN' | 'POOL_OUT' | 'GAS_OUT' | 'FEE_OUT' | 'DEPLOY';

export interface ProjectUnitFundRecord {
  id: number;
  ecode: string;
  projectId: number;
  treasuryUnitId: number;
  cusAccountId: number;
  txId: string;
  orderId: string;
  coinId: string;
  network: string;
  amount: number;
  preBalance: number;
  postBalance: number;
  fee: string;
  txType: TxType;
  createTime: string;
}

export interface ProjectUnitLedgerFundRecord {
  id: number;
  ecode: string;
  projectId: number;
  treasuryUnitId: number;
  ledgerId: number;
  txId: string;
  orderId: string;
  coinId: string;
  network: string;
  amount: number;
  preBalance: number;
  postBalance: number;
  fee: string;
  txType: TxType;
  createTime: string;
}

// ============ Callback Types ============

export interface CallbackPayload {
  appId: string;
  event?: CallbackEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export type CallbackEventType =
  | 'authorization.created'
  | 'authorization.revoked'
  | 'authorization.expired'
  | 'transaction.submitted'
  | 'transaction.confirming'
  | 'transaction.completed'
  | 'transaction.failed'
  | 'task.approved'
  | 'task.rejected';

export interface CallbackRequest {
  headers: {
    'x-signature'?: string;
    'x-timestamp'?: string;
    'x-event'?: string;
  };
  body: CallbackPayload;
}
