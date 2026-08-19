/**
 * Captcha Middleware
 * Validates captcha token before login.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyCaptcha } from '../services/captcha.service';

/**
 * Middleware to verify the captcha before proceeding to the login handler.
 * Expects req.body to contain { captchaId, captchaX }.
 * If captcha fails, returns 400 immediately.
 */
export async function captchaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { captchaId, captchaX } = req.body;

    if (!captchaId || captchaX === undefined) {
      res.status(400).json({
        code: 40002,
        message: 'Captcha verification required',
      });
      return;
    }

    const result = await verifyCaptcha({ captchaId, x: Number(captchaX) });

    if (!result.success) {
      res.status(400).json({
        code: 40003,
        message: result.message || 'Captcha verification failed',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Captcha middleware error:', error);
    res.status(500).json({ code: 50001, message: 'Internal server error' });
  }
}