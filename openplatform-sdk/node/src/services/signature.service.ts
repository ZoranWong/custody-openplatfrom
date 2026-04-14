/**
 * Cregis OpenPlatform SDK - Signature Task Service
 *
 * Implements API endpoints from thirdparty-integration-guide.md:
 * - POST /api/third-party/submit/task/{resourceAccessKey}/{taskId} - 提交任务审批
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
 * Signature Task Service
 */
export class SignatureService {
  private readonly http: HttpClient;
  private readonly config: SDKConfig;

  constructor(http: HttpClient, config: SDKConfig) {
    this.http = http;
    this.config = config;
  }

  /**
   * Submit task approval/rejection (提交任务审批)
   * POST /api/third-party/submit/task/{resourceAccessKey}/{taskId}
   */
  async submitTask(
    resourceAccessKey: string,
    taskId: string,
    request: {
      signatures?: Record<string, string[]>;
      confirmed: boolean;
    }
  ): Promise<{
    success: boolean;
    taskId: string;
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
      success: boolean;
      taskId: string;
      status: string;
    }>(`/api/third-party/submit/task/${resourceAccessKey}/${taskId}`, {
      basic,
      business: request,
    });

    return response;
  }
}
