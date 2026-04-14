import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CregisWebSDK, setAllowedOrigins, getAllowedOrigins } from './index';

describe('CregisWebSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when appId is missing', () => {
      expect(() => {
        new CregisWebSDK({ container: document.body, authUrl: 'https://example.com/auth' } as any);
      }).toThrow();
    });

    it('should throw error when authUrl is missing', () => {
      expect(() => {
        new CregisWebSDK({ appId: 'test-app' } as any);
      }).toThrow();
    });

    it('should throw error when container is missing', () => {
      expect(() => {
        new CregisWebSDK({ appId: 'test-app', authUrl: 'https://example.com/auth' } as any);
      }).toThrow();
    });

    it('should initialize successfully with valid config', () => {
      const mockContainer = document.createElement('div');
      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      expect(sdk.isInitialized()).toBe(true);
    });

    it('should emit ready event on initialization', () => {
      const onEvent = vi.fn();
      const mockContainer = document.createElement('div');
      new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
        onEvent,
      });

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ready',
        })
      );
    });
  });

  describe('getToken', () => {
    it('should return null when token is not set', () => {
      const mockContainer = document.createElement('div');
      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      expect(sdk.getToken()).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should store token information', () => {
      const mockContainer = document.createElement('div');
      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      const token = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      sdk.setToken(token);
      expect(sdk.getToken()).toEqual(token);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const mockContainer = document.createElement('div');
      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      sdk.destroy();

      expect(sdk.isInitialized()).toBe(false);
      expect(sdk.getToken()).toBeNull();
    });
  });

  describe('openAuthorization', () => {
    it('should build authorization URL with required parameters', () => {
      const mockContainer = document.createElement('div');
      document.body.appendChild(mockContainer);

      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      // Set token
      sdk.setToken({
        accessToken: 'test-access-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      });

      // Mock the iframe creation
      const originalCreateElement = document.createElement;
      let createdIframe: HTMLIFrameElement | null = null;
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'iframe') {
          createdIframe = originalCreateElement.call(document, tagName);
          return createdIframe;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Mock document.body.appendChild (used by popup mode)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      // Call openAuthorization with options
      sdk.openAuthorization({
        state: 'custom-state',
        redirectUri: 'https://example.com/callback',
        permissions: ['read', 'write'],
      });

      // Verify iframe was created with correct URL
      expect(createdIframe).not.toBeNull();
      expect(createdIframe?.src).toContain('https://example.com/auth?');
      expect(createdIframe?.src).toContain('appId=test-app-id');
      expect(createdIframe?.src).toContain('token=test-access-token');
      expect(createdIframe?.src).toContain('state=custom-state');
      expect(createdIframe?.src).toContain('redirectUri=');
      expect(createdIframe?.src).toContain('permissions=read%2Cwrite');
      expect(createdIframe?.style.width).toBe('100%');
      expect(createdIframe?.style.height).toBe('100%');

      // Verify overlay was appended to document.body (popup mode)
      expect(appendChildSpy).toHaveBeenCalled();

      // Cleanup
      document.createElement = originalCreateElement;
      sdk.destroy();
      document.body.removeChild(mockContainer);
    });

    it('should work without token when token is not set', () => {
      const mockContainer = document.createElement('div');
      document.body.appendChild(mockContainer);

      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      // Mock the iframe creation
      const originalCreateElement = document.createElement;
      let createdIframe: HTMLIFrameElement | null = null;
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'iframe') {
          createdIframe = originalCreateElement.call(document, tagName);
          return createdIframe;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Mock document.body.appendChild (used by popup mode)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      // Call openAuthorization without token
      sdk.openAuthorization({});

      // Verify iframe was created with appId but no token
      expect(createdIframe).not.toBeNull();
      expect(createdIframe?.src).toContain('appId=test-app-id');
      expect(createdIframe?.src).not.toContain('token=');

      // Verify overlay was appended to document.body (popup mode)
      expect(appendChildSpy).toHaveBeenCalled();

      // Cleanup
      document.createElement = originalCreateElement;
      sdk.destroy();
      document.body.removeChild(mockContainer);
    });

    it('should clean up existing iframe when called multiple times', () => {
      const mockContainer = document.createElement('div');
      document.body.appendChild(mockContainer);

      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        authUrl: 'https://example.com/auth',
        container: mockContainer,
      });

      // Mock the iframe creation
      const originalCreateElement = document.createElement;
      let createdIframe: HTMLIFrameElement | null = null;
      const removeSpy = vi.fn();
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'iframe') {
          createdIframe = originalCreateElement.call(document, tagName);
          createdIframe.remove = removeSpy;
          return createdIframe;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Call openAuthorization twice
      sdk.openAuthorization({});
      sdk.openAuthorization({});

      // Verify old iframe was removed
      expect(removeSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      document.createElement = originalCreateElement;
      sdk.destroy();
      document.body.removeChild(mockContainer);
    });
  });
});

