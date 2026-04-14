/**
 * Cregis OpenPlatform SDK - Treasury Unit Service
 *
 * Implements API endpoints from thirdparty-integration-guide.md:
 * - POST /api/third-party/create/{resourceAccessKey} - 创建财务单元
 * - POST /api/third-party/list/{resourceAccessKey} - 查询财务单元列表
 * - POST /api/third-party/get-unit-address/{resourceAccessKey} - 获取财务单元地址
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
 * Treasury Unit Service
 */
export class TreasuryService {
  private readonly http: HttpClient;
  private readonly config: SDKConfig;

  constructor(http: HttpClient, config: SDKConfig) {
    this.http = http;
    this.config = config;
  }

  /**
   * Create a new treasury unit (财务单元)
   * POST /api/third-party/create/{resourceAccessKey}
   */
  async create(
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

    const response = await this.http.post<{
      id: number;
      ecode: string;
      name: string;
      status: string;
      networks: string[];
      createTime: string;
    }>(`/api/third-party/create/${resourceAccessKey}`, {
      basic,
      business: request,
    });

    return response;
  }

  /**
   * List treasury units
   * POST /api/third-party/list/{resourceAccessKey}
   */
  async list(
    resourceAccessKey: string,
    options: {
      pageSize?: number;
      pageNum?: number;
      sortFields?: string;
    } = {}
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

    const response = await this.http.post<
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
    >(`/api/third-party/list/${resourceAccessKey}`, {
      basic,
      business,
    });

    return response;
  }

  /**
   * Get treasury unit addresses
   * POST /api/third-party/get-unit-address/{resourceAccessKey}
   */
  async getUnitAddress(
    resourceAccessKey: string,
    request: {
      unitId: number;
      accountType?: string;
      coinId?: string;
      network?: string;
      pageSize?: number;
      pageNum?: number;
    }
  ): Promise<
    Array<{
      address: string;
      accountType: string;
    }>
  > {
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

    const response = await this.http.post<
      Array<{
        address: string;
        accountType: string;
      }>
    >(`/api/third-party/get-unit-address/${resourceAccessKey}`, {
      basic,
      business: request,
    });

    return response;
  }
}
