/**
 * ResourceInfo 资源验证器
 * 继承 BasicValidator，用于资源操作接口：/third-party/*
 *
 * 新增验证字段：authorizationId
 * 验证时调用 ResourceAuthorizationService 检查授权
 */

import {
    BasicWithAuthorizationValidationRequest,
    BasicInfoWithAuthorization,
} from '../../requests/BasicWithAuthorizationValidationRequest';
import { RequestWithContext } from '../../requests/extended-request';
import { BasicValidator, extractBasicInfo } from './basic.validator';
import * as common from './common.validator';
import { IRequestValidator } from './interfaces';
import { getAuthorizationService, AuthorizationResult } from '../resource-authorization.service';

export { BasicInfo } from './basic.validator';
export { BasicInfoWithAuthorization } from '../../requests/BasicWithAuthorizationValidationRequest';

// Re-export common validator utilities
export const isValidUUID = common.isValidUUID;
export const validateAppId = common.validateAppId;
export const validateTimestamp = common.validateTimestamp;
export const validateNonce = common.validateNonce;
export const validateSignatureFormat = common.validateSignatureFormat;
export const validateAuthorizationId = common.validateAuthorizationId;
export const verifyResourceSignature = common.verifyResourceSignature;
export const maskSignature = common.maskSignature;
export const validateAppSecret = common.validateAppSecret;

// Types
export const ValidationErrorCodes = common.ValidationErrorCodes;
export type ValidationResult = common.ValidationResult;
export type ValidationError = common.ValidationError;

// 扩展错误码
export const ResourceValidationErrorCodes = {
    ...ValidationErrorCodes,
    INVALID_AUTHORIZATION: '40301',  // 授权无效或不属于当前应用
} as const;

/**
 * 从 Express Request 中提取 BasicInfoWithAuthorization
 *
 * Request 格式:
 * {
 *   body: {
 *     basic: { appId, timestamp, nonce, signature, authorizationId }
 *   }
 * }
 *
 * @param req BasicWithAuthorizationValidationRequest 对象
 * @returns BasicInfoWithAuthorization 或 null (如果提取失败)
 */
export function extractBasicInfoWithAuthorization(
    req: BasicWithAuthorizationValidationRequest
): BasicInfoWithAuthorization | null {
    const basic = extractBasicInfo(req);

    if (!basic) {
        return null;
    }

    const { authorizationId } = req.body.basic || {};

    if (!authorizationId) {
        return null;
    }

    return {
        ...basic,
        authorizationId,
    };
}

/**
 * ResourceValidator - 资源验证器
 *
 * 继承自 BasicValidator，复用基础验证逻辑
 * 新增 authorizationId 验证
 * 签名验证：需要 request.context 中包含 application
 * 授权验证：调用 ResourceAuthorizationService.checkAuthorization
 *
 * 使用场景：
 * - /third-party/create/{resourceAccessKey}
 * - /third-party/list/{resourceAccessKey}
 * - /third-party/get-unit-address/{resourceAccessKey}
 * - /third-party/payout/{resourceAccessKey}
 * - /third-party/submit/task/{resourceAccessKey}/{taskId}
 * - /third-party/activities/{resourceAccessKey}
 * - /third-party/transfer-out-orders/{resourceAccessKey}
 * - /third-party/transfer-in-orders/{resourceAccessKey}
 * - /third-party/fund-records/{resourceAccessKey}
 */
export class ResourceValidator extends BasicValidator implements IRequestValidator {
    /**
     * Request-aware 验证方法
     * 从 Request 中提取 BasicInfoWithAuthorization 并验证
     * 如果 request.context 中包含 application，则进行签名验证（资源版本）
     * 调用 ResourceAuthorizationService 验证 authorizationId
     *
     * @param req BasicWithAuthorizationValidationRequest 对象
     * @returns 验证结果
     */
    async validateRequest(req: RequestWithContext): Promise<ValidationResult> {
        const basicWithAuth = extractBasicInfoWithAuthorization(req);

        if (!basicWithAuth) {
            return {
                valid: false,
                errors: [{
                    field: 'basic',
                    code: ValidationErrorCodes.MISSING_FIELD,
                    message: 'Missing or incomplete basic info in request body. Required format: { basic: { appId, timestamp, nonce, signature, authorizationId }, business: { ... } }',
                }],
            };
        }

        // 基础字段验证
        const errors: ValidationError[] = [];
        validateAppId(basicWithAuth.appId, errors);
        validateTimestamp(basicWithAuth.timestamp, errors);
        validateNonce(basicWithAuth.nonce, errors);
        validateSignatureFormat(basicWithAuth.signature, errors);
        validateAuthorizationId(basicWithAuth.authorizationId, errors);
        validateAppSecret(req.context?.application?.appSecret, errors);

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // 调用 ResourceAuthorizationService 验证 authorizationId
        // 注意：这里需要 appSecret 对应的 appId 与 authorizationId 关联的应用匹配
        const authService = getAuthorizationService();
        const authResult = await authService.checkAuthorization(
            basicWithAuth.appId,
            basicWithAuth.authorizationId,
        );

        if (!authResult.authorized) {
            errors.push({
                field: 'authorizationId',
                code: ResourceValidationErrorCodes.INVALID_AUTHORIZATION,
                message: authResult.errorMessage || 'Authorization is not valid for this application',
            });
            return { valid: false, errors };
        }

        // 如果 request.context 中有 application，进行签名验证（资源版本）
        const appSecret = req.context?.application?.appSecret || '';
        const businessData = req.body.business as Record<string, unknown> | undefined;
        const isValidSignature = verifyResourceSignature(
            appSecret,
            basicWithAuth.appId,
            basicWithAuth.authorizationId,
            basicWithAuth.timestamp,
            basicWithAuth.nonce,
            basicWithAuth.signature,
            businessData,
        );

        if (!isValidSignature) {
            errors.push({
                field: 'signature',
                code: ValidationErrorCodes.INVALID_SIGNATURE,
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
 * 创建 ResourceValidator 实例
 * 用于资源操作接口的验证
 */
export function createResourceValidator(): ResourceValidator {
    return new ResourceValidator();
}

/**
 * 创建 BasicValidator 实例
 * 用于 OAuth 接口的验证
 */
export function createBasicValidator(): BasicValidator {
    return new BasicValidator();
}