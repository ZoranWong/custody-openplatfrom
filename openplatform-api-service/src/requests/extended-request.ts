/**
 * Extended Request Types
 * Add context to Express Request
 */

import { Request } from 'express';

export interface RequestWithContext<P = any, R = any> extends Request<P, any, R> {
    context?: Record<string, any>;
}