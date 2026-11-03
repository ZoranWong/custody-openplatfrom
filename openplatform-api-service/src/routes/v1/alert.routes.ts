/**
 * ISV Alert Settings Routes
 */

import { Router } from 'express';
import { isvAuth } from '../../middleware/isv-auth.middleware';
import { validateAlertSettings } from '../../validate/rules/alert.rules';
import {
  getAlertSettings,
  updateAlertSettings,
  getAlertEvents,
} from '../../controllers/isv/alert.controller';

const router = Router();

/** GET /api/v1/isv/alert-settings */
router.get('/alert-settings', isvAuth, getAlertSettings);

/** PUT /api/v1/isv/alert-settings */
router.put('/alert-settings', isvAuth, validateAlertSettings, updateAlertSettings);

/** GET /api/v1/isv/alert-events */
router.get('/alert-events', isvAuth, getAlertEvents);

export default router;
