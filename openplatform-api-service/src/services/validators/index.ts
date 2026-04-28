/**
 * Validators Module
 *
 * 统一导出验证器相关类型和类
 */

// Validator interfaces
export {
    IRequestValidator,
} from './interfaces';

export type {
    ValidationResult,
    ValidationError,
} from './common.validator';

// Common validator utilities
export {
    TIMESTAMP_TOLERANCE,
    isValidUUID,
    isTimestampValid,
    isValidSignatureFormat,
    validateAppId,
    validateTimestamp,
    validateNonce,
    validateSignatureFormat,
    validateAuthorizationId,
    sortObjectKeys,
    calculateBusinessMd5,
    verifyBasicSignature,
    verifyResourceSignature,
    maskSignature,
    validateAppSecret,
} from './common.validator';

// BasicValidator 及其类型和提取函数
export {
    BasicValidator,
    extractBasicInfo,
} from './basic.validator';

export type {
    BasicInfo,
} from './basic.validator';

// ResourceValidator 及其类型和提取函数
export {
    ResourceValidator,
    createResourceValidator,
    createBasicValidator,
    extractBasicInfoWithAuthorization,
} from './resource.validator';

export type {
    BasicInfoWithAuthorization,
} from './resource.validator';
