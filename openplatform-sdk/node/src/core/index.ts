/**
 * Cregis OpenPlatform SDK - Main Entry Point
 *
 * A comprehensive Node.js SDK for Cregis Custody OpenPlatform API.
 */

import { SDKConfig, CallbackPayload, CallbackRequest } from '../types';
import { SDKError, SDKErrorCode } from './error';
import { HttpClient } from './http';
import { isValidUUID, generateNonce, getTimestamp, buildBasicInfo, BasicSignatureParams, buildBasicInfoWithAuthorization, ResourceSignatureParams } from './signature';
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

  /**
   * Validate SDK configuration
   */
  private validateConfig(config: SDKConfig): void {
    if (!config.baseUrl) {
      throw SDKError.configError(
        SDKErrorCode.CONFIG_MISSING_BASE_URL,
        'baseUrl is required'
      );
    }

    if (!config.appId) {
      throw SDKError.configError(
        SDKErrorCode.CONFIG_MISSING_APP_ID,
        'appId is required'
      );
    }

    if (!isValidUUID(config.appId)) {
      throw SDKError.configError(
        SDKErrorCode.CONFIG_INVALID_APP_ID,
        'appId must be a valid UUID'
      );
    }

    if (!config.appSecret) {
      throw SDKError.configError(
        SDKErrorCode.CONFIG_MISSING_APP_SECRET,
        'appSecret is required'
      );
    }
  }

  // ============ OAuth / Authorization Methods ============

  /**
   * Get authorization URL for OAuth flow
   * POST /api/thirdparty/oauth/authorizeUrl
   */
  async getAuthorizationUrl(params: {
    permissions: string[];
    redirectUri: string;
    state: string;
  }): Promise<{ authorizeUrl: string; expiresIn: number }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business = {
      permissions: params.permissions,
      redirectUri: params.redirectUri,
      state: params.state,
    };

    const signatureParams: BasicSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfo(signatureParams);

    return this.http.post<{ authorizeUrl: string; expiresIn: number }>(
      '/api/thirdparty/oauth/authorizeUrl',
      { basic, business }
    );
  }

  /**
   * Verify OAuth token and store authorization
   * POST /api/thirdparty/oauth/verify
   */
  async verifyOAuthToken(oauthToken: string): Promise<{ authorizeId: string }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business = { oauthToken };

    const params: BasicSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfo(params);

    return this.http.post<{ authorizeId: string }>(
      '/api/thirdparty/oauth/verify',
      { basic, business }
    );
  }

  // ============ Treasury Unit Methods ============

  /**
   * Create a new treasury unit
   * POST /api/third-party/create/{resourceAccessKey}
   */
  async createTreasuryUnit(
    resourceAccessKey: string,
    request: {
      businessScope: 'DEDICATED_ACCOUNT' | 'OMNIBUS_ACCOUNT' | 'OPEN_API_PROXY';
      topology: 'ORBIT' | 'SINGLE_GENERAL' | 'QUAD_SMART_ISOLATION';
      coinIds: Array<{ coinId: string; network: string }>;
      primaryManager: Array<{
        coinId: string;
        fundControlRules: Array<{
          guardians: string[];
          threshold: string;
          perTransferLimit: string;
          dailyTransferLimit: string;
        }>;
      }>;
      payoutManager: Array<{
        coinId: string;
        fundControlRules: Array<{
          guardians: string[];
          threshold: string;
          perTransferLimit: string;
          dailyTransferLimit: string;
        }>;
      }>;
      riskManager: Array<{
        coinId: string;
        fundControlRules: Array<{
          guardians: string[];
          threshold: string;
          perTransferLimit: string;
          dailyTransferLimit: string;
        }>;
      }>;
    }
  ): Promise<{
    id: number;
    ecode: string;
    name: string;
    status: string;
    networks: string[];
    createTime: string;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business: request,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{
      id: number;
      ecode: string;
      name: string;
      status: string;
      networks: string[];
      createTime: string;
    }>(`/api/third-party/create/${resourceAccessKey}`, { basic, business: request });
  }

  /**
   * List treasury units
   * POST /api/third-party/list/{resourceAccessKey}
   */
  async listTreasuryUnits(
    resourceAccessKey: string,
    options: { pageSize?: number; pageNum?: number; sortFields?: string } = {}
  ): Promise<
    Array<{
      id: number;
      ecode: string;
      name: string;
      custodyServiceMode: string;
      coinIds: Array<{ coinId: string; network: string }>;
      accounts: Array<{ accountName: string; accountType: string }>;
      status: string;
      creationType: string;
    }>
  > {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business: Record<string, unknown> = {};
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.pageNum) business.pageNum = options.pageNum;
    if (options.sortFields) business.sortFields = options.sortFields;

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<Array<{
      id: number;
      ecode: string;
      name: string;
      custodyServiceMode: string;
      coinIds: Array<{ coinId: string; network: string }>;
      accounts: Array<{ accountName: string; accountType: string }>;
      status: string;
      creationType: string;
    }>>(`/api/third-party/list/${resourceAccessKey}`, { basic, business });
  }

  /**
   * Get treasury unit addresses
   * POST /api/third-party/get-unit-address/{resourceAccessKey}
   */
  async getTreasuryUnitAddress(
    resourceAccessKey: string,
    request: {
      unitId: number;
      accountType?: string;
      coinId?: string;
      network?: string;
      pageSize?: number;
      pageNum?: number;
    }
  ): Promise<Array<{ address: string; accountType: string }>> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business: request,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<Array<{ address: string; accountType: string }>>(
      `/api/third-party/get-unit-address/${resourceAccessKey}`,
      { basic, business: request }
    );
  }

  // ============ Payout Methods ============

  /**
   * Create a payout order
   * POST /api/third-party/payout/{resourceAccessKey}
   */
  async createPayout(
    resourceAccessKey: string,
    request: {
      unitId: number;
      payTo: Array<{ address: string; amount: string }>;
      coinId: string;
      network: string;
      operation?: 'withdraw' | 'allocate' | 'payout';
      orderId?: string;
      merchantType: string;
    }
  ): Promise<{ orderId: string; unitId: number; status: string }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business: request,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{ orderId: string; unitId: number; status: string }>(
      `/api/third-party/payout/${resourceAccessKey}`,
      { basic, business: request }
    );
  }

  /**
   * List transfer-out orders
   * POST /api/third-party/transfer-out-orders/{resourceAccessKey}
   */
  async listTransferOutOrders(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: Array<{
        key: string;
        value: string | number;
        oper?: '=' | '!=' | '>' | '<' | 'like';
        join?: 'and' | 'or';
      }>;
    } = {}
  ): Promise<{
    list: Array<{
      id: number;
      orderId: string;
      unitId: number;
      unitEcode: string;
      coinId: string;
      network: string;
      amount: string;
      fee: string;
      status: string;
      fromAddress: string;
      toAddress: string;
      txHash?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
    total: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business: Record<string, unknown> = {};
    if (options.pageIndex !== undefined) business.pageIndex = options.pageIndex;
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.sortFields) business.sortFields = options.sortFields;
    if (options.queryList) business.queryList = options.queryList;

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{
      list: Array<{
        id: number;
        orderId: string;
        unitId: number;
        unitEcode: string;
        coinId: string;
        network: string;
        amount: string;
        fee: string;
        status: string;
        fromAddress: string;
        toAddress: string;
        txHash?: string;
        createdAt: string;
        updatedAt?: string;
      }>;
      total: number;
      pageIndex: number;
      pageSize: number;
    }>(`/api/third-party/transfer-out-orders/${resourceAccessKey}`, { basic, business });
  }

  /**
   * List transfer-in orders
   * POST /api/third-party/transfer-in-orders/{resourceAccessKey}
   */
  async listTransferInOrders(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: Array<{
        key: string;
        value: string | number;
        oper?: '=' | '!=' | '>' | '<' | 'like';
        join?: 'and' | 'or';
      }>;
    } = {}
  ): Promise<{
    list: Array<{
      id: number;
      orderId: string;
      unitId: number;
      unitEcode: string;
      coinId: string;
      network: string;
      amount: string;
      status: string;
      fromAddress: string;
      toAddress: string;
      txHash?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
    total: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business: Record<string, unknown> = {};
    if (options.pageIndex !== undefined) business.pageIndex = options.pageIndex;
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.sortFields) business.sortFields = options.sortFields;
    if (options.queryList) business.queryList = options.queryList;

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{
      list: Array<{
        id: number;
        orderId: string;
        unitId: number;
        unitEcode: string;
        coinId: string;
        network: string;
        amount: string;
        status: string;
        fromAddress: string;
        toAddress: string;
        txHash?: string;
        createdAt: string;
        updatedAt?: string;
      }>;
      total: number;
      pageIndex: number;
      pageSize: number;
    }>(`/api/third-party/transfer-in-orders/${resourceAccessKey}`, { basic, business });
  }

  // ============ Signature Task Methods ============

  /**
   * Submit task approval/rejection
   * POST /api/third-party/submit/task/{resourceAccessKey}/{taskId}
   */
  async submitTask(
    resourceAccessKey: string,
    taskId: string,
    request: {
      signatures?: Record<string, string[]>;
      confirmed: boolean;
    }
  ): Promise<{ success: boolean; taskId: string; status: string }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business: request,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{ success: boolean; taskId: string; status: string }>(
      `/api/third-party/submit/task/${resourceAccessKey}/${taskId}`,
      { basic, business: request }
    );
  }

  // ============ Transaction Methods ============

  /**
   * List activities
   * POST /api/third-party/activities/{resourceAccessKey}
   */
  async listActivities(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: Array<{
        key: string;
        value: string | number;
        oper?: '=' | '!=' | '>' | '<' | 'like';
        join?: 'and' | 'or';
      }>;
    } = {}
  ): Promise<{
    list: Array<{
      id: number;
      activityId: string;
      unitId: number;
      unitEcode: string;
      coinId: string;
      network: string;
      type: string;
      direction: 'IN' | 'OUT';
      amount: string;
      balanceBefore: string;
      balanceAfter: string;
      fee?: string;
      txHash?: string;
      fromAddress?: string;
      toAddress?: string;
      status: string;
      createdAt: string;
    }>;
    total: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business: Record<string, unknown> = {};
    if (options.pageIndex !== undefined) business.pageIndex = options.pageIndex;
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.sortFields) business.sortFields = options.sortFields;
    if (options.queryList) business.queryList = options.queryList;

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{
      list: Array<{
        id: number;
        activityId: string;
        unitId: number;
        unitEcode: string;
        coinId: string;
        network: string;
        type: string;
        direction: 'IN' | 'OUT';
        amount: string;
        balanceBefore: string;
        balanceAfter: string;
        fee?: string;
        txHash?: string;
        fromAddress?: string;
        toAddress?: string;
        status: string;
        createdAt: string;
      }>;
      total: number;
      pageIndex: number;
      pageSize: number;
    }>(`/api/third-party/activities/${resourceAccessKey}`, { basic, business });
  }

  /**
   * List fund records
   * POST /api/third-party/fund-records/{resourceAccessKey}
   */
  async listFundRecords(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: Array<{
        key: string;
        value: string | number;
        oper?: '=' | '!=' | '>' | '<' | 'like';
        join?: 'and' | 'or';
      }>;
    } = {}
  ): Promise<{
    list: Array<{
      id: number;
      recordId: string;
      unitId: number;
      unitEcode: string;
      coinId: string;
      network: string;
      accountType: string;
      txType: string;
      amount: string;
      balanceBefore: string;
      balanceAfter: string;
      fee?: string;
      txHash?: string;
      fromAddress?: string;
      toAddress?: string;
      createdAt: string;
    }>;
    total: number;
    pageIndex: number;
    pageSize: number;
  }> {
    const timestamp = getTimestamp();
    const nonce = generateNonce();
    const business: Record<string, unknown> = {};
    if (options.pageIndex !== undefined) business.pageIndex = options.pageIndex;
    if (options.pageSize) business.pageSize = options.pageSize;
    if (options.sortFields) business.sortFields = options.sortFields;
    if (options.queryList) business.queryList = options.queryList;

    const params: ResourceSignatureParams = {
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      authorizationId: resourceAccessKey,
      timestamp,
      nonce,
      business,
    };

    const basic = buildBasicInfoWithAuthorization(params);

    return this.http.post<{
      list: Array<{
        id: number;
        recordId: string;
        unitId: number;
        unitEcode: string;
        coinId: string;
        network: string;
        accountType: string;
        txType: string;
        amount: string;
        balanceBefore: string;
        balanceAfter: string;
        fee?: string;
        txHash?: string;
        fromAddress?: string;
        toAddress?: string;
        createdAt: string;
      }>;
      total: number;
      pageIndex: number;
      pageSize: number;
    }>(`/api/third-party/fund-records/${resourceAccessKey}`, { basic, business });
  }

  // ============ Webhook Methods ============

  /**
   * Register webhook
   * POST /api/v1/isv/webhooks/webhooks
   */
  async registerWebhook(request: {
    url: string;
    eventTypes: string[];
  }): Promise<{
    id: string;
    url: string;
    eventTypes: string[];
    isActive: boolean;
    secret: string;
  }> {
    const response = await this.http.post<{
      id: string;
      url: string;
      event_types: string[];
      is_active: boolean;
      secret: string;
    }>('/api/v1/isv/webhooks/webhooks', request);

    return {
      id: response.id,
      url: response.url,
      eventTypes: response.event_types,
      isActive: response.is_active,
      secret: response.secret,
    };
  }

  /**
   * List webhooks
   * GET /api/v1/isv/webhooks/webhooks
   */
  async listWebhooks(): Promise<
    Array<{
      id: string;
      url: string;
      eventTypes: string[];
      isActive: boolean;
    }>
  > {
    const response = await this.http.get<
      Array<{
        id: string;
        url: string;
        event_types: string[];
        is_active: boolean;
      }>
    >('/api/v1/isv/webhooks/webhooks');

    return response.map((wh) => ({
      id: wh.id,
      url: wh.url,
      eventTypes: wh.event_types,
      isActive: wh.is_active,
    }));
  }

  /**
   * Delete webhook
   * DELETE /api/v1/isv/webhooks/webhooks/:id
   */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    await this.http.delete(`/api/v1/isv/webhooks/webhooks/${id}`);
    return { success: true };
  }

  // ============ Callback Methods ============

  /**
   * Handle callback request from Cregis platform
   *
   * Verifies the HMAC-SHA256 signature and calls the provided callback
   * with the parsed payload if verification succeeds.
   *
   * Supports two callback scenarios:
   * - Business parameter callback: signature based on appId + "." + timestamp
   * - Global Application callback: signature based on appId + "." + event + "." + timestamp
   *
   * @param req - HTTP request object (Express or Koa compatible)
   * @param callback - Business handler called with verified payload
   * @throws SDKError with SIGNATURE_INVALID if verification fails
   *
   * @example
   * // Express route
   * app.post('/callback', (req, res) => {
   *   sdk.onCallback(req, (payload) => {
   *     console.log('Event:', payload.event, 'Data:', payload.data);
   *     res.status(200).send('OK');
   *   });
   * });
   */
  public onCallback(
    req: CallbackRequest,
    callback: (payload: CallbackPayload) => void
  ): void {
    const signature = req.headers['x-signature']?.replace('sha256=', '');
    const timestamp = req.headers['x-timestamp'];
    // Event comes from body.event (global Application callback) or X-Event header (fallback)
    const event = req.body?.event || req.headers['x-event'];

    // Validate required headers
    if (!signature || !timestamp) {
      throw new SDKError(
        SDKErrorCode.SIGNATURE_INVALID,
        'Missing required signature or timestamp headers'
      );
    }

    // Verify signature
    const isValid = this.callbackService.verifySignature({
      appSecret: this.config.appSecret,
      appId: req.body?.appId || this.config.appId,
      event,
      timestamp,
      signature,
    });

    if (!isValid) {
      throw new SDKError(
        SDKErrorCode.SIGNATURE_INVALID,
        'Invalid callback signature'
      );
    }

    // Debug logging
    if (this.config.debug) {
      console.log('[CregisSDK] Callback verified:', { event, timestamp });
    }

    // Call business callback with verified payload
    callback(req.body as CallbackPayload);
  }

  // ============ Utility Methods ============

  /**
   * Get current config (without sensitive data)
   */
  getConfig(): Pick<SDKConfig, 'baseUrl' | 'appId' | 'timeout' | 'debug'> {
    return {
      baseUrl: this.config.baseUrl,
      appId: this.config.appId,
      timeout: this.config.timeout,
      debug: this.config.debug,
    };
  }
}

// Re-export types and utilities
export * from '../types';
export * from './error';
export * from './signature';
export * from './http';
