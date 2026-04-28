/**
 * Common Validator - 公共验证器
 * 包含所有验证器共用的验证逻辑
 *
 * 验证器架构：
 * - common.validator.ts: 公共验证逻辑（格式验证）
 * - basic.validator.ts: 基础验证器，OAuth 接口使用
 * - resource.validator.ts: 资源验证器，继承 BasicValidator
 */

import * as crypto from 'crypto';
import { BusinessCodes } from '../../enums/business-codes.enum';

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    code: number;
    message: string;
}

// 时间戳容差（秒）
export const TIMESTAMP_TOLERANCE = 300; // 5 分钟

/**
 * 验证 UUID 格式
 */
export function isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * 验证时间戳是否在有效期内
 */
export function isTimestampValid(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - timestamp) <= TIMESTAMP_TOLERANCE;
}

/**
 * 验证签名格式（MD5 32位十六进制）
 */
export function isValidSignatureFormat(signature: string): boolean {
    const md5Regex = /^[0-9a-f]{32}$/i;
    return md5Regex.test(signature);
}

/**
 * 验证 appId
 */
export function validateAppId(appId: string | undefined, errors: ValidationError[]): void {
    if (!appId) {
        errors.push({
            field: 'appId',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'appId is required',
        });
        return;
    }

    if (!isValidUUID(appId)) {
        errors.push({
            field: 'appId',
            code: BusinessCodes.PARAM_INVALID_FORMAT,
            message: 'appId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
        });
    }
}

/**
 * 验证 timestamp
 */
export function validateTimestamp(timestamp: number | undefined, errors: ValidationError[]): void {
    if (timestamp === undefined || timestamp === null) {
        errors.push({
            field: 'timestamp',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'timestamp is required',
        });
        return;
    }

    if (!isTimestampValid(timestamp)) {
        errors.push({
            field: 'timestamp',
            code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
            message: `timestamp is expired or invalid. Must be within ${TIMESTAMP_TOLERANCE / 60} minutes of current time`,
        });
    }
}

/**
 * 验证 nonce
 */
export function validateNonce(nonce: string | undefined, errors: ValidationError[]): void {
    if (!nonce) {
        errors.push({
            field: 'nonce',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'nonce is required',
        });
    }
}


/**
 *  验证 appSecret 是否存在（用于签名验证）
 * @param appSecret 
 * @param errors 
 */
export function validateAppSecret(appSecret: string | undefined, errors: ValidationError[]): void {
    if (!appSecret) {
        errors.push({
            field: 'appSecret',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'appSecret is required for signature verification',
        });
    }
}

/**
 * 验证 signature 格式
 */
export function validateSignatureFormat(signature: string | undefined, errors: ValidationError[]): void {
    if (!signature) {
        errors.push({
            field: 'signature',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'signature is required',
        });
        return;
    }

    if (!isValidSignatureFormat(signature)) {
        errors.push({
            field: 'signature',
            code: BusinessCodes.PARAM_INVALID_FORMAT,
            message: 'signature must be a valid MD5 hash (32 hex characters)',
        });
    }
}

/**
 * 排序对象键以确保 JSON 序列化一致
 */
export function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
    if (obj === null || typeof obj !== 'object') {
        return obj as Record<string, unknown>;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) =>
            sortObjectKeys(item as Record<string, unknown>),
        ) as unknown as Record<string, unknown>;
    }

    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
        sorted[key] = sortObjectKeys(
            (obj as Record<string, unknown>)[key] as Record<string, unknown>,
        );
    }

    return sorted;
}

/**
 * 计算 business JSON 的 MD5
 */
export function calculateBusinessMd5(businessData: Record<string, unknown> | null | undefined): string {
    // Normalize null/undefined/empty to {} for consistent signing
    if (!businessData || Object.keys(businessData).length === 0) {
        return crypto.createHash('md5').update('{}').digest('hex');
    }

    const sorted = sortObjectKeys(businessData);
    const jsonString = JSON.stringify(sorted);
    return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * 验证 authorizationId
 */
export function validateAuthorizationId(authorizationId: string | undefined, errors: ValidationError[]): void {
    if (!authorizationId) {
        errors.push({
            field: 'authorizationId',
            code: BusinessCodes.PARAM_REQUIRED,
            message: 'authorizationId is required for resource operations',
        });
        return;
    }

    if (!isValidUUID(authorizationId)) {
        errors.push({
            field: 'authorizationId',
            code: BusinessCodes.PARAM_INVALID_FORMAT,
            message: 'authorizationId must be a valid UUID format',
        });
    }
}

/**
 * 验证基础签名 (OAuth 接口使用)
 * MD5(appSecret + appId + timestamp + nonce + md5(business))
 */
export function verifyBasicSignature(
    appSecret: string,
    appId: string,
    timestamp: number,
    nonce: string,
    signature: string,
    businessData: Record<string, unknown> | null | undefined,
): boolean {
    const businessMd5 = calculateBusinessMd5(businessData);
    const signString = appId + timestamp + nonce + businessMd5;
    const expectedSignature = crypto
        .createHash('md5')
        .update(appSecret + signString)
        .digest('hex');

    return signature === expectedSignature;
}

/**
 * 验证资源签名 (资源接口使用)
 * MD5(appSecret + appId + authorizationId + timestamp + nonce + md5(business))
 */
export function verifyResourceSignature(
    appSecret: string,
    appId: string,
    authorizationId: string,
    timestamp: number,
    nonce: string,
    signature: string,
    businessData: Record<string, unknown> | null | undefined,
): boolean {
    const businessMd5 = calculateBusinessMd5(businessData);
    const signString = appId + authorizationId + timestamp + nonce + businessMd5;
    const expectedSignature = crypto
        .createHash('md5')
        .update(appSecret + signString)
        .digest('hex');

    return signature === expectedSignature;
}

/**
 * 掩码敏感信息
 */
export function maskValue(
    value: string | undefined,
    prefixLen: number = 4,
    suffixLen: number = 4,
): string {
    if (!value) return '***';
    if (value.length <= prefixLen + suffixLen) return '***';
    return `${value.substring(0, prefixLen)}***${value.substring(value.length - suffixLen)}`;
}

/**
 * 掩码签名用于日志
 */
export function maskSignature(signature: string): string {
    return maskValue(signature, 4, 4);
}