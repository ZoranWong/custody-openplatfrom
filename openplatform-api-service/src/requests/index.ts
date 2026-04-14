/**
 * Requests Module
 *
 * 统一导出请求相关类型定义
 */

export {
    BasicValidationRequest,
    BasicInfo,
    BasicValidationBody,
} from './BasicValiationRequest';

export {
    BasicWithAuthorizationValidationRequest,
    BasicInfoWithAuthorization,
    BasicWithAuthorizationValidationBody,
} from './BasicWithAuthorizationValidationRequest';

export {
    RequestWithContext,
} from './extended-request';