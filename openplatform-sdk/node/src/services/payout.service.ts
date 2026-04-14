/**
 * Cregis OpenPlatform SDK - Payout Service
 *
 * Implements API endpoints from thirdparty-integration-guide.md:
 * - POST /api/third-party/payout/{resourceAccessKey} - 出金操作
 * - POST /api/third-party/transfer-out-orders/{resourceAccessKey} - 查询出金订单
 */

import { HttpClient } from '../core/http';
import { SDKConfig } from '../types';
import {
  generateNonce,
  getTimestamp,
  buildBasicInfoWithAuthorization,
  ResourceSignatureParams,
} from '../core/signature';

/**
 * Payout Service
 */
export class PayoutService {
  private readonly http: HttpClient;
  private readonly config: SDKConfig;

  constructor(http: HttpClient, config: SDKConfig) {
    this.http = http;
    this.config = config;
  }

  /**
   * Create a payout order (出金)
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
  ): Promise<{
    orderId: string;
    unitId: number;
    status: string;
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

    const response = await this.http.post<{
      orderId: string;
      unitId: number;
      status: string;
    }>(`/api/third-party/payout/${resourceAccessKey}`, {
      basic,
      business: request,
    });

    return response;
  }

  /**
   * List transfer-out orders (出金订单)
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

    const response = await this.http.post<{
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
    }>(`/api/third-party/transfer-out-orders/${resourceAccessKey}`, {
      basic,
      business,
    });

    return response;
  }

  /**
   * List transfer-in orders (入金订单)
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

    const response = await this.http.post<{
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
    }>(`/api/third-party/transfer-in-orders/${resourceAccessKey}`, {
      basic,
      business,
    });

    return response;
  }
}
