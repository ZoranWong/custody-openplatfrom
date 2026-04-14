import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { RequestWithContext } from './extended-request';

export interface BasicInfoWithAuthorization {
    appId: string;
    timestamp: number;
    nonce: string;
    signature: string;
    authorizationId: string;
}
export interface BasicWithAuthorizationValidationBody {
    basic: BasicInfoWithAuthorization;
    business: Record<string, unknown>;
}

export type BasicWithAuthorizationValidationRequest = RequestWithContext<ParamsDictionary, BasicWithAuthorizationValidationBody>;