# Cregis OpenPlatform Node.js SDK

Node.js SDK for backend integration with Cregis Custody OpenPlatform.

## Installation

```bash
npm install @cregis-kit/openplatform-node
```

## Quick Start

```typescript
import { CregisSDK } from '@cregis-kit/openplatform-node';

const sdk = new CregisSDK({
  baseUrl: 'https://api.cregis.com', // or your custom base URL
  appId: 'your-app-id',             // UUID format
  appSecret: 'your-app-secret',
  timeout: 30000,
  debug: false,
});

// Get OAuth token
const token = await sdk.getAuthService().getToken();
console.log('Access token:', token.accessToken);
```

## Features

- **OAuth Token Management**: Get, refresh, and revoke access tokens
- **Authorization Management**: Store and manage resource authorizations
- **Enterprise Management**: Create and manage enterprise accounts
- **Treasury Unit Management**: Create and manage treasury units
- **Payment Operations**: Create and manage payment orders
- **Transfer Operations**: Internal account transfers
- **Pooling Operations**: Fund pooling and auto-pooling configuration
- **Signature Tasks**: Create and manage signature tasks
- **Transaction History**: Query transactions and fund records
- **Webhook Management**: Register and manage webhooks

## API Reference

### SDK Initialization

```typescript
import { CregisSDK, SDKConfig } from '@cregis-kit/openplatform-node';

const config: SDKConfig = {
  baseUrl: 'https://api.cregis.com',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  timeout: 30000,
  debug: false,
};

const sdk = new CregisSDK(config);
```

### Authentication

```typescript
const authService = sdk.getAuthService();

// Get access token
const token = await authService.getToken();

// Refresh token
const newToken = await authService.refreshToken();

// Revoke tokens
await authService.revoke();

// Get authorization URL
const url = await authService.getAuthorizationUrl({
  redirectUri: 'https://your-app.com/callback',
  scope: 'openplatform',
  state: 'random-state',
});

// Store authorization
await authService.storeAuthorization({
  authorizationId: 'auth-id',
  appId: 'app-id',
  resourceKey: 'resource-key',
  permissions: ['read', 'write'],
  status: 'active',
});
```

### Treasury Unit Management

```typescript
const treasuryService = new TreasuryService(sdk.getHttpClient(), config);

// Create treasury unit
const unit = await treasuryService.create('authorization-id', {
  name: 'My Treasury',
  unitType: 'CORPORATE_TREASURY',
});

// List treasury units
const units = await treasuryService.list('authorization-id', {
  page: 1,
  pageSize: 20,
});

// Get treasury unit detail
const unitDetail = await treasuryService.getDetail('authorization-id', 'unit-id');

// Get unit address
const address = await treasuryService.getAddress('authorization-id', 'unit-id', 'PRIMARY');

// List accounts
const accounts = await treasuryService.listAccounts('authorization-id', 'unit-id');

// Get account balance
const balance = await treasuryService.getBalance('authorization-id', 'unit-id', 'USDT');
```

### Payment Operations

```typescript
const paymentService = new PaymentService(sdk.getHttpClient(), config);

// Create payment order
const order = await paymentService.createOrder('authorization-id', {
  unitId: 'unit-id',
  fromAccountType: 'WITHDRAW_OUT',
  toAddress: '0x...',
  assetCode: 'USDT',
  amount: '100.00',
  bizType: 'procurement',
  bizId: 'ORDER-001',
});

// Get payment order
const orderDetail = await paymentService.getOrder('authorization-id', 'order-id');

// List payment orders
const orders = await paymentService.listOrders('authorization-id', 'unit-id', {
  page: 1,
  pageSize: 20,
  status: 'COMPLETED',
});
```

### Transfer Operations

```typescript
const transferService = new TransferService(sdk.getHttpClient(), config);

// Create transfer
const transfer = await transferService.createTransfer('authorization-id', {
  unitId: 'unit-id',
  fromAccountType: 'PRIMARY',
  toAccountType: 'PAYMENT',
  assetCode: 'USDT',
  amount: '50.00',
});

// Get transfer
const transferDetail = await transferService.getTransfer('authorization-id', 'transfer-id');

// List transfers
const transfers = await transferService.listTransfers('authorization-id', 'unit-id');
```

### Pooling Operations

```typescript
const poolingService = new PoolingService(sdk.getHttpClient(), config);

// Manual pooling
const pooling = await poolingService.createPooling('authorization-id', {
  unitId: 'unit-id',
  fromAccountTypes: ['RECEIVABLE', 'PAYMENT'],
  assetCode: 'USDT',
});

// Get pooling status
const status = await poolingService.getPoolingStatus('authorization-id', 'pooling-id');

// Configure auto pooling
await poolingService.configureAutoPooling('authorization-id', {
  unitId: 'unit-id',
  fromAccountTypes: ['RECEIVABLE'],
  assetCode: 'USDT',
  schedule: '0 0 * * *', // Daily at midnight
  enabled: true,
});
```

### Signature Tasks

```typescript
const signatureService = new SignatureService(sdk.getHttpClient(), config);

// Create signature task
const task = await signatureService.createTask('authorization-id', {
  unitId: 'unit-id',
  taskType: 'PAYMENT_APPROVAL',
  operationType: 'PAYOUT',
  data: {
    toAddress: '0x...',
    amount: '100.00',
  },
});

// Submit task approval
await signatureService.submitTask('authorization-id', 'task-id', true, 'signature');

// List tasks
const tasks = await signatureService.listTasks('authorization-id', 'unit-id');
```

### Transaction History

```typescript
const transactionService = new TransactionService(sdk.getHttpClient(), config);

// List transactions
const transactions = await transactionService.listTransactions('authorization-id', 'unit-id', {
  page: 1,
  pageSize: 20,
  assetCode: 'USDT',
  type: 'WITHDRAW',
});

// Get transaction
const tx = await transactionService.getTransaction('authorization-id', 'transaction-id');

// List fund records
const records = await transactionService.listFundRecords('authorization-id', 'unit-id');
```

### Webhook Management

```typescript
const webhookService = new WebhookService(sdk.getHttpClient(), config);

// Register webhook
const webhook = await webhookService.registerWebhook({
  url: 'https://your-app.com/webhook',
  eventTypes: ['transfer.completed', 'transfer.failed'],
});

// List webhooks
const webhooks = await webhookService.listWebhooks();

// List webhook events
const events = await webhookService.listEvents({
  page: 1,
  pageSize: 20,
  eventType: 'transfer.completed',
});
```

## Error Handling

```typescript
import { CregisSDK, SDKError, SDKErrorCode } from '@cregis-kit/openplatform-node';

try {
  const result = await someSdkOperation();
} catch (error) {
  if (error instanceof SDKError) {
    console.error('Error code:', error.code);
    console.error('HTTP status:', error.httpStatus);
    console.error('Details:', error.details);
    console.error('Is retryable:', error.isRetryable);

    if (error.code === SDKErrorCode.API_UNAUTHORIZED) {
      // Handle unauthorized
    } else if (error.code === SDKErrorCode.API_RATE_LIMITED) {
      // Handle rate limit
    }
  }
}
```

## Signature Algorithm

The SDK automatically handles request signing according to the Cregis OpenPlatform signature specification:

- **Basic Signature**: For OAuth endpoints (`/api/oauth/*`)
- **Resource Signature**: For resource endpoints (`/api/third-party/*`) with `authorizationId`

Signature formula:
```
signature = MD5(appSecret + appId + [authorizationId] + timestamp + nonce + MD5(JSON.stringify(sortKeys(business))))
```

## License

MIT
