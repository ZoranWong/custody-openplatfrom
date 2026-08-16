/**
 * Cregis OpenPlatform SDK - Main Entry Point
 *
 * A comprehensive Node.js SDK for Cregis Custody OpenPlatform API.
 * All 13 treasury management APIs are supported.
 */

import { SDKConfig, CallbackPayload, CallbackRequest,
  CreateTreasuryUnitRequest, CreateTreasuryUnitResponse,
  GetUnitAddressRequest, CreateUnitAddressRequest, UnitAccount,
  PoolingRequest,
  CreatePayoutRequest, PayoutOrder,
  SubmitTaskRequest, WCCIPCmdAuditTask,
  PaginationQuery, ProjectUnitActivity,
  ProjectUnitTransferOutOrder, ProjectUnitTransferInOrder,
  ProjectUnitFundRecord, ProjectUnitLedgerFundRecord,
  TreasuryUnit
} from '../types';
import { SDKError, SDKErrorCode } from './error';
import { HttpClient } from './http';
import { isValidUUID, generateNonce, getTimestamp, buildBasicInfo, buildBasicInfoWithAuthorization, ResourceSignatureParams } from './signature';
import { CallbackService } from './callback.service';

export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

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
  async getAuthorizationUrl(params: {
    permissions: string[]; redirectUri: string; state: string;
  }): Promise<{ authorizeUrl: string; expiresIn: number }> {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const business = { permissions: params.permissions, redirectUri: params.redirectUri, state: params.state };
    const basic = buildBasicInfo({ appId: this.config.appId, appSecret: this.config.appSecret, timestamp, nonce, business });
    return this.http.post('/api/thirdparty/oauth/authorizeUrl', { basic, business });
  }

  /** Verify OAuth token. POST /api/thirdparty/oauth/verify */
  async verifyOAuthToken(oauthToken: string): Promise<{ authorizeId: string }> {
    const timestamp = getTimestamp(); const nonce = generateNonce();
    const business = { oauthToken };
    const basic = buildBasicInfo({ appId: this.config.appId, appSecret: this.config.appSecret, timestamp, nonce, business });
    return this.http.post('/api/thirdparty/oauth/verify', { basic, business });
  }

  // ============ Treasury Unit Methods ============

  /** Create a new treasury unit. POST /api/thirdparty/treasury/create */
  async createTreasuryUnit(authorizationId: string, request: CreateTreasuryUnitRequest): Promise<CreateTreasuryUnitResponse> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post('/api/thirdparty/treasury/create', { basic, business }) as unknown as CreateTreasuryUnitResponse;
  }

  /** List treasury units. POST /api/thirdparty/treasury/list */
  async listTreasuryUnits(authorizationId: string, options: { pageSize?: number; pageNum?: number; sortFields?: string } = {}): Promise<TreasuryUnit[]> {
    const business: Record<string, unknown> = {};
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.pageNum) business.pageNum = options.pageNum;
    if (options.sortFields) business.sortFields = options.sortFields;
    const { basic } = this.buildResourceRequest(authorizationId, business);
    return this.http.post('/api/thirdparty/treasury/list', { basic, business }) as unknown as TreasuryUnit[];
  }

  /** Get treasury unit addresses. POST /api/thirdparty/treasury/address */
  async getTreasuryUnitAddress(authorizationId: string, request: GetUnitAddressRequest): Promise<Array<{ address: string; accountType: string }>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post('/api/thirdparty/treasury/address', { basic, business }) as unknown as Array<{ address: string; accountType: string }>;
  }

  /** Pooling request - sweep funds to primary account. POST /api/thirdparty/treasury/pooling */
  async pooling(authorizationId: string, request: PoolingRequest): Promise<{ success: boolean }> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post('/api/thirdparty/treasury/pooling', { basic, business }) as unknown as { success: boolean };
  }

  /** List unit accounts. POST /api/thirdparty/treasury/list-unit-account/{unitId} */
  async listUnitAccount(authorizationId: string, unitId: number): Promise<UnitAccount[]> {
    const { basic, business } = this.buildResourceRequest(authorizationId, {});
    return this.http.post(`/api/thirdparty/treasury/list-unit-account/${unitId}`, { basic, business }) as unknown as UnitAccount[];
  }

  /** Create unit address. POST /api/thirdparty/treasury/create-unit-address/{unitId}/{accountTypy}/{network}/{coinId}/{number} */
  async createUnitAddress(authorizationId: string, request: CreateUnitAddressRequest): Promise<{ success: boolean }> {
    const { basic, business } = this.buildResourceRequest(authorizationId, {});
    const { unitId, accountTypy, network, coinId, number } = request;
    return this.http.post(`/api/thirdparty/treasury/create-unit-address/${unitId}/${accountTypy}/${network}/${coinId}/${number}`, { basic, business }) as unknown as { success: boolean };
  }

  // ============ Payout Methods ============

  /** Create a payout order. POST /api/thirdparty/treasury/payout */
  async createPayout(authorizationId: string, request: CreatePayoutRequest): Promise<PayoutOrder> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post('/api/thirdparty/treasury/payout', { basic, business }) as unknown as PayoutOrder;
  }

  /** List transfer-out orders. POST /api/thirdparty/treasury/transfer-out-orders */
  async listTransferOutOrders(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitTransferOutOrder>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post('/api/thirdparty/treasury/transfer-out-orders', { basic, business }) as unknown as PaginatedResponse<ProjectUnitTransferOutOrder>;
  }

  /** List transfer-in orders. POST /api/thirdparty/treasury/transfer-in-orders */
  async listTransferInOrders(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitTransferInOrder>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post('/api/thirdparty/treasury/transfer-in-orders', { basic, business }) as unknown as PaginatedResponse<ProjectUnitTransferInOrder>;
  }

  // ============ Signature Task Methods ============

  /** Submit task approval/rejection. POST /api/thirdparty/treasury/submit-task/{taskId} */
  async submitTask(authorizationId: string, taskId: string, request: SubmitTaskRequest): Promise<WCCIPCmdAuditTask> {
    const { basic, business } = this.buildResourceRequest(authorizationId, request);
    return this.http.post(`/api/thirdparty/treasury/submit-task/${taskId}`, { basic, business }) as unknown as WCCIPCmdAuditTask;
  }

  // ============ Transaction Methods ============

  /** List activities. POST /api/thirdparty/treasury/activities */
  async listActivities(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitActivity>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post('/api/thirdparty/treasury/activities', { basic, business }) as unknown as PaginatedResponse<ProjectUnitActivity>;
  }

  /** List fund records (account-level). POST /api/thirdparty/treasury/fund-records */
  async listFundRecords(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitFundRecord>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post('/api/thirdparty/treasury/fund-records', { basic, business }) as unknown as PaginatedResponse<ProjectUnitFundRecord>;
  }

  /** List fund records (unit-level). POST /api/thirdparty/treasury/unit-fund-records */
  async listUnitFundRecords(authorizationId: string, options: PaginationQuery = {}): Promise<PaginatedResponse<ProjectUnitLedgerFundRecord>> {
    const { basic, business } = this.buildResourceRequest(authorizationId, this.buildQueryOptions(options));
    return this.http.post('/api/thirdparty/treasury/unit-fund-records', { basic, business }) as unknown as PaginatedResponse<ProjectUnitLedgerFundRecord>;
  }

  // ============ Webhook Methods ============

  async registerWebhook(request: { url: string; eventTypes: string[] }): Promise<{ id: string; url: string; eventTypes: string[]; isActive: boolean; secret: string }> {
    const response = await this.http.post<{ id: string; url: string; event_types: string[]; is_active: boolean; secret: string }>('/api/v1/isv/webhooks/webhooks', request);
    return { id: response.id, url: response.url, eventTypes: response.event_types, isActive: response.is_active, secret: response.secret };
  }

  async listWebhooks(): Promise<Array<{ id: string; url: string; eventTypes: string[]; isActive: boolean }>> {
    const response = await this.http.get<Array<{ id: string; url: string; event_types: string[]; is_active: boolean }>>('/api/v1/isv/webhooks/webhooks');
    return response.map(wh => ({ id: wh.id, url: wh.url, eventTypes: wh.event_types, isActive: wh.is_active }));
  }

  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    await this.http.delete(`/api/v1/isv/webhooks/webhooks/${id}`);
    return { success: true };
  }

  // ============ Callback Methods ============

  public onCallback(req: CallbackRequest, callback: (payload: CallbackPayload) => void): void {
    const signature = req.headers['x-signature']?.replace('sha256=', '');
    const timestamp = req.headers['x-timestamp'];
    const event = req.body?.event || req.headers['x-event'];

    if (!signature || !timestamp) {
      throw new SDKError(SDKErrorCode.SIGNATURE_INVALID, 'Missing required signature or timestamp headers');
    }

    const isValid = this.callbackService.verifySignature({
      appSecret: this.config.appSecret,
      appId: req.body?.appId || this.config.appId,
      event, timestamp, signature,
    });

    if (!isValid) throw new SDKError(SDKErrorCode.SIGNATURE_INVALID, 'Invalid callback signature');
    if (this.config.debug) console.log('[CregisSDK] Callback verified:', { event, timestamp });
    callback(req.body as CallbackPayload);
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