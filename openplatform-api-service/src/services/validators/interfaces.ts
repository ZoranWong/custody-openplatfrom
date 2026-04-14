/**
 * Validator Interfaces
 *
 * 定义验证器统一接口
 */

import { RequestWithContext } from '../../requests/extended-request';
import { ValidationResult } from './common.validator';

/**
 * Request Validator Interface
 *
 * 验证器接口，所有验证器必须实现此接口
 *
 * 设计说明：
 * - validateRequest 接收 RequestWithContext，通过 req.body.basic 提取数据
 * - 每个 validator 内部处理自己的类型约束（BasicValidator vs ResourceValidator）
 * - 支持异步验证（ResourceValidator 需要调用数据库验证 authorizationId）
 */
export interface IRequestValidator {
    /**
     * 验证请求
     * @param req RequestWithContext 请求对象
     * @returns 验证结果（支持异步）
     */
    validateRequest(req: RequestWithContext): ValidationResult | Promise<ValidationResult>;
}
