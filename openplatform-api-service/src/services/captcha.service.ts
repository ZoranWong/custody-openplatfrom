/**
 * Captcha Service
 * Backend for slider-captcha-js integration.
 *
 * Flow:
 *   1. generate() → returns captchaId + targetX stored in cache
 *   2. verify()  → slider-captcha-js onVerify passes { x, duration, trail },
 *                  compare x with targetX, return result
 */

import { v4 as uuidv4 } from 'uuid';
import { getCache } from './cache.service';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300; // 5 minutes
const TOLERANCE = 5; // ±5px tolerance

export interface CaptchaGenerateResult {
  captchaId: string;
}

export interface CaptchaVerifyData {
  captchaId: string;
  x: number;
  duration?: number;
  trail?: [number, number][];
}

export interface CaptchaVerifyResult {
  success: boolean;
  message?: string;
}

/**
 * Generate a captcha challenge.
 * Stores a random targetX server-side, returns captchaId.
 */
export async function generateCaptcha(): Promise<CaptchaGenerateResult> {
  const captchaId = uuidv4();
  const targetX = Math.floor(Math.random() * 220) + 30; // 30 ~ 250

  const cache = await getCache();
  await cache.set(`${CAPTCHA_PREFIX}${captchaId}`, targetX, CAPTCHA_TTL * 1000);

  return { captchaId };
}

/**
 * Verify the slider result from slider-captcha-js onVerify callback.
 * The callback sends { x, duration, trail } — we only validate x.
 */
export async function verifyCaptcha(
  data: CaptchaVerifyData
): Promise<CaptchaVerifyResult> {
  const { captchaId, x } = data;
  const cache = await getCache();
  const targetX = await cache.get(`${CAPTCHA_PREFIX}${captchaId}`);

  if (targetX === undefined || targetX === null) {
    return { success: false, message: 'Captcha expired or invalid' };
  }

  // One-time use — delete immediately
  await cache.del(`${CAPTCHA_PREFIX}${captchaId}`);

  if (Math.abs(Number(targetX) - x) > TOLERANCE) {
    return { success: false, message: 'Verification failed, please try again' };
  }

  return { success: true };
}