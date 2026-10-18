/**
 * Cregis OpenPlatform SDK - Main Entry Point
 *
 * A comprehensive Node.js SDK for Cregis Custody OpenPlatform API.
 * All 25 third-party APIs are supported.
 */

import {
  SDKConfig, CallbackPayload, CallbackRequest,
  CreateTreasuryUnitRequest, CreateTreasuryUnitResponse,
  CreateCustomUnitRequest, TreasuryUnit,
  GetUnitAddressRequest, CreateUnitAddressRequest, UnitAccount, UnitAddress,
  PoolingRequest,
  CreatePayoutRequest, WCCIPCmdAuditTask,
  SubmitTaskRequest, PaginationQuery, ProjectUnitActivity,
  ProjectUnitTransferOutOrder, ProjectUnitTransferInOrder,
  ProjectUnitFundRecord, ProjectUnitLedgerFundRecord,
  MerchantRegisterRequest, MerchantRegisterResult,
  AddUserRequest, InitBoardRequest, MerchantBoard,
  AddUnitCoinsRequest, FundControlUpdateRequest, WhitelistUpdateRequest,
  PaginatedResponse, GetAuthorizationUrlRequest, GetAuthorizationUrlResult,
  VerifyOAuthTokenResult,
} from '../types';
import { SDKError, SDKErrorCode } from './error';
import { HttpClient } from './http';
import { isValidUUID, generateNonce, getTimestamp, buildBasicInfo, buildBasicInfoWithAuthorization, ResourceSignatureParams } from './signature';
import { CallbackService } from './callback.service';

/**
 * Cregis OpenPlatform Node.js SDK
 */
export class CregisSDK {
  private readonly config: SDKConfig;
  private readonly http: HttpClient;
  private readonly callbackService: CallbackService;

  constructor(config: SDKConfig) {
    this.validateConfig(config);
    this.config = config;
    this.http = new HttpClient(config);
    this.callbackService = new CallbackService();
  }

  private validateConfig(config: SDKConfig): void {
    if (!config.baseUrl) throw SDKError.configError(SDKErrorCode.CONFIG_MISSING_BASE_URL, 'baseUrl is required');
    if (!config.appId) throw SDKError.configError(SDKErrorCode.CONFIG_MISSING_APP_ID, 'appId is required');
    if (!isValidUUID(config.appId)) throw SDKError.configError(SDKErrorCode.CONFIG_INVALID_APP_ID, 'appId must be a valid UUID');
    if (!config.appSecret) throw SDKError.configError(SDKErrorCode.CONFIG_MISSING_APP_SECRET, 'appSecret is required');
  }

  // ============ OAuth / Authorization Methods ============

  /** Get authorization URL for OAuth flow. POST /api/thirdparty/oauth/authorizeUrl */
  async getAuthorizationUrl(params: GetAuthorizationUrlRequest): Promise<GetAuthorizationUrlResult> {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const business: Record<string, unknown> = { permissions: params.permissions, state: params.state };
    if (params.callback !== undefined) business.callback = params.callback;
    if (params.token !== undefined) business.token = params.token;
    const basic = buildBasicInfo({ appId: this.config.appId, appSecret: this.config.appSecret, timestamp, nonce, business });
    return this.http.post<GetAuthorizationUrlResult>('/api/thirdparty/oauth/authorizeUrl', { basic, business });
  }

  /** Verify OAuth token. POST /api/thirdparty/oauth/verify */
  async verifyOAuthToken(oauthToken: string): Promise<VerifyOAuthTokenResult> {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const business = { oauthToken };
    const basic = buildBasicInfo({ appId: this.config.appId, appSecret: this.config.appSecret, timestamp, nonce, business });
    return this.http.post<VerifyOAuthTokenResult>('/api/thirdparty/oauth/verify', { basic, business });
  }

  // ============ Treasury Unit Methods ============

