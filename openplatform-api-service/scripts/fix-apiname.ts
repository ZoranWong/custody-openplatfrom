/**
 * Fix apiName values in api_logs table.
 * - OAuth endpoints: map to human-readable names
 * - Forward endpoints: apiName already set from config.name, but may have path-based fallbacks
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

async function main() {
  const url = `mysql://root:${encodeURIComponent('Ex94811.')}@8.130.161.209:3306/cregis-openplatform`;
  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  // OAuth endpoint name mapping (from thirdparty.controller.ts)
  const oauthMap = {
    '/api/thirdparty/oauth/token': 'Issue OAuth Token',
    '/api/thirdparty/oauth/authorizeUrl': 'Get Authorization URL',
    '/api/thirdparty/oauth/verify': 'Verify OAuth Token',
  };

  // Forward endpoint name mapping (from forward-routes.ts)
  const forwardMap = {
    '/api/thirdparty/treasury/create': 'Create Treasury Unit',
    '/api/thirdparty/treasury/list': 'List Treasury Units',
    '/api/thirdparty/treasury/address': 'Get Treasury Unit Address',
    '/api/thirdparty/treasury/payout': 'Create Payout',
    '/api/thirdparty/treasury/submit-task': 'Submit Task',
    '/api/thirdparty/treasury/activities': 'List Activities',
    '/api/thirdparty/treasury/transfer-out-orders': 'List Transfer-Out Orders',
    '/api/thirdparty/treasury/transfer-in-orders': 'List Transfer-In Orders',
    '/api/thirdparty/treasury/fund-records': 'List Fund Records',
    '/api/thirdparty/treasury/unit-fund-records': 'List Unit Fund Records',
    '/api/thirdparty/treasury/pooling': 'Pooling Request',
    '/api/thirdparty/treasury/create-unit-address': 'Create Unit Address',
    '/api/thirdparty/treasury/list-unit-account': 'List Unit Accounts',
  };

  const allMap = { ...oauthMap, ...forwardMap };

  console.log('=== Current apiName values ===');
  const current = await prisma.$queryRaw`
    SELECT api_name, endpoint, COUNT(*) as cnt
    FROM api_logs
    GROUP BY api_name, endpoint
    ORDER BY api_name
  `;
  for (const row of current) {
    console.log(`  apiName="${row.api_name}"  endpoint="${row.endpoint}"  count=${row.cnt}`);
  }

  console.log('\n=== Fixing apiName values ===');
  let updated = 0;
  for (const [endpoint, apiName] of Object.entries(allMap)) {
    // Match endpoints that start with the key (handles path params like /submit-task/123)
    const result = await prisma.$executeRaw`
      UPDATE api_logs
      SET api_name = ${apiName}
      WHERE endpoint LIKE ${endpoint + '%'}
        AND (api_name IS NULL OR api_name != ${apiName})
    `;
    if (result > 0) {
      console.log(`  Fixed ${result} rows: ${endpoint} -> "${apiName}"`);
      updated += result;
    }
  }

  console.log(`\nTotal updated: ${updated} rows`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });