/**
 * Cregis OpenPlatform Node.js SDK
 * Complete type definitions aligned with docs/custody-openplatform-api.yaml
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
  pages?: number;
  orders?: OrderItem[];
}

export interface OrderItem {
  column: string;
  asc: boolean;
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
  /** Callback URL notified after the user authorizes. */
  callback?: string;
  /** Developer-generated token echoed back in the callback for identity mapping. */
  token: string;
  /**
   * @deprecated Use `callback`. Never sent to the gateway; kept for backward
   * compatibility with 1.0.x callers.
   */
  redirectUri?: string;
}

export interface GetAuthorizationUrlResult {
  authorizeUrl: string;
  expiresIn: number;
}

// ============ Treasury Unit Types ============

export type BusinessScope = 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';
export type Topology = 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';
export type AccountType = 'FREEZE' | 'DEPOSIT' | 'PRIMARY' | 'RECEIVABLE' | 'PAYOUT' | 'PAYIN' | 'GENERAL_GAS' | 'QUARANTINE' | 'DIRTY';
export type VaultAccountType = 'GENERAL_ACQUIRING' | 'SMART_ACQUIRING' | 'SMART' | 'GENERAL' | 'GMA' | 'TMA';
export type CreationType = 'PLATFORM' | 'THIRD_PARTY';
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

