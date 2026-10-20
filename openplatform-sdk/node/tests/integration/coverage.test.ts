/**
 * Full API Coverage Tests
 *
 * Covers the SDK methods that e2e.test.ts / business.test.ts don't exercise
 * against a live gateway: merchant/user/board management, address creation by
 * account, coins, fund control, whitelist, payout creation, OAuth verify, the
 * custody callback endpoint, and the OAuth internal endpoints.
 *
 * Write endpoints that would create real resources (merchant, treasury unit,
 * board, payout) are exercised only up to the backend's validation layer —
 * they are sent with incomplete payloads, so the backend rejects them before
 * creating anything. Read/creation-safe calls run in full.
 *
 * Run:
 *   npm test -- --run tests/integration/
 *   TEST_ENV=testing npm test -- --run tests/integration/
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  BASE_URL, APP_ID, RESOURCE_KEY, TREASURY_UNIT_ID,
  createSDK, healthCheck, printDiagnostic,
} from './helpers';
import { CregisSDK, SDKError } from '../../src';

let sdk: CregisSDK;
let authorizeId: string;
let payinAccountId: number;
let payinCoinId: string;
let payinNetwork: string;

beforeAll(async () => {
  if (!(await healthCheck())) {
    throw new Error(`API service not reachable at ${BASE_URL}`);
  }
  sdk = createSDK();

  // TEST-ONLY: /oauth/verify is called by the Custody backend in production, not by
  // developers. We call it directly here just to provision an oauth_resources row.
  const authUrl = await sdk.getAuthorizationUrl({
    permissions: ['read', 'write'],
    callback: 'https://example.com/callback',
    state: 'coverage-' + Date.now(),
  });
  const token = new URL(authUrl.authorizeUrl).searchParams.get('appToken')!;
  const res = await fetch(`${BASE_URL}/api/thirdparty/oauth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceKey: RESOURCE_KEY, oauthToken: token }),
  });
  const verified: any = await res.json();
  if (verified.code !== 0) throw new Error(`oauth/verify failed: ${JSON.stringify(verified)}`);
  authorizeId = verified.data.authorizeId;

  const accounts = await sdk.listUnitAccount(authorizeId, TREASURY_UNIT_ID);
  const payin = accounts.find(a => a.type === 'PAYIN');
  if (!payin) throw new Error(`No PAYIN account for unit ${TREASURY_UNIT_ID}`);
  payinAccountId = payin.id;
  payinCoinId = payin.coinId;
  payinNetwork = payin.network;
});

/** Assert the call reached the backend and was rejected with a business code. */
async function expectBusinessError(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    if (!(error instanceof SDKError)) {
      printDiagnostic(error, label);
      throw error;
    }
    expect(error.details?.apiCode).toBeDefined();
    console.log(`[Coverage] ${label} → apiCode ${error.details?.apiCode}: ${error.message}`);
  }
}

// ============ Treasury: address by account ============

describe('Treasury — createUnitAddressByAccount', () => {
  it('creates an address from a PAYIN account id and returns it', async () => {
    const addresses = await sdk.createUnitAddressByAccount(authorizeId, payinAccountId, 1);
    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses[0].address).toBeTruthy();
    expect(addresses[0].cusAccountId).toBe(payinAccountId);
    console.log(`[Coverage] createUnitAddressByAccount → ${addresses[0].address}`);
  }, 30000);
});

// ============ Treasury: coins / fund control / whitelist ============

describe('Treasury — coins, fund control, whitelist', () => {
  it('addCoins rejects a non-existent unit', async () => {
    await expectBusinessError(
      () => sdk.addCoins(authorizeId, { treasuryUnitId: 999999, coinIds: [] }),
      'addCoins',
    );
  }, 15000);

  it('updateFundControl rejects a non-existent unit', async () => {
    await expectBusinessError(
      () => sdk.updateFundControl(authorizeId, { treasuryUnitId: 999999, fundControls: [] }),
      'updateFundControl',
    );
  }, 15000);

  it('updateWhitelist rejects a non-existent unit', async () => {
    await expectBusinessError(
      () => sdk.updateWhitelist(authorizeId, { treasuryUnitId: 999999 }),
      'updateWhitelist',
    );
  }, 15000);
});

// ============ Treasury: create unit / custom unit ============

