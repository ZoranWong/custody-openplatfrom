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
 *
 * Human sliding characteristics:
 * - Variable speed with acceleration and deceleration phases
 * - Slight pauses (hesitation) during the slide
 * - Y-axis jitter (finger naturally wobbles)
 * - Non-linear X progression (not perfectly smooth)
 * - Reasonable total duration
 */
function validateTrack(trail: TrackPoint[]): boolean {
  if (!Array.isArray(trail) || trail.length < 5) return false;

  // 1. Total duration: 500ms ~ 3000ms
  const totalTime = trail[trail.length - 1].t - trail[0].t;
  if (totalTime < 500 || totalTime > 3000) return false;

  // 2. Must have at least one pause (dt > 100ms between consecutive points)
  const hasPause = trail.some((p, i) => {
    if (i === 0) return false;
    return p.t - trail[i - 1].t > 100;
  });
  if (!hasPause) return false;

  // 3. Speed variation: must have acceleration and deceleration
  const speeds: number[] = [];
  for (let i = 1; i < trail.length; i++) {
    const dx = trail[i].x - trail[i - 1].x;
    const dt = trail[i].t - trail[i - 1].t;
    if (dt <= 0) return false;
    speeds.push(dx / dt);
  }

  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  // Speed must vary significantly (not constant)
  if (maxSpeed - minSpeed < 0.1) return false;

  // 4. Acceleration pattern: must have both speed-up and slow-down phases
  const firstHalf = speeds.slice(0, Math.floor(speeds.length / 2));
  const secondHalf = speeds.slice(Math.floor(speeds.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  // Human typically accelerates then decelerates near the target
  // Bot typically has flat speed or weird acceleration pattern
  const speedDiff = Math.abs(firstAvg - secondAvg);
  if (speedDiff < avgSpeed * 0.05) return false; // too flat

  // 5. Y-axis jitter: finger has natural vertical wobble
  const yValues = trail.map(p => p.y);
  const yRange = Math.max(...yValues) - Math.min(...yValues);
  if (yRange < 2) return false; // too straight

  // 6. X progression: should not be perfectly linear
  const totalX = trail[trail.length - 1].x - trail[0].x;
  const expectedStep = totalX / (trail.length - 1);
  let linearityScore = 0;
  for (let i = 1; i < trail.length; i++) {
    const actualStep = trail[i].x - trail[i - 1].x;
    linearityScore += Math.abs(actualStep - expectedStep);
  }
  const avgLinearity = linearityScore / trail.length;
  if (avgLinearity < 0.3) return false; // too linear = bot

  // 7. Track density: too few points for the duration = bot
  const pointDensity = trail.length / totalTime; // points per ms
  if (pointDensity < 0.005 || pointDensity > 0.1) return false;

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