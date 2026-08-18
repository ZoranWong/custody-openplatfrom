/**
 * Captcha Service
 * Simple sliding captcha — no image, just mathematical distance verification.
 *
 * Flow:
 *   generate() → captchaId + targetX stored in cache
 *   verify()   → compare slideX with targetX, return JWT token
 */

import { v4 as uuidv4 } from 'uuid';
import { getCache } from './cache.service';
import { signJWT, verifyJWT } from '../utils/jwt.util';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300; // 5 minutes
const CAPTCHA_TOKEN_TTL = 300; // 5 minutes
const TOLERANCE = 5; // ±5px tolerance

export interface CaptchaGenerateResult {
  captchaId: string;
  trackWidth: number;
  targetX: number;
}

export interface CaptchaVerifyResult {
  valid: boolean;
  captchaToken?: string;
  message?: string;
}

export async function generateCaptcha(): Promise<CaptchaGenerateResult> {
  const captchaId = uuidv4();
  const trackWidth = 300;
  const targetX = Math.floor(Math.random() * (trackWidth - 40)) + 20;

  const cache = await getCache();
  await cache.set(`${CAPTCHA_PREFIX}${captchaId}`, targetX, CAPTCHA_TTL * 1000);

  return { captchaId, trackWidth, targetX };
}

export async function verifyCaptcha(
  captchaId: string,
  slideX: number
): Promise<CaptchaVerifyResult> {
  const cache = await getCache();
  const targetX = await cache.get(`${CAPTCHA_PREFIX}${captchaId}`);

  if (targetX === undefined || targetX === null) {
    return { valid: false, message: 'Captcha expired or invalid' };
  }

  await cache.del(`${CAPTCHA_PREFIX}${captchaId}`);

  if (Math.abs(Number(targetX) - slideX) > TOLERANCE) {
    return { valid: false, message: 'Verification failed, please try again' };
  }

  const { token } = signJWT(
    { captchaId, verified: true, type: 'captcha' },
    { expiresIn: CAPTCHA_TOKEN_TTL }
  );

  return { valid: true, captchaToken: token };
}

export function validateCaptchaToken(token: string): boolean {
  const payload = verifyJWT<{ verified: boolean; type: string }>(token);
  return payload !== null && payload.verified === true && payload.type === 'captcha';
}