export interface FundControl {
  coinId: string;
  fundControlRules: FundControlRule[];
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

export interface WhitelistRule {
  accounts: string[];
  addresses: WhiteListCreateRequest[];
}

export interface AccountFundControl {
  accountId: number;
  fundControls: FundControl[];
}

export interface CustomUnitDTO {
  accountName: string;
  accountType: VaultAccountType;
}

export interface CreateTreasuryUnitRequest {
  unitName: string;
  businessScope: BusinessScope;
  businessPurpose?: string;
  topology: Topology;
  coinIds: CoinInfo[];
  autoSignUrl?: string;
  primaryManager: FundControl[];
  primaryWhiteList?: WhiteListCreateRequest[];
  primaryAnycallRules?: AnyCallRule[];
  thirdPartyEcode?: string;
  remark?: string;
  payoutManager: FundControl[];
  payinAnycallRules?: AnyCallRule[];
  payoutAnycallRules?: AnyCallRule[];
}

export interface CreateCustomUnitRequest {
  unitName: string;
  topology?: Topology;
  businessScope?: BusinessScope;
  isSmart?: boolean;
  businessPurpose?: string;
  coinIds: CoinInfo[];
  customUnitDTOs?: CustomUnitDTO[];
  whitelistRules?: WhitelistRule[];
  fundControls: FundControl[][];
  thirdPartyEcode?: string;
  remark?: string;
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
  ubo?: string;
  custodyServiceMode?: string;
  topology?: Topology;
  coinIds: CoinInfo[];
  accounts: Array<{ account_name: string; account_type: string }>;
  businessPurpose?: string;
  status: string;
  sort: number;
  creationType: CreationType;
  developerId: string;
  creatorId?: number;
  remark: string;
  createTime: string;
  updateTime: string;
}

export interface GetUnitAddressRequest {
  unitId?: number;
  accountType?: AccountType;
  pageSize?: number;
  pageNum?: number;
  coinId?: string;
  network?: string;
}

export interface CreateUnitAddressRequest {
  unitId: number;
  accountType: AccountType;
  network: string;
  coinId: string;
  number: number;
}

export interface UnitAddress {
  id: number;
  address: string;
  addressIndex: number;
  accountType: AccountType;
  coinId: string;
  network: string;
  cusAccountId: number;
  treasuryUnitId: number;
  available: number;
  holdAmount: number;
  holdFrozen: number;
  status: number;
  createTime: string;
  updateTime: string;
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
  accountType?: VaultAccountType;
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
  fromAccountId: number;
  address: string;
  amount: number;
  coinId: string;
  network: string;
  lang?: LangCode;
  note?: string;
  includes?: string[];
  excludes?: string[];
}

// ============ Payout Types ============

export type PayoutOperation = 'withdraw' | 'allocate' | 'payout';
export type MerchantType = 'NON_FINANCIAL_CORPORATE' | 'REGULATED_VASP' | 'INTERNAL_SYSTEM';
export type LangCode =
  | 'zh_CN' | 'zh_TW' | 'en_US' | 'en_GB' | 'ja_JP' | 'ko_KR'
  | 'fr_FR' | 'de_DE' | 'es_ES' | 'it_IT' | 'ru_RU' | 'pt_PT'
  | 'pt_BR' | 'vi_VN' | 'th_TH' | 'id_ID' | 'tr_TR' | 'ar_SA'
  | 'he_IL' | 'nl_NL' | 'pl_PL' | 'sv_SE' | 'fi_FI' | 'da_DK'
  | 'no_NO' | 'cs_CZ' | 'hu_HU' | 'ro_RO' | 'el_GR' | 'ms_MY' | 'uk_UA';

export interface PayTo {
  to: string;
  amount: number;
  kyaRiskScore?: number;
  ruleNames?: string[];
}

export interface TravelRulePayload {
  beneficiaryType?: 'NATURAL' | 'LEGAL';
  beneficiaryName?: string;
  beneficiaryDob?: string;
  beneficiaryIdNumber?: string;
  beneficiaryIdType?: string;
  beneficiaryNationality?: string;
  beneficiaryLegalName?: string;
  beneficiaryLegalRegistrationNo?: string;
  beneficiaryLegalCountry?: string;
}

export interface TravelRuleRequest {
  referenceId?: string;
  payload?: TravelRulePayload;
}

export interface CreatePayoutRequest {
  payTo: PayTo[];
  fromAccountId?: number;
  unitId: number;
  coinId: string;
  network: string;
  operation?: PayoutOperation;
  fromAddress?: string;
  toCusAccountId?: number;
  username?: string;
  userId?: string;
  orderId?: string;
  note?: string;
  lang?: LangCode;
  initiator?: string;
  merchantType: MerchantType;
  travelRule?: TravelRuleRequest;
}

// ============ Task Types ============

export interface SubmitTaskRequest {
  signatures?: Record<string, string[]>;
  confirmed: boolean;
}

export type AuditTaskStatus =
  | 'AUDITING' | 'REJECTED' | 'AUDIT_REJECTED' | 'AUDIT_PASSED'
  | 'SIGNING' | 'SIGN_FAILED' | 'SIGN_SUCCEED' | 'FAILED' | 'WAITING'
  | 'SIGN_REJECTED' | 'ALL_BROADCAST_SUCCEED' | 'PARTIALLY_BROADCAST_SUCCEED'
  | 'ALL_BROADCAST_FAILED' | 'BROADCAST_FAILED' | 'BROADCAST_EXCEPTION' | 'EXPIRED';

export type AlgoType = 'ECDSA' | 'EC_SCHNORR' | 'ED_DSA' | 'UNASSIGNED' | 'ED25519';

export type TaskOperation =
  | 'DEPLOY_SMART_CONTRACT' | 'PAYOUT' | 'WITHDRAW' | 'ALLOCATE'
  | 'SET_WHITE_LIST' | 'BOARD' | 'FUND_FLOW';

export interface WCCIPCmdAuditTask {
  id: number;
  taskId: string;
  vaultCode: string;
  projectId: number;
  accountId: string;
  accountType: VaultAccountType;
  submitter: string;
  ecode: string;
  cmdType: string;
  cmdBasic?: Record<string, unknown>;
  cmdForm?: Record<string, unknown>;
  businessId: string;
  state: AuditTaskStatus | string;
  businessType: string;
  taskType: string;
  createTime: string;
  updateTime: string;
  signContent: string;
  signContentKeyMapping: string;
  total: number;
  threshold: number;
  signers: string[];
  algoType: AlgoType;
  initiator: string;
  taskOperation: TaskOperation | string;
  signersLevel: number;
  coinId: string;
  unitName: string;
  accountName: string;
  includes: string[];
  sponsored: boolean;
  remark: string;
}

/** Payout result is an audit task (MessageResultWCCIPCmdAuditTask). */
export type AuditTask = WCCIPCmdAuditTask;

// ============ Query Types ============

export interface QueryCondition {
  key: string;
  value: string | number | object;
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

export type ActivityDirection = 'IN' | 'OUT';

export type ActivityStatus =
  | 'SUBMITTING' | 'APPROVED' | 'REJECTED' | 'FAILED' | 'CONFIRMING'
  | 'COMPLETED' | 'EXPIRED' | 'PENDING_CONFIRMATION' | 'PENDING_COMPLIANCE'
  | 'PENDING_REVIEW' | 'REVIEW_ACCEPTED' | 'REVIEW_REJECTED';

export type TravelRuleStatus = 'NOT_REQUIRED' | 'PENDING' | 'PASSED' | 'FAILED' | 'REVIEW';

export interface ProjectUnitActivity {
  id: number;
  ecode: string;
  projectId: number;
  treasuryUnitId: number;
  ledgerId?: number;
  cusAccountId: number;
  accountType: string;
  cpAccountId: number;
  coinId: string;
  network: string;
  type: string;
  amount: number;
  direction: ActivityDirection | string;
  orderId: string;
  businessId: string;
  status: ActivityStatus | string;
  travelRuleStatus: TravelRuleStatus | string;
  kytStatus: string;
  kyaStatus?: string;
  createTime: string;
  updateTime: string;
}

// ============ Transfer Order Types ============

export type TransferOutOrderStatus =
  | 'AUDITING' | 'SIGNING' | 'SIGN_FAILED' | 'SIGNING_REJECTED' | 'TRANSITING'
  | 'SUCCEED' | 'FAILED' | 'EXPIRED' | 'SUBMIT_FAILED' | 'CONFIRMING'
  | 'COMPLIANCE_PENDING' | 'TRAVEL_RULE_PENDING' | 'MANUAL_REVIEW_PENDING'
  | 'REJECTED' | 'CANCELLED';

export type TransferInOrderStatus =
  | 'PROCESSING' | 'CONFIRMING' | 'SUCCEED' | 'FAILED' | 'MISMATCH'
  | 'EXPIRED' | 'COMPLIANCE_HOLD' | 'PENDING_REVIEW' | 'REVIEW_ACCEPTED' | 'REVIEW_REJECTED';

export type CallbackStatus = 'TRANSITING' | 'SUCCEED' | 'FAILED';

export interface ProjectUnitTransferOutOrder {
  id: number;
  ecode: string;
  vaultCode: string;
  projectId: number;
  treasuryUnitId: number;
  ledgerId: number;
  cusAccountId: number;
  address: string;
  coinId: string;
  network: string;
  businessScope: BusinessScope | string;
  travelRuleReferenceId: string;
  travelRulePayload: string;
  travelRuleStatus: string;
  travelRuleCheckStatus: TravelRuleStatus | string;
  travelRuleCheckPayload: string;
  kytStatus: string;
  kytRiskScore?: number;
  kytPayload: string;
  kyaRiskScore?: number;
  complianceProvider: string;
  orderId: string;
  txId: string;
  fee: string;
  callbackStatus: CallbackStatus | string;
  createTime: string;
  updateTime: string;
  taskId: string;
  inputAmount: string;
  totalAmount: number;
  fundFlowCode: string;
  orderState: TransferOutOrderStatus | string;
  payToList: PayTo[];
  note: string;
  businessId: string;
  txCount?: number;
  failReason?: string;
  taskInitiator?: string;
  source?: string;
  taskOperation?: string;
}

export interface ProjectUnitTransferInOrder {
  id: number;
  ecode: string;
  vaultCode: string;
  projectId: number;
  treasuryUnitId: number;
  ledgerId: number;
  cusAccountId: number;
  address: string;
  coinId: string;
  network: string;
  businessScope: BusinessScope | string;
  travelRuleReferenceId: string;
  travelRulePayload: string;
  travelRuleStatus: string;
  travelRuleCheckStatus: TravelRuleStatus | string;
  travelRuleCheckPayload: string;
  kytStatus: string;
  kytRiskScore?: number;
  kytPayload: string;
  kyaRiskScore?: number;
  complianceProvider: string;
  orderId: string;
  txId: string;
  fee: string;
  callbackStatus: CallbackStatus | string;
  createTime: string;
  updateTime: string;
  cpAddress: string;
  amount: number;
  orderState: TransferInOrderStatus | string;
  type: number;
  note: string;
  initiator: number;
}

// ============ Fund Record Types ============

export type TxType =
  | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'WITHDRAW' | 'ALLOCATE_IN' | 'ALLOCATE_OUT'
  | 'POOL_IN' | 'POOL_OUT' | 'GAS_OUT' | 'FEE_OUT' | 'DEPLOY';

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
  txType: TxType | string;
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
  txType: TxType | string;
  createTime: string;
}

// ============ Merchant & User Types ============

export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'CANCELLED';
export type KybStatus =
  | 'DRAFT' | 'PENDING_SCREENING' | 'SUBMITTED' | 'NEED_SUPPLEMENT'
  | 'APPROVED' | 'REJECTED' | 'ADMIN_REJECTED' | 'CANCELLED';
export type UserRole =
  | 'MERCHANT_STAFF' | 'MERCHANT_OWNER' | 'MERCHANT_ADMIN'
  | 'MERCHANT_FUND_OPERATOR' | 'MERCHANT_ANYCALL_OPERATOR';

export interface OwnerUser {
  email: string;
  password: string;
  publicKey?: string;
}

export interface MerchantRegisterRequest {
  legalName: string;
  appId: string;
  alias?: string;
  email?: string;
  dbaName?: string;
  jurisdiction?: string;
  registrationNumber?: string;
  dateOfIncorporation?: string;
  taxId?: string;
  entityType?: string;
  networks?: string[];
  owner?: OwnerUser;
}

export interface Merchant {
  id: number;
  code: string;
  merchantName: string;
  source: CreationType;
  alias: string;
  status: MerchantStatus;
  kybStatus: KybStatus;
  email: string;
  sumsubApplicantId: string;
  jurisdiction: string;
  registrationNumber: string;
  dateOfIncorporation: string;
  taxId: string;
  entityType: string;
  dbaName: string;
  creatorId: number;
  createTime: string;
  updateTime: string;
}

export interface MerchantRegisterResult {
  ecode: string;
  vaultCode: string;
  resourceAccessKey: string | null;
  alreadyExists: boolean;
  merchant: Merchant;
}

export interface AddUserRequest {
  email: string;
  password: string;
  publicKey?: string;
  ecode?: string;
  role?: UserRole;
}

// ============ Board Types ============

export interface StaffDTO {
  userId: number;
  userName: string;
  userEmail: string;
  publicKey: string;
}

export interface MerchantBoard {
  id: number;
  ecode: string;
  projectId: number;
  userInfos: StaffDTO[];
  threshold: number;
  status: string;
  creatorUserId: number;
  createTime: string;
  updateTime: string;
}

export interface InitBoardRequest {
  guardians: string[];
  threshold: number;
  lang?: LangCode;
  note?: string;
}

// ============ Add Coins / Fund Control / Whitelist ============

export interface AddUnitCoinsRequest {
  treasuryUnitId: number;
  coinIds: CoinInfo[];
  accountFundControls?: AccountFundControl[];
  note?: string;
}

export interface FundControlUpdateRequest {
  cusAccountId?: number;
  treasuryUnitId: number;
  fundControls: FundControl[];
  note?: string;
}

export interface WhitelistUpdateRequest {
  addItems?: WhiteListCreateRequest[];
  removeItems?: WhiteListCreateRequest[];
  treasuryUnitId: number;
  cusAccountId?: number;
  allowListEnabled?: string;
  lang?: LangCode;
  note?: string;
}

// ============ Callback Types ============

/**
 * Callback event types - events pushed from Cregis platform.
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
  | 'task.rejected';

/**
 * Callback payload — pure business data (metadata lives in request headers).
 */
export interface CallbackPayload {
  [key: string]: unknown;
}

/**
 * HTTP request object for a callback (metadata in headers, data in body).
 */
export interface CallbackRequest {
  headers: {
    'x-app-id'?: string;
    'x-timestamp'?: string;
    'x-event'?: string;
    'x-signature'?: string;
  };
  body: CallbackPayload;
}

// ============ Webhook Types ============

export type WebhookRegisterInput = {
  url: string;
  eventTypes: string[];
};

export interface Webhook {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  secret?: string;
}

export type WebhookUpdateInput = {
  url?: string;
  eventTypes?: string[];
  isActive?: boolean;
};