describe('setAllowedOrigins', () => {
  it('should set allowed origins', () => {
    setAllowedOrigins(['https://example.com']);
    expect(getAllowedOrigins()).toContain('https://example.com');
  });

  it('should clear and set new origins', () => {
    setAllowedOrigins(['https://example.com']);
    setAllowedOrigins(['https://other.com']);
    expect(getAllowedOrigins()).toEqual(['https://other.com']);
  });
});

describe('Message Handling (Story 1.3)', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn<[string, EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?], void>>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn<[string, EventListenerOrEventListenerObject, (boolean | EventListenerOptions)?], void>>;

  beforeEach(() => {
    // Clear global origins map and set empty allowed origins for tests
    setAllowedOrigins([]);
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  it('should set up message listener when openAuthorization is called', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return originalCreateElement.call(document, tagName);
      }
      return originalCreateElement.call(document, tagName);
    });

    sdk.openAuthorization({});

    // Verify message listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should emit authorization_succeed event on success message', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
      onEvent,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    const mockIframe = originalCreateElement.call(document, 'iframe');
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    const authorizationPromise = sdk.openAuthorization({});

    // Get the message handler that was registered
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as ((event: MessageEvent) => void) | undefined;

    expect(messageHandler).toBeDefined();

    // Simulate successful authorization message from iframe
    const mockEvent = {
      origin: 'https://openplatform.cregis.com',
      data: {
        type: 'authorization_succeed',
        uuid: sdk.getUUID(),
        data: { authorizationId: 'auth-12345' },
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify success event was emitted
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authorization_succeed',
        data: expect.objectContaining({
          authorizeId: 'auth-12345',
        }),
      })
    );

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should emit authorization_failed event on error message', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
      onEvent,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    const mockIframe = originalCreateElement.call(document, 'iframe');
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    sdk.openAuthorization({});

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as ((event: MessageEvent) => void) | undefined;

    // Simulate error authorization message
    const mockEvent = {
      origin: 'https://openplatform.cregis.com',
      data: {
        type: 'authorization_failed',
        uuid: sdk.getUUID(),
        data: {
          code: 'USER_CANCELLED',
          message: 'User cancelled authorization',
        },
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify error event was emitted
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authorization_failed',
        data: expect.objectContaining({
          error: expect.objectContaining({
            code: 'USER_CANCELLED',
          }),
        }),
      })
    );

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should remove iframe after receiving authorization result', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
    });

    // Mock iframe with remove method
    const originalCreateElement = document.createElement;
    const removeIframeSpy = vi.fn();
    const mockIframe = originalCreateElement.call(document, 'iframe');
    mockIframe.remove = removeIframeSpy;
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    sdk.openAuthorization({});

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as ((event: MessageEvent) => void) | undefined;

    // Simulate successful message
    const mockEvent = {
      origin: 'https://openplatform.cregis.com',
      data: {
        type: 'authorization_succeed',
        uuid: sdk.getUUID(),
        data: { authorizationId: 'auth-12345' },
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify iframe was removed
    expect(removeIframeSpy).toHaveBeenCalled();

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should remove message listener after receiving authorization result', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    const mockIframe = originalCreateElement.call(document, 'iframe');
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    sdk.openAuthorization({});

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1];

    // Simulate successful message
    const mockEvent = {
      origin: 'https://openplatform.cregis.com',
      data: {
        type: 'authorization_succeed',
        uuid: sdk.getUUID(),
        data: { authorizationId: 'auth-12345' },
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify message listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandler);

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should handle malformed messages gracefully', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
      onEvent,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    const mockIframe = originalCreateElement.call(document, 'iframe');
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    sdk.openAuthorization({});

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as ((event: MessageEvent) => void) | undefined;

    // Simulate malformed message (missing action)
    const mockEvent = {
      origin: 'https://openplatform.cregis.com',
      data: {
        type: 'success',
        data: 'auth-12345',
      },
    } as unknown as MessageEvent;

    // Should not throw
    expect(() => messageHandler!(mockEvent)).not.toThrow();

    // Should not emit any authorization events
    const authorizationEvents = onEvent.mock.calls.filter(
      (call) =>
        call[0].type === 'authorization_succeed' ||
        call[0].type === 'authorization_failed'
    );
    expect(authorizationEvents).toHaveLength(0);

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should emit authorization_started event when openAuthorization is called', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
      onEvent,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return originalCreateElement.call(document, tagName);
      }
      return originalCreateElement.call(document, tagName);
    });

    sdk.openAuthorization({});

    // Verify authorization_started event was emitted
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authorization_started',
      })
    );

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should clean up message listener when destroy is called during authorization', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
      authUrl: 'https://example.com/auth',
      container: mockContainer,
    });

    // Mock iframe creation
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'iframe') {
        return originalCreateElement.call(document, tagName);
      }
      return originalCreateElement.call(document, tagName);
    });

    // Call openAuthorization
    sdk.openAuthorization({});

    // Get the message handler
    const messageHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1];

    // Call destroy
    sdk.destroy();

    // Verify message listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', messageHandler);

    // Cleanup
    document.createElement = originalCreateElement;
    document.body.removeChild(mockContainer);
  });
});

