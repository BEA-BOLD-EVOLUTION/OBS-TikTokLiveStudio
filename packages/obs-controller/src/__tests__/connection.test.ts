import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OBSConnectionManager } from '../connection.js';
import type { OBSConfig } from '../types.js';

// Mock OBSWebSocket
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockCall = vi.fn();
const mockOn = vi.fn();

vi.mock('obs-websocket-js', () => {
  return {
    default: class MockOBSWebSocket {
      connect = mockConnect;
      disconnect = mockDisconnect;
      call = mockCall;
      on = mockOn;
    },
  };
});

describe('OBSConnectionManager', () => {
  let manager: OBSConnectionManager;
  let config: OBSConfig;
  let eventHandlers: Map<string, (event: unknown) => void>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    eventHandlers = new Map();

    // Capture event handlers
    mockOn.mockImplementation((eventName: string, handler: (event: unknown) => void) => {
      eventHandlers.set(eventName, handler);
    });

    // Default config
    config = {
      host: 'localhost',
      port: 4455,
      password: 'test-password',
    };

    manager = new OBSConnectionManager(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with disconnected status', () => {
      const status = manager.getStatus();
      expect(status.status).toBe('disconnected');
      expect(status.activeScene).toBeNull();
      expect(status.isRecording).toBe(false);
      expect(status.isStreaming).toBe(false);
      expect(status.virtualCameraActive).toBe(false);
    });

    it('should setup event handlers', () => {
      expect(mockOn).toHaveBeenCalledWith('CurrentProgramSceneChanged', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('RecordStateChanged', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('StreamStateChanged', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('VirtualcamStateChanged', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('ConnectionClosed', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('ConnectionError', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect successfully with password', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockImplementation((method: string) => {
        if (method === 'GetCurrentProgramScene') {
          return Promise.resolve({ currentProgramSceneName: 'SCN_LIVE' });
        }
        if (method === 'GetRecordStatus') {
          return Promise.resolve({ outputActive: false });
        }
        if (method === 'GetStreamStatus') {
          return Promise.resolve({ outputActive: false });
        }
        if (method === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: false });
        }
        return Promise.resolve({});
      });

      await manager.connect();

      expect(mockConnect).toHaveBeenCalledWith('ws://localhost:4455', 'test-password');
      const status = manager.getStatus();
      expect(status.status).toBe('connected');
      expect(status.activeScene).toBe('SCN_LIVE');
    });

    it('should connect without password', async () => {
      const configNoPassword: OBSConfig = {
        host: 'localhost',
        port: 4455,
      };
      const managerNoPassword = new OBSConnectionManager(configNoPassword);

      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockResolvedValue({ outputActive: false, currentProgramSceneName: 'Scene' });

      await managerNoPassword.connect();

      expect(mockConnect).toHaveBeenCalledWith('ws://localhost:4455', undefined);
    });

    it('should update status to connecting during connection', async () => {
      const statusUpdates: string[] = [];
      manager.onStatusChange((status) => {
        statusUpdates.push(status.status);
      });

      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockResolvedValue({ outputActive: false, currentProgramSceneName: 'Scene' });

      await manager.connect();

      expect(statusUpdates).toContain('connecting');
      expect(statusUpdates).toContain('connected');
    });

    it('should refresh status after successful connection', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockImplementation((method: string) => {
        if (method === 'GetCurrentProgramScene') {
          return Promise.resolve({ currentProgramSceneName: 'SCN_STARTING' });
        }
        if (method === 'GetRecordStatus') {
          return Promise.resolve({ outputActive: true });
        }
        if (method === 'GetStreamStatus') {
          return Promise.resolve({ outputActive: true });
        }
        if (method === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: true });
        }
        return Promise.resolve({});
      });

      await manager.connect();

      const status = manager.getStatus();
      expect(status.activeScene).toBe('SCN_STARTING');
      expect(status.isRecording).toBe(true);
      expect(status.isStreaming).toBe(true);
      expect(status.virtualCameraActive).toBe(true);
    });

    it('should reset reconnect attempts on successful connection', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockResolvedValue({ outputActive: false, currentProgramSceneName: 'Scene' });

      await manager.connect();

      // Verify by checking internal state via subsequent error behavior
      const status = manager.getStatus();
      expect(status.status).toBe('connected');
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection refused');
      mockConnect.mockRejectedValueOnce(error);

      const errors: string[] = [];
      manager.onError((err) => {
        errors.push(err.code);
      });

      // Mock setTimeout to prevent actual delays
      vi.useFakeTimers();

      await manager.connect();

      expect(errors).toContain('CONNECTION_FAILED');
      const status = manager.getStatus();
      expect(status.status).toBe('error');

      vi.useRealTimers();
    });

    it('should schedule reconnect on connection failure', async () => {
      const error = new Error('Connection refused');
      mockConnect.mockRejectedValueOnce(error);

      vi.useFakeTimers();
      const connectSpy = vi.spyOn(manager, 'connect');

      await manager.connect();

      // Fast-forward time
      vi.advanceTimersByTime(3000);

      // Should have been called twice: initial + reconnect
      expect(connectSpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockDisconnect.mockResolvedValueOnce(undefined);

      await manager.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
      const status = manager.getStatus();
      expect(status.status).toBe('disconnected');
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockDisconnect.mockRejectedValueOnce(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.disconnect();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to disconnect:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return current status snapshot', () => {
      const status1 = manager.getStatus();
      const status2 = manager.getStatus();

      // Should return different objects (snapshots)
      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });
  });

  describe('onStatusChange', () => {
    it('should notify listeners on status change', async () => {
      const listener = vi.fn();
      manager.onStatusChange(listener);

      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockResolvedValue({ outputActive: false, currentProgramSceneName: 'Scene' });

      await manager.connect();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].status).toBe('connecting');
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.onStatusChange(listener);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      // Manually trigger status update
      eventHandlers.get('CurrentProgramSceneChanged')?.({ sceneName: 'Test' });

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.onStatusChange(listener1);
      manager.onStatusChange(listener2);

      // Trigger scene change
      eventHandlers.get('CurrentProgramSceneChanged')?.({ sceneName: 'SCN_LIVE' });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('onError', () => {
    it('should notify listeners on error', async () => {
      const listener = vi.fn();
      manager.onError(listener);

      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));
      vi.useFakeTimers();

      await manager.connect();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].code).toBe('CONNECTION_FAILED');

      vi.useRealTimers();
    });

    it('should return unsubscribe function', async () => {
      const listener = vi.fn();
      const unsubscribe = manager.onError(listener);

      unsubscribe();

      mockConnect.mockRejectedValueOnce(new Error('Test error'));
      vi.useFakeTimers();

      await manager.connect();

      expect(listener).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('event handlers', () => {
    it('should handle CurrentProgramSceneChanged event', () => {
      const listener = vi.fn();
      manager.onStatusChange(listener);

      eventHandlers.get('CurrentProgramSceneChanged')?.({ sceneName: 'SCN_BRB' });

      const status = manager.getStatus();
      expect(status.activeScene).toBe('SCN_BRB');
      expect(listener).toHaveBeenCalled();
    });

    it('should handle RecordStateChanged event', () => {
      const listener = vi.fn();
      manager.onStatusChange(listener);

      eventHandlers.get('RecordStateChanged')?.({ outputActive: true });

      const status = manager.getStatus();
      expect(status.isRecording).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle StreamStateChanged event', () => {
      const listener = vi.fn();
      manager.onStatusChange(listener);

      eventHandlers.get('StreamStateChanged')?.({ outputActive: true });

      const status = manager.getStatus();
      expect(status.isStreaming).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle VirtualcamStateChanged event', () => {
      const listener = vi.fn();
      manager.onStatusChange(listener);

      eventHandlers.get('VirtualcamStateChanged')?.({ outputActive: true });

      const status = manager.getStatus();
      expect(status.virtualCameraActive).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle ConnectionClosed event', () => {
      const statusListener = vi.fn();
      const errorListener = vi.fn();
      manager.onStatusChange(statusListener);
      manager.onError(errorListener);

      vi.useFakeTimers();

      eventHandlers.get('ConnectionClosed')?.();

      const status = manager.getStatus();
      expect(status.status).toBe('disconnected');
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONNECTION_LOST',
          message: 'Connection to OBS lost',
        }),
      );

      vi.useRealTimers();
    });

    it('should handle ConnectionError event', () => {
      const errorListener = vi.fn();
      manager.onError(errorListener);

      const testError = { message: 'Network timeout' };
      eventHandlers.get('ConnectionError')?.(testError);

      const status = manager.getStatus();
      expect(status.status).toBe('error');
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONNECTION_ERROR',
          message: 'Network timeout',
        }),
      );
    });
  });

  describe('reconnection logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should attempt reconnection up to max attempts', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));
      const connectSpy = vi.spyOn(manager, 'connect');

      await manager.connect(); // Attempt 1
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Attempts 2-5
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(3000);
        expect(connectSpy).toHaveBeenCalledTimes(i + 2); // 2, 3, 4, 5
      }
    });

    it('should stop reconnecting after max attempts', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));
      const errorListener = vi.fn();
      manager.onError(errorListener);

      await manager.connect(); // Attempt 1 (reconnectAttempts = 0)

      // Attempts 2-5 (reconnectAttempts = 1, 2, 3, 4)
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }

      // One more cycle to trigger the max check (reconnectAttempts = 5)
      await vi.advanceTimersByTimeAsync(3000);

      // Should have received MAX_RECONNECT_ATTEMPTS error
      const maxReconnectError = errorListener.mock.calls.find(
        (call) => call[0].code === 'MAX_RECONNECT_ATTEMPTS',
      );
      expect(maxReconnectError).toBeDefined();
      expect(maxReconnectError[0].message).toContain('Failed to reconnect after 5 attempts');
    });

    it('should reset reconnect attempts on successful connection', async () => {
      // First connection fails
      mockConnect.mockRejectedValueOnce(new Error('First attempt failed'));

      await manager.connect();
      expect(manager.getStatus().status).toBe('error');

      // Second connection succeeds
      mockConnect.mockResolvedValueOnce(undefined);
      mockCall.mockResolvedValue({ outputActive: false, currentProgramSceneName: 'Scene' });

      await vi.advanceTimersByTimeAsync(3000);

      const status = manager.getStatus();
      expect(status.status).toBe('connected');
    });

    it('should use correct reconnect delay', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));
      const connectSpy = vi.spyOn(manager, 'connect');

      await manager.connect();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Should not reconnect before delay
      await vi.advanceTimersByTimeAsync(2999);
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Should reconnect after delay
      await vi.advanceTimersByTimeAsync(1);
      expect(connectSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getOBS', () => {
    it('should return raw OBS instance', () => {
      const obs = manager.getOBS();
      expect(obs).toBeDefined();
      expect(obs.connect).toBe(mockConnect);
      expect(obs.disconnect).toBe(mockDisconnect);
      expect(obs.call).toBe(mockCall);
    });
  });
});
