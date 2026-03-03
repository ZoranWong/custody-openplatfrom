import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CregisWebSDK, setAllowedOrigins, getAllowedOrigins } from './index';

describe('CregisWebSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when appId is missing', () => {
      expect(() => {
        new CregisWebSDK({ container: document.body } as any);
      }).toThrow();
    });

    it('should throw error when container is missing', () => {
      expect(() => {
        new CregisWebSDK({ appId: 'test-app' } as any);
      }).toThrow();
    });

    it('should initialize successfully with valid config', () => {
      const mockContainer = document.createElement('div');
      const sdk = new CregisWebSDK({
        appId: 'test-app-id',
        container: mockContainer,
      });

      expect(sdk.isInitialized()).toBe(true);
    });

    it('should emit ready event on initialization', () => {
      const onEvent = vi.fn();
      const mockContainer = document.createElement('div');
      new CregisWebSDK({
        appId: 'test-app-id',
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

      // Mock container appendChild
      const appendChildSpy = vi.spyOn(mockContainer, 'appendChild');

      // Call openAuthorization with options
      sdk.openAuthorization({
        state: 'custom-state',
        redirectUri: 'https://example.com/callback',
        permissions: ['read', 'write'],
      });

      // Verify iframe was created with correct URL
      expect(createdIframe).not.toBeNull();
      expect(createdIframe?.src).toContain('appId=test-app-id');
      expect(createdIframe?.src).toContain('token=test-access-token');
      expect(createdIframe?.src).toContain('state=custom-state');
      expect(createdIframe?.src).toContain('redirectUri=');
      expect(createdIframe?.src).toContain('permissions=read%2Cwrite');
      expect(createdIframe?.style.width).toBe('100%');
      expect(createdIframe?.style.height).toBe('100%');

      // Verify iframe was appended to container
      expect(appendChildSpy).toHaveBeenCalledWith(createdIframe);

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

      // Mock container appendChild
      const appendChildSpy = vi.spyOn(mockContainer, 'appendChild');

      // Call openAuthorization without token
      sdk.openAuthorization({});

      // Verify iframe was created with appId but no token
      expect(createdIframe).not.toBeNull();
      expect(createdIframe?.src).toContain('appId=test-app-id');
      expect(createdIframe?.src).not.toContain('token=');

      // Verify iframe was appended to container
      expect(appendChildSpy).toHaveBeenCalledWith(createdIframe);

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
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear allowed origins to allow all origins in tests
    setAllowedOrigins([]);
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  it('should set up message listener when openAuthorization is called', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
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

  it('should emit authorization_complete event on success message', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
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
        action: 'authorization_result',
        type: 'success',
        data: 'auth-12345',
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify success event was emitted
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authorization_complete',
        data: expect.objectContaining({
          status: 'success',
          authorizationId: 'auth-12345',
        }),
      })
    );

    // Cleanup
    document.createElement = originalCreateElement;
    sdk.destroy();
    document.body.removeChild(mockContainer);
  });

  it('should emit authorization_error event on error message', () => {
    const mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    const onEvent = vi.fn();
    const sdk = new CregisWebSDK({
      appId: 'test-app-id',
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
        action: 'authorization_result',
        type: 'error',
        error: {
          code: 'USER_CANCELLED',
          message: 'User cancelled authorization',
        },
      },
    } as unknown as MessageEvent;

    messageHandler!(mockEvent);

    // Verify error event was emitted
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authorization_error',
        data: expect.objectContaining({
          status: 'error',
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
        action: 'authorization_result',
        type: 'success',
        data: 'auth-12345',
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
        action: 'authorization_result',
        type: 'success',
        data: 'auth-12345',
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
        call[0].type === 'authorization_complete' ||
        call[0].type === 'authorization_error'
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
