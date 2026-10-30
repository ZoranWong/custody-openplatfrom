/**
 * Cregis OpenPlatform SDK - Complete Entry Point
 *
 * Node.js SDK for backend integration with Cregis Custody OpenPlatform.
 */

export { CregisSDK } from './core';
export {
  SDKError,
  SDKErrorCode,
  SDKErrorCode as ErrorCode,
  ErrorCodeMessages,
  isCustodyError,
  isRetryableError,
  getCustodyErrorInfo,
} from './core/error';
export {
  CustodyErrorCode,
  CustodyErrorInfo,
  CustodyErrorsByRoute,
  type CustodyErrorCategory,
  type CustodyErrorInfo as CustodyErrorDetail,
} from './core/custody-errors';
export { SignatureType } from './core/signature';
export { CallbackService } from './core/callback.service';
export * from './types';
