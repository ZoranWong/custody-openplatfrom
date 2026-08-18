/**
 * Captcha Service
 * Backend for slider-captcha-js integration.
 *
 * Flow:
 *   1. generate() → returns captchaId + targetX stored in cache
 *   2. verify()  → slider-captcha-js onVerify passes { x, duration, trail },
 *                  validate track behavior + compare x with targetX
 */

import { v4 as uuidv4 } from 'uuid';
import { getCache } from './cache.service';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300; // 5 minutes
const TOLERANCE = 5; // ±5px tolerance

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
  x: number;
  duration?: number;
  trail?: TrackPoint[];
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
 * Validate the slider track trajectory to detect bots.
 * Returns true if the track looks like human behavior.
 */
function validateTrack(trail: TrackPoint[]): boolean {
  if (!Array.isArray(trail) || trail.length < 5) return false;

  // 1. Total duration: 500ms ~ 3000ms (too fast or too slow = bot)
  const totalTime = trail[trail.length - 1].t - trail[0].t;
  if (totalTime < 500 || totalTime > 3000) return false;

  // 2. Speed variation: must have acceleration/deceleration
  const speeds: number[] = [];
  for (let i = 1; i < trail.length; i++) {
    const dx = trail[i].x - trail[i - 1].x;
    const dt = trail[i].t - trail[i - 1].t;
    if (dt <= 0) return false; // time must be monotonically increasing
    speeds.push(dx / dt);
  }
  const speedVariance = Math.max(...speeds) - Math.min(...speeds);
  if (speedVariance < 0.1) return false; // constant speed = bot

  // 3. Y-axis jitter: human finger has slight vertical movement
  const hasJitter = trail.some(p => Math.abs(p.y - trail[0].y) > 2);
  if (!hasJitter) return false; // perfectly straight line = bot

  return true;
}

/**
 * Verify the slider result from slider-captcha-js onVerify callback.
 * Validates both the track trajectory and the final x position.
 */
export async function verifyCaptcha(
  data: CaptchaVerifyData
): Promise<CaptchaVerifyResult> {
  const { captchaId, x, trail } = data;
  const cache = await getCache();
  const targetX = await cache.get(`${CAPTCHA_PREFIX}${captchaId}`);

  if (targetX === undefined || targetX === null) {
    return { success: false, message: 'Captcha expired or invalid' };
  }

  // One-time use — delete immediately
  await cache.del(`${CAPTCHA_PREFIX}${captchaId}`);

  // Validate position
  if (Math.abs(Number(targetX) - x) > TOLERANCE) {
    return { success: false, message: 'Verification failed, please try again' };
  }

  // Validate track behavior (anti-bot)
  if (trail && trail.length > 0 && !validateTrack(trail)) {
    return { success: false, message: 'Verification failed, please try again' };
  }

  return { success: true };
}