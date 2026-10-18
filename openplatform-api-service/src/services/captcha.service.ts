/**
 * Captcha Service
 * Backend for slider-captcha-js integration.
 *
 * Flow:
 *   1. generate() → returns captchaId (one-time challenge)
 *   2. verify()  → confirms the captchaId is valid & unused, issues a token
 *
 * The frontend uses a "slide-to-the-end" unlock component (ArtDragVerify). The
 * backend only checks that the challenge is valid and one-time, which prevents
 * replay — the human check is the physical slide gesture itself.
 */

import { v4 as uuidv4 } from 'uuid';
import { getCache } from './cache.service';
import { signJWT, verifyJWT } from '../utils/jwt.util';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300; // 5 minutes

export interface CaptchaGenerateResult {
  captchaId: string;
}

export interface TrackPoint {
  x: number;
  y: number;
  t: number;
}

export interface CaptchaVerifyData {
  captchaId: string;
  x?: number;
  duration?: number;
  trail?: TrackPoint[];
}

export interface CaptchaVerifyResult {
  success: boolean;
  captchaToken?: string;
  message?: string;
}

/**
 * Generate a one-time captcha challenge.
 */
export async function generateCaptcha(): Promise<CaptchaGenerateResult> {
  const captchaId = uuidv4();

  const cache = await getCache();
  await cache.set(`${CAPTCHA_PREFIX}${captchaId}`, 1, CAPTCHA_TTL * 1000);

  return { captchaId };
}

/**
 * Verify the slider result.
 * Confirms the challenge is valid and unused (one-time), then issues a token.
 */
export async function verifyCaptcha(
  data: CaptchaVerifyData
): Promise<CaptchaVerifyResult> {
  const { captchaId } = data;
  const cache = await getCache();
  const challenge = await cache.get(`${CAPTCHA_PREFIX}${captchaId}`);

  if (challenge === undefined || challenge === null) {
    return { success: false, message: 'Captcha expired or invalid' };
  }

  // One-time use — delete immediately
  await cache.del(`${CAPTCHA_PREFIX}${captchaId}`);

  // Issue captcha token (JWT, 5min)
  const { token } = signJWT(
    { captchaId, verified: true, type: 'captcha' },
    { expiresIn: CAPTCHA_TTL }
  );

  return { success: true, captchaToken: token };
}

/**
 * Validate a captcha token.
 * Used by the login middleware to verify the token from the verify step.
 */
export function validateCaptchaToken(token: string): boolean {
  const payload = verifyJWT<{ verified: boolean; type: string }>(token);
  return payload !== null && payload.verified === true && payload.type === 'captcha';
}
