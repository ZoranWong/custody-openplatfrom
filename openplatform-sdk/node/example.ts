import { CregisSDK, SDKConfig } from './src';

// Example usage

const config: SDKConfig = {
  baseUrl: 'https://api.cregis.com',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  timeout: 30000,
  debug: true,
};

// Initialize SDK
const sdk = new CregisSDK(config);

// Get Auth Service
const authService = sdk.getAuthService();

// Get OAuth token
async function example() {
  try {
    // 1. Get access token
    const token = await authService.getToken();
    console.log('Access token:', token.accessToken);

    // 2. Get authorization
    const auth = await authService.getAuthorization('your-authorization-id');
    if (auth) {
      // 3. Use services with authorization
      // Treasury Unit operations
      // Payment operations
      // Transfer operations
      // etc.
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  }
}

example();
