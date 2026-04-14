import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { RequestWithContext } from './extended-request';

export interface BasicInfo {
    appId: string;
    timestamp: number;
    nonce: string;
    signature: string;
}
export interface BasicValidationBody {
    basic: BasicInfo;
    business: Record<string, unknown>;
}

export type BasicValidationRequest = RequestWithContext<ParamsDictionary, BasicValidationBody>;