describe('TransferTaskDetailDialog', () => {
  const mockTaskData = {
    taskId: '#TRX-8829',
    status: 'pending' as const,
    amount: '10,000.00',
    coin: 'USDT',
    network: 'Ethereum',
    from: { name: 'Alice', address: '0x1234567890abcdef1234567890abcdef12345678' },
    to: { name: 'Bob', address: '0xabcdef1234567890abcdef1234567890abcdef12' },
    meta: {
      unit: 'Main Treasury',
      createdAt: '2026-04-10 10:00',
      expiresIn: '2h 30m',
    },
    approvalFlow: [
      { name: 'Initiated', status: 'completed' as const, actor: 'Alice', timestamp: '2026-04-10 10:00' },
      { name: 'Risk Check', status: 'completed' as const, actor: 'System', timestamp: '2026-04-10 10:01' },
      { name: 'Approval', status: 'current' as const },
      { name: 'Execution', status: 'pending' as const },
    ],
  };

  beforeEach(() => {
    // Clean up any existing dialogs
    const overlay = document.querySelector('.transfer-task-dialog-overlay');
    if (overlay) {
      overlay.remove();
    }
  });

  afterEach(() => {
    // Clean up any existing dialogs
    const overlay = document.querySelector('.transfer-task-dialog-overlay');
    if (overlay) {
      overlay.remove();
    }
  });

  describe('imports', () => {
    it('should export TransferTaskDetailDialog class', async () => {
      const module = await import('./components/transfer/TransferTaskDetailDialog');
      expect(module.TransferTaskDetailDialog).toBeDefined();
      expect(typeof module.TransferTaskDetailDialog).toBe('function');
    });

    it('should export openTransferTaskDetailDialog function', async () => {
      const module = await import('./components/transfer/TransferTaskDetailDialog');
      expect(module.openTransferTaskDetailDialog).toBeDefined();
      expect(typeof module.openTransferTaskDetailDialog).toBe('function');
    });
  });

  describe('types', () => {
    it('should export TransferTaskDetailData interface', async () => {
      const module = await import('./components/transfer/types');
      expect(module.TransferTaskDetailData).toBeDefined();
    });

    it('should export StatusConfig constant', async () => {
      const module = await import('./components/transfer/types');
      expect(module.StatusConfig).toBeDefined();
      expect(module.StatusConfig.pending).toBeDefined();
      expect(module.StatusConfig.approved).toBeDefined();
      expect(module.StatusConfig.rejected).toBeDefined();
      expect(module.StatusConfig.wait_for_sign).toBeDefined();
    });

    it('should export getStatusDisplay function', async () => {
      const module = await import('./components/transfer/types');
      expect(module.getStatusDisplay).toBeDefined();
      expect(typeof module.getStatusDisplay).toBe('function');
    });

    it('should return correct status config for each status', async () => {
      const { getStatusDisplay } = await import('./components/transfer/types');
      expect(getStatusDisplay('pending').label).toBe('Pending');
      expect(getStatusDisplay('approved').label).toBe('Approved');
      expect(getStatusDisplay('rejected').label).toBe('Rejected');
      expect(getStatusDisplay('wait_for_sign').label).toBe('Wait for Sign');
    });
  });

  describe('dialog lifecycle', () => {
    it('should create dialog with default options', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      expect(dialog).toBeDefined();
      dialog.destroy();
    });

    it('should create dialog with custom options', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const onClose = vi.fn();
      const dialog = new TransferTaskDetailDialog({
        title: 'Custom Title',
        className: 'custom-class',
        onClose,
      });
      expect(dialog).toBeDefined();
      dialog.destroy();
    });

    it('should open dialog and render overlay', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const overlay = document.querySelector('.transfer-task-dialog-overlay');
      expect(overlay).not.toBeNull();

      dialog.destroy();
    });

    it('should render task ID in header', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const title = document.querySelector('.transfer-task-dialog-title');
      expect(title?.textContent).toContain('TRX-8829');

      dialog.destroy();
    });

    it('should render status badge', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const badge = document.querySelector('.transfer-task-dialog-status-badge');
      expect(badge).not.toBeNull();

      dialog.destroy();
    });

    it('should render amount and coin', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const amount = document.querySelector('.transfer-task-dialog-amount-value');
      expect(amount?.textContent).toContain('10,000.00');
      expect(amount?.textContent).toContain('USDT');

      dialog.destroy();
    });

    it('should render network tag', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const network = document.querySelector('.transfer-task-dialog-network-tag');
      expect(network?.textContent).toContain('Ethereum');

      dialog.destroy();
    });

    it('should render sender info', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const senderName = document.querySelector('.transfer-task-dialog-party-name');
      expect(senderName?.textContent).toBe('Alice');

      dialog.destroy();
    });

    it('should render receiver info', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      // Find all party names - should have Alice (from) and Bob (to)
      const partyNames = document.querySelectorAll('.transfer-task-dialog-party-name');
      expect(partyNames[0]?.textContent).toBe('Alice');
      expect(partyNames[1]?.textContent).toBe('Bob');

      dialog.destroy();
    });

    it('should render meta info', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const unit = document.querySelector('.transfer-task-dialog-meta-unit-name');
      expect(unit?.textContent).toBe('Main Treasury');

      dialog.destroy();
    });

    it('should render approval flow', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const steps = document.querySelectorAll('.transfer-task-dialog-approval-step');
      expect(steps.length).toBe(4);

      const stepNames = document.querySelectorAll('.transfer-task-dialog-approval-name');
      expect(stepNames[0]?.textContent).toBe('Initiated');
      expect(stepNames[1]?.textContent).toBe('Risk Check');
      expect(stepNames[2]?.textContent).toBe('Approval');
      expect(stepNames[3]?.textContent).toBe('Execution');

      dialog.destroy();
    });

    it('should call onClose callback when close is called', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const onClose = vi.fn();
      const dialog = new TransferTaskDetailDialog({ onClose });
      dialog.open(mockTaskData);

      dialog.close();

      expect(onClose).toHaveBeenCalled();
    });

    it('should remove overlay from DOM when close is called', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      let overlay = document.querySelector('.transfer-task-dialog-overlay');
      expect(overlay).not.toBeNull();

      dialog.close();

      overlay = document.querySelector('.transfer-task-dialog-overlay');
      expect(overlay).toBeNull();
    });

    it('should handle destroy after close', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const onClose = vi.fn();
      const dialog = new TransferTaskDetailDialog({ onClose });
      dialog.open(mockTaskData);

      dialog.destroy();

      // Should not throw when calling destroy again
      expect(() => dialog.destroy()).not.toThrow();
    });

    it('should throw error when opening destroyed dialog', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);
      dialog.destroy();

      expect(() => dialog.open(mockTaskData)).toThrow('Dialog has been destroyed');
    });
  });

  describe('multiple recipients mode', () => {
    const multiRecipientData = {
      ...mockTaskData,
      to: [
        { name: 'Bob', address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', amount: '5,000' },
        { name: 'Charlie', address: '0xcccccccccccccccccccccccccccccccccccccccc', amount: '5,000' },
      ],
    };

    it('should render multiple recipients when to is array with length > 1', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(multiRecipientData);

      const recipientsList = document.querySelector('.transfer-task-dialog-recipients-list');
      expect(recipientsList).not.toBeNull();

      dialog.destroy();
    });

    it('should show multiple recipients summary', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(multiRecipientData);

      const summary = document.querySelector('.transfer-task-dialog-recipients-summary');
      expect(summary?.textContent).toContain('2 recipients');

      dialog.destroy();
    });
  });

  describe('travel rule display', () => {
    const travelRuleData = {
      ...mockTaskData,
      travelRule: {
        originator: {
          name: 'Alice Corp',
          country: 'USA',
          verified: true,
          vasp: 'VASPCode123',
        },
        beneficiary: {
          name: 'Bob Inc',
          country: 'UK',
          verified: false,
        },
      },
    };

    it('should render travel rule section when data is provided', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(travelRuleData);

      const travelRule = document.querySelector('.transfer-task-dialog-travel-rule');
      expect(travelRule).not.toBeNull();

      dialog.destroy();
    });

    it('should show originator name', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(travelRuleData);

      const originatorName = document.querySelector('.transfer-task-dialog-travel-rule-name');
      expect(originatorName?.textContent).toContain('Alice Corp');

      dialog.destroy();
    });

    it('should not render travel rule section when data is not provided', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const travelRule = document.querySelectorAll('.transfer-task-dialog-travel-rule');
      expect(travelRule.length).toBe(0);

      dialog.destroy();
    });
  });

  describe('proposal display', () => {
    const proposalData = {
      ...mockTaskData,
      proposal: 'Payment for services rendered',
    };

    it('should render proposal when provided', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(proposalData);

      const proposal = document.querySelector('.transfer-task-dialog-proposal-content');
      expect(proposal?.textContent).toContain('Payment for services rendered');

      dialog.destroy();
    });

    it('should not render proposal section when not provided', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const proposal = document.querySelector('.transfer-task-dialog-proposal-content');
      expect(proposal).toBeNull();

      dialog.destroy();
    });
  });

  describe('contract address display', () => {
    const contractData = {
      ...mockTaskData,
      contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
    };

    it('should render contract address when provided', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(contractData);

      const contract = document.querySelector('.transfer-task-dialog-contract');
      expect(contract).not.toBeNull();

      dialog.destroy();
    });
  });

  describe('close button', () => {
    it('should have close button in header', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const dialog = new TransferTaskDetailDialog();
      dialog.open(mockTaskData);

      const closeBtn = document.querySelector('#dialog-close-btn');
      expect(closeBtn).not.toBeNull();

      dialog.destroy();
    });

    it('should close dialog when close button is clicked', async () => {
      const { TransferTaskDetailDialog } = await import('./components/transfer/TransferTaskDetailDialog');
      const onClose = vi.fn();
      const dialog = new TransferTaskDetailDialog({ onClose });
      dialog.open(mockTaskData);

      const closeBtn = document.querySelector('#dialog-close-btn') as HTMLButtonElement;
      closeBtn?.click();

      expect(onClose).toHaveBeenCalled();

      dialog.destroy();
    });
  });
});
