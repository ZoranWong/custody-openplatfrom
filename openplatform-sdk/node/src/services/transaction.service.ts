/**
 * Cregis OpenPlatform SDK - Transaction Service
 *
 * Implements API endpoints from thirdparty-integration-guide.md:
 * - POST /api/third-party/activities/{resourceAccessKey} - 查询活动记录
 * - POST /api/third-party/transfer-out-orders/{resourceAccessKey} - 查询出金订单
 * - POST /api/third-party/transfer-in-orders/{resourceAccessKey} - 查询入金订单
 * - POST /api/third-party/fund-records/{resourceAccessKey} - 查询资金流水
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
 * Query Condition
 */
interface QueryCondition {
  key: string;
  value: string | number;
  oper?: '=' | '!=' | '>' | '<' | 'like';
  join?: 'and' | 'or';
}

/**
 * Transaction Service
 */
export class TransactionService {
  private readonly http: HttpClient;
  private readonly config: SDKConfig;

  constructor(http: HttpClient, config: SDKConfig) {
    this.http = http;
    this.config = config;
  }

  /**
   * List activities (活动记录)
   * POST /api/third-party/activities/{resourceAccessKey}
   */
  async listActivities(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: QueryCondition[];
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

    const response = await this.http.post<{
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
    }>(`/api/third-party/activities/${resourceAccessKey}`, {
      basic,
      business,
    });

    return response;
  }

  /**
   * List fund records (资金流水)
   * POST /api/third-party/fund-records/{resourceAccessKey}
   */
  async listFundRecords(
    resourceAccessKey: string,
    options: {
      pageIndex?: number;
      pageSize?: number;
      sortFields?: string;
      queryList?: QueryCondition[];
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

    const response = await this.http.post<{
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
    }>(`/api/third-party/fund-records/${resourceAccessKey}`, {
      basic,
      business,
    });

    return response;
  }
}
