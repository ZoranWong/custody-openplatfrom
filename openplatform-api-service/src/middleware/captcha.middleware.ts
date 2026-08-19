/**
 * Captcha Middleware
 * Validates the captcha token before login.
 *
 * Flow:
 *   1. Frontend calls GET /api/v1/captcha/generate → gets captchaId
 *   2. User completes slider → POST /api/v1/captcha/verify → gets captchaToken
 *   3. Login request carries { captchaToken } → middleware validates it
 */

import { Request, Response, NextFunction } from 'express';
import { validateCaptchaToken } from '../services/captcha.service';

export async function captchaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { captchaToken } = req.body;

    if (!captchaToken) {
      res.status(400).json({
        code: 40002,
        message: 'Captcha verification required',
      });
      return;
    }

    if (!validateCaptchaToken(captchaToken)) {
      res.status(400).json({
        code: 40003,
        message: 'Captcha verification failed or expired',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Captcha middleware error:', error);
    res.status(500).json({ code: 50001, message: 'Internal server error' });
  }
}