  /** Create a new treasury unit. POST /api/thirdparty/treasury/create */
  async createTreasuryUnit(authorizationId: string, request: CreateTreasuryUnitRequest): Promise<CreateTreasuryUnitResponse> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<CreateTreasuryUnitResponse>('/api/thirdparty/treasury/create', { basic, business });
  }

  /** Create a custom treasury unit. POST /api/thirdparty/treasury/create-custom */
  async createCustomUnit(authorizationId: string, request: CreateCustomUnitRequest): Promise<TreasuryUnit> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<TreasuryUnit>('/api/thirdparty/treasury/create-custom', { basic, business });
  }

  /** List treasury units. POST /api/thirdparty/treasury/list */
  async listTreasuryUnits(authorizationId: string, options: { pageSize?: number; pageNum?: number; sortFields?: string } = {}): Promise<TreasuryUnit[]> {
    const business: Record<string, unknown> = {};
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.pageNum) business.pageNum = options.pageNum;
    if (options.sortFields) business.sortFields = options.sortFields;
    const { basic } = this.buildResourceRequest(authorizationId, business);
    return this.http.post<TreasuryUnit[]>('/api/thirdparty/treasury/list', { basic, business });
  }

  /** Get treasury unit addresses. POST /api/thirdparty/treasury/address */
  async getTreasuryUnitAddress(authorizationId: string, request: GetUnitAddressRequest): Promise<UnitAddress[]> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<UnitAddress[]>('/api/thirdparty/treasury/address', { basic, business });
  }

  /** Get unit addresses by account id. POST /api/thirdparty/treasury/address-by-account/{cusAccountId} */
  async getUnitAddressByAccount(authorizationId: string, cusAccountId: number, request: GetUnitAddressRequest = {}): Promise<UnitAddress[]> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<UnitAddress[]>(`/api/thirdparty/treasury/address-by-account/${cusAccountId}`, { basic, business });
  }

  /** Pooling request - sweep funds to primary account. POST /api/thirdparty/treasury/pooling */
  async pooling(authorizationId: string, request: PoolingRequest): Promise<ProjectUnitTransferOutOrder> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<ProjectUnitTransferOutOrder>('/api/thirdparty/treasury/pooling', { basic, business });
  }

  /** List unit accounts. POST /api/thirdparty/treasury/list-unit-account/{unitId} */
  async listUnitAccount(authorizationId: string, unitId: number): Promise<UnitAccount[]> {
    const { basic, business } = this.buildResourceRequest(authorizationId, {});
    return this.http.post<UnitAccount[]>(`/api/thirdparty/treasury/list-unit-account/${unitId}`, { basic, business });
  }

  /** Create unit address by unit account type. POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountType}/{network}/{coinId}/{number} */
  async createUnitAddress(authorizationId: string, request: CreateUnitAddressRequest): Promise<void> {
    const { basic } = this.buildResourceRequest(authorizationId, {});
    const { unitId, accountType, network, coinId, number } = request;
    const path = [unitId, accountType, network, coinId, number].map(v => encodeURIComponent(String(v))).join('/');
    await this.http.post<void>(`/api/thirdparty/treasury/create-unit-address/${path}`, { basic, business: {} });
  }

  /** Create unit address by account id. POST /api/thirdparty/treasury/create-unit-address-by-account/{cusAccountId}/{number} */
  async createUnitAddressByAccount(authorizationId: string, cusAccountId: number, number: number): Promise<void> {
    const { basic } = this.buildResourceRequest(authorizationId, {});
    await this.http.post<void>(`/api/thirdparty/treasury/create-unit-address-by-account/${cusAccountId}/${number}`, { basic, business: {} });
  }

  // ============ Merchant / User / Board ============

  /** Register merchant enterprise. POST /api/thirdparty/merchant/register (no authorizationId) */
  async registerMerchant(request: MerchantRegisterRequest): Promise<MerchantRegisterResult> {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const business = request as unknown as Record<string, unknown>;
    const basic = buildBasicInfo({ appId: this.config.appId, appSecret: this.config.appSecret, timestamp, nonce, business });
    return this.http.post<MerchantRegisterResult>('/api/thirdparty/merchant/register', { basic, business: request as unknown as Record<string, unknown> });
  }

  /** Add a user. POST /api/thirdparty/user/add */
  async addUser(authorizationId: string, request: AddUserRequest): Promise<Record<string, unknown>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<Record<string, unknown>>('/api/thirdparty/user/add', { basic, business });
  }

  /** Initialize guardian board. POST /api/thirdparty/board/init */
  async initBoard(authorizationId: string, request: InitBoardRequest): Promise<MerchantBoard> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<MerchantBoard>('/api/thirdparty/board/init', { basic, business });
  }

  // ============ Coins / Rules ============

  /** Add coins to unit. POST /api/thirdparty/treasury/add-coins */
  async addCoins(authorizationId: string, request: AddUnitCoinsRequest): Promise<WCCIPCmdAuditTask[]> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<WCCIPCmdAuditTask[]>('/api/thirdparty/treasury/add-coins', { basic, business });
  }

  /** Update fund control rules. POST /api/thirdparty/treasury/fund-control-update */
  async updateFundControl(authorizationId: string, request: FundControlUpdateRequest): Promise<void> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    await this.http.post<void>('/api/thirdparty/treasury/fund-control-update', { basic, business });
  }

  /** Update whitelist. POST /api/thirdparty/treasury/whitelist-update */
  async updateWhitelist(authorizationId: string, request: WhitelistUpdateRequest): Promise<WCCIPCmdAuditTask> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<WCCIPCmdAuditTask>('/api/thirdparty/treasury/whitelist-update', { basic, business });
  }

  // ============ Payout Methods ============

  /** Create a payout order. POST /api/thirdparty/treasury/payout */
  async createPayout(authorizationId: string, request: CreatePayoutRequest): Promise<WCCIPCmdAuditTask> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post<WCCIPCmdAuditTask>('/api/thirdparty/treasury/payout', { basic, business });
  }

  /** List transfer-out orders. POST /api/thirdparty/treasury/transfer-out-orders */
  async listTransferOutOrders(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitTransferOutOrder>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post<PaginatedResponse<ProjectUnitTransferOutOrder>>('/api/thirdparty/treasury/transfer-out-orders', { basic, business });
  }

  /** List transfer-in orders. POST /api/thirdparty/treasury/transfer-in-orders */
  async listTransferInOrders(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitTransferInOrder>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post<PaginatedResponse<ProjectUnitTransferInOrder>>('/api/thirdparty/treasury/transfer-in-orders', { basic, business });
  }

  // ============ Signature Task Methods ============

  /** Submit task approval/rejection. POST /api/thirdparty/treasury/submit-task/{taskId} */
  async submitTask(authorizationId: string, taskId: string, request: SubmitTaskRequest): Promise<void> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    await this.http.post<void>(`/api/thirdparty/treasury/submit-task/${taskId}`, { basic, business });
  }

  // ============ Transaction Methods ============

  /** List activities. POST /api/thirdparty/treasury/activities */
  async listActivities(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitActivity>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post<PaginatedResponse<ProjectUnitActivity>>('/api/thirdparty/treasury/activities', { basic, business });
  }

  /** List fund records (account-level). POST /api/thirdparty/treasury/fund-records */
  async listFundRecords(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitFundRecord>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post<PaginatedResponse<ProjectUnitFundRecord>>('/api/thirdparty/treasury/fund-records', { basic, business });
  }

  /** List fund records (unit-level). POST /api/thirdparty/treasury/unit-fund-records */
  async listUnitFundRecords(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitLedgerFundRecord>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post<PaginatedResponse<ProjectUnitLedgerFundRecord>>('/api/thirdparty/treasury/unit-fund-records', { basic, business });
  }

  // ============ Callback Methods ============

  /**
   * Verify a callback and dispatch to the business handler.
   *
   * The handler may be synchronous or asynchronous; the returned promise resolves
   * once the handler completes, so HTTP controllers can `await` the business work.
   */
  public async onCallback(
    req: CallbackRequest,
    callback: (payload: CallbackPayload) => void | Promise<void>
  ): Promise<void> {
    const signature = req.headers['x-signature']?.replace('sha256=', '');
    const timestamp = req.headers['x-timestamp'];
    const appId = req.headers['x-app-id'];
    const event = req.headers['x-event'];

    if (!signature || !timestamp || !appId) {
      throw new SDKError(SDKErrorCode.SIGNATURE_INVALID, 'Missing required signature, timestamp or appId headers');
    }

    const isValid = this.callbackService.verifySignature({
      appSecret: this.config.appSecret,
      appId,
      event, timestamp, signature,
      data: req.body,
    });

    if (!isValid) throw new SDKError(SDKErrorCode.SIGNATURE_INVALID, 'Invalid callback signature');
    if (this.config.debug) console.log('[CregisSDK] Callback verified:', { event, timestamp });
    await callback(req.body as CallbackPayload);
  }

  // ============ Utility Methods ============

  getConfig(): Pick<SDKConfig, 'baseUrl' | 'appId' | 'timeout' | 'debug'> {
    return { baseUrl: this.config.baseUrl, appId: this.config.appId, timeout: this.config.timeout, debug: this.config.debug };
  }

  private buildResourceRequest(authorizationId: string, business: unknown) {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const params: ResourceSignatureParams = { appId: this.config.appId, appSecret: this.config.appSecret, authorizationId, timestamp, nonce, business: business as Record<string, unknown> };
    return { basic: buildBasicInfoWithAuthorization(params), business: business as Record<string, unknown> };
  }

  private buildQueryOptions(options: PaginationQuery): Record<string, unknown> {
    const business: Record<string, unknown> = {};
    if (options.pageIndex !== undefined) business.pageIndex = options.pageIndex;
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.sortFields) business.sortFields = options.sortFields;
    if (options.queryList) business.queryList = options.queryList;
    return business;
  }
}

export * from '../types';
export * from './error';
export * from './signature';
export * from './http';
