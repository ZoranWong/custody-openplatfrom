/**
 * Captcha Routes
 * Sliding captcha generation and verification for login protection
 */

import { Router } from 'express';
import { generateCaptcha, verifyCaptcha } from '../../services/captcha.service';

const router = Router();

router.get('/generate', async (_req: any, res: any) => {
  try {
    const result = await generateCaptcha();
    res.json({
      code: 0,
      message: 'Success',
      data: {
        captchaId: result.captchaId,
        trackWidth: result.trackWidth,
      },
    });
  } catch (error) {
    console.error('Generate captcha error:', error);
    res.status(500).json({ code: 50001, message: 'Failed to generate captcha' });
  }
});

router.post('/verify', async (req: any, res: any) => {
  try {
    const { captchaId, slideX } = req.body;

    if (!captchaId || slideX === undefined) {
      res.status(400).json({
        code: 40002,
        message: 'Missing required fields: captchaId, slideX',
      });
      return;
    }

    const result = await verifyCaptcha(captchaId, Number(slideX));

    if (!result.valid) {
      res.json({
        code: 40003,
        message: result.message,
      });
      return;
    }

    res.json({
      code: 0,
      message: 'Success',
      data: {
        captchaToken: result.captchaToken,
      },
    });
  } catch (error) {
    console.error('Verify captcha error:', error);
    res.status(500).json({ code: 50001, message: 'Failed to verify captcha' });
  }
});

export default router;