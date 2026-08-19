/**
 * Captcha Routes
 * Backend API for slider-captcha-js integration.
 *
 * Frontend usage:
 *   const captcha = new SliderCaptcha({
 *     root: '#captcha',
 *     onVerify: async (data) => {
 *       const res = await fetch('/api/v1/captcha/verify', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ captchaId, ...data }),
 *       });
 *       const result = await res.json();
 *       if (!result.data.success) throw new Error('Invalid');
 *     },
 *   });
 */

import { Router } from 'express';
import { generateCaptcha, verifyCaptcha } from '../../services/captcha.service';

const router = Router();

/**
 * GET /api/v1/captcha/generate
 * Generate a new captcha challenge.
 * Returns captchaId — slider-captcha-js handles the UI locally.
 */
router.get('/generate', async (_req: any, res: any) => {
  try {
    const result = await generateCaptcha();
    res.json({
      code: 0,
      message: 'Success',
      data: result,
    });
  } catch (error) {
    console.error('Generate captcha error:', error);
    res.status(500).json({ code: 50001, message: 'Failed to generate captcha' });
  }
});

/**
 * POST /api/v1/captcha/verify
 * Verify the slider result from slider-captcha-js onVerify callback.
 * Body: { captchaId, x, duration, trail }
 * Returns: { success, captchaToken }
 */
router.post('/verify', async (req: any, res: any) => {
  try {
    const { captchaId, x } = req.body;

    if (!captchaId || x === undefined) {
      res.status(400).json({
        code: 40002,
        message: 'Missing required fields: captchaId, x',
      });
      return;
    }

    const result = await verifyCaptcha({ captchaId, x });

    res.json({
      code: 0,
      message: 'Success',
      data: result,
    });
  } catch (error) {
    console.error('Verify captcha error:', error);
    res.status(500).json({ code: 50001, message: 'Failed to verify captcha' });
  }
});

export default router;