describe('Treasury — create units', () => {
  it('createTreasuryUnit rejects an incomplete payload (validation layer)', async () => {
    await expectBusinessError(
      () => sdk.createTreasuryUnit(authorizeId, { unitName: 'INCOMPLETE' } as any),
      'createTreasuryUnit',
    );
  }, 15000);

  it('createCustomUnit rejects an incomplete payload (validation layer)', async () => {
    await expectBusinessError(
      () => sdk.createCustomUnit(authorizeId, {} as any),
      'createCustomUnit',
    );
  }, 15000);
});

// ============ Payout ============

describe('Payout — createPayout', () => {
  it('createPayout rejects a non-existent source unit', async () => {
    await expectBusinessError(
      () => sdk.createPayout(authorizeId, {
        payTo: [{ to: '0x0000000000000000000000000000000000000000', amount: 1 }],
        unitId: 999999,
        coinId: payinCoinId,
        network: payinNetwork,
        merchantType: 'NON_FINANCIAL_CORPORATE',
      }),
      'createPayout',
    );
  }, 20000);
});

// ============ Merchant / User / Board ============

describe('Merchant / User / Board', () => {
  it('registerMerchant rejects a payload missing legalName/appId', async () => {
    await expectBusinessError(
      () => sdk.registerMerchant({ legalName: '', appId: '' } as any),
      'registerMerchant',
    );
  }, 15000);

  it('addUser rejects a payload missing email/password', async () => {
    await expectBusinessError(
      () => sdk.addUser(authorizeId, {} as any),
      'addUser',
    );
  }, 15000);

  it('initBoard rejects an empty guardians list', async () => {
    await expectBusinessError(
      () => sdk.initBoard(authorizeId, { guardians: [], threshold: 1 }),
      'initBoard',
    );
  }, 15000);
});

// ============ OAuth verify ============

describe('OAuth — verify endpoint (internal, Custody → gateway)', () => {
  it('rejects an invalid oauthToken', async () => {
    const res = await fetch(`${BASE_URL}/api/thirdparty/oauth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceKey: RESOURCE_KEY, oauthToken: 'not-a-jwt' }),
    });
    const body: any = await res.json();
    expect(res.status).toBe(401);
    expect(body.code).toBe(40101);
  }, 15000);
});

// ============ Custody callback ============

describe('Custody callback', () => {
  const post = (body: unknown) => fetch(`${BASE_URL}/api/thirdparty/custody/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json() as Promise<any>);

  it('rejects a callback without resourceKey', async () => {
    const res = await post({});
    expect(res.code).toBe(40001);
  });

  it('rejects a callback with an unknown resourceKey', async () => {
    const res = await post({ resourceKey: 'unknown-resource-key' });
    expect(res.code).toBe(40401);
  });

  it('accepts a callback for a provisioned resourceKey', async () => {
    const res = await post({
      resourceKey: RESOURCE_KEY,
      eventType: 'transaction.completed',
      orderId: 'COVERAGE-TEST',
      status: 'SUCCEED',
    });
    expect(res.code).toBe(200);
  }, 15000);
});

// ============ OAuth internal endpoints ============

describe('OAuth internal endpoints', () => {
  const post = (path: string, body: unknown) => fetch(`${BASE_URL}/api/oauth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() as any }));

  it('appToken/refresh rejects an invalid grant_type', async () => {
    const { status, body } = await post('/appToken/refresh', { grant_type: 'bogus' });
    expect(status).toBe(400);
    expect(body.code).toBe(40001);
  });

  it('appToken/refresh rejects invalid client credentials', async () => {
    const { status, body } = await post('/appToken/refresh', {
      grant_type: 'client_credentials', appid: APP_ID, appsecret: 'wrong-secret',
    });
    expect(status).toBe(401);
    expect(body.code).toBe(40110);
  });

  it('revoke rejects an unknown refresh token', async () => {
    const { status, body } = await post('/revoke', { refresh_token: 'not-a-token' });
    expect(status).toBe(401);
    expect(body.code).toBe(40107);
  });

  it('appToken/validate rejects a malformed token', async () => {
    const { status, body } = await post('/appToken/validate', { appId: APP_ID, appToken: 'bad-token' });
    expect(status).toBe(401);
    expect(body.code).toBe(40103);
  });
});
