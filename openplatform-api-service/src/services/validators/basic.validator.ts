/**
 * BasicInfo 基础验证器
 * 用于 OAuth 接口：/oauth/token, /oauth/authorizeUrl, /oauth/verify
 *
 * 验证字段：appId, timestamp, nonce, signature
 */

import { BasicValidationRequest, BasicInfo } from '../../requests/BasicValiationRequest';
import { RequestWithContext } from '../../requests/extended-request';
import * as common from './common.validator';
import { IRequestValidator } from './interfaces';
import { BusinessCodes } from '../../enums/business-codes.enum';

export { BasicInfo } from '../../requests/BasicValiationRequest';

// Re-export common validator utilities
export const TIMESTAMP_TOLERANCE = common.TIMESTAMP_TOLERANCE;
export const isValidUUID = common.isValidUUID;
export const isTimestampValid = common.isTimestampValid;
export const isValidSignatureFormat = common.isValidSignatureFormat;
export const validateAppId = common.validateAppId;
export const validateTimestamp = common.validateTimestamp;
export const validateNonce = common.validateNonce;
export const validateSignatureFormat = common.validateSignatureFormat;
export const sortObjectKeys = common.sortObjectKeys;
export const calculateBusinessMd5 = common.calculateBusinessMd5;
export const verifyBasicSignature = common.verifyBasicSignature;
export const maskSignature = common.maskSignature;
export const validateAppSecret = common.validateAppSecret;

// Types
export type ValidationResult = common.ValidationResult;
export type ValidationError = common.ValidationError;

/**
 * 从 Express Request 中提取 BasicInfo
 *
 * Request 格式:
 * {
 *   body: {
 *     basic: { appId, timestamp, nonce, signature }
 *   }
 * }
 *
 * @param req BasicValidationRequest 对象
 * @returns BasicInfo 或 null (如果提取失败)
 */
export function extractBasicInfo(req: BasicValidationRequest): BasicInfo | null {
    const body = req.body;

    if (!body?.basic) {
        return null;
    }

    const { appId, timestamp, nonce, signature } = body.basic;

    if (appId && timestamp !== undefined && nonce && signature) {
        return {
            appId: String(appId),
            timestamp: Number(timestamp),
            nonce: String(nonce),
            signature: String(signature),
        };
    }

    return null;
}

/**
 * BasicValidator - 基础验证器
 *
 * 职责：验证 BasicInfo 的基础字段格式和有效性
 * 签名验证：需要 request.context 中包含 application
 *
 * 使用场景：
 * - /oauth/token
 * - /oauth/authorizeUrl
 * - /oauth/verify
 *
 * 继承说明：
 * - 子类 ResourceValidator 继承此类，复用基础验证逻辑
 */
export class BasicValidator implements IRequestValidator {
    /**
     * Request-aware 验证方法
     * 从 Request 中提取 BasicInfo 并验证
     * 如果 request.context 中包含 application，则进行签名验证
     *
     * @param req BasicValidationRequest 对象
     * @returns 验证结果（异步）
     */
    async validateRequest(req: RequestWithContext): Promise<ValidationResult> {
        const basic = extractBasicInfo(req);

        if (!basic) {
            return {
                valid: false,
                errors: [{
                    field: 'basic',
                    code: BusinessCodes.PARAM_REQUIRED,
                    message: 'Missing or incomplete basic info in request body. Required format: { basic: { appId, timestamp, nonce, signature }, business: { ... } }',
                }],
            };
        }

        // 基础字段验证
        const errors: ValidationError[] = [];
        validateAppId(basic.appId, errors);
        validateTimestamp(basic.timestamp, errors);
        validateNonce(basic.nonce, errors);
        validateSignatureFormat(basic.signature, errors);
        validateAppSecret(req.context?.application?.appSecret, errors);

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // 如果 request.context 中有 application，进行签名验证
        const appSecret = req.context?.application?.appSecret || '';
        const businessData = req.body.business as Record<string, unknown> | undefined;
        const isValidSignature = verifyBasicSignature(
            appSecret,
            basic.appId,
            basic.timestamp,
            basic.nonce,
            basic.signature,
            businessData,
        );

        if (!isValidSignature) {
            errors.push({
                field: 'signature',
                code: BusinessCodes.AUTH_INVALID_SIGNATURE,
                message: 'Invalid signature',
            });
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

/**
 * 创建 BasicValidator 实例
 * 用于 OAuth 接口的验证
 */
export function createBasicValidator(): BasicValidator {
    return new BasicValidator();
}