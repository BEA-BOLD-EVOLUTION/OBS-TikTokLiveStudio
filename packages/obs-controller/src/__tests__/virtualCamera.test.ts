import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OBSWebSocket from 'obs-websocket-js';
import { VirtualCameraController } from '../virtualCamera.js';

describe('VirtualCameraController', () => {
  let mockOBS: OBSWebSocket;
  let mockCall: ReturnType<typeof vi.fn>;
  let controller: VirtualCameraController;

  beforeEach(() => {
    mockCall = vi.fn();
    mockOBS = {
      call: mockCall,
    } as unknown as OBSWebSocket;

    controller = new VirtualCameraController(mockOBS);
  });

  describe('start', () => {
    it('should start virtual camera', async () => {
      mockCall.mockResolvedValue({});

      await controller.start();

      expect(mockCall).toHaveBeenCalledWith('StartVirtualCam');
    });

    it('should propagate errors from start', async () => {
      mockCall.mockRejectedValue(new Error('Virtual camera already started'));

      await expect(controller.start()).rejects.toThrow('Virtual camera already started');
    });
  });

  describe('stop', () => {
    it('should stop virtual camera', async () => {
      mockCall.mockResolvedValue({});

      await controller.stop();

      expect(mockCall).toHaveBeenCalledWith('StopVirtualCam');
    });

    it('should propagate errors from stop', async () => {
      mockCall.mockRejectedValue(new Error('Virtual camera not started'));

      await expect(controller.stop()).rejects.toThrow('Virtual camera not started');
    });
  });

  describe('getStatus', () => {
    it('should get status when virtual camera is active', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
      });

      const status = await controller.getStatus();

      expect(mockCall).toHaveBeenCalledWith('GetVirtualCamStatus');
      expect(status).toEqual({ active: true });
    });

    it('should get status when virtual camera is inactive', async () => {
      mockCall.mockResolvedValue({
        outputActive: false,
      });

      const status = await controller.getStatus();

      expect(status).toEqual({ active: false });
    });

    it('should propagate errors from getStatus', async () => {
      mockCall.mockRejectedValue(new Error('Failed to get virtual camera status'));

      await expect(controller.getStatus()).rejects.toThrow('Failed to get virtual camera status');
    });
  });

  describe('toggle', () => {
    it('should start virtual camera when currently inactive', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: false });
        }
        return Promise.resolve({});
      });

      const newState = await controller.toggle();

      expect(newState).toBe(true);
      expect(mockCall).toHaveBeenCalledWith('GetVirtualCamStatus');
      expect(mockCall).toHaveBeenCalledWith('StartVirtualCam');
      expect(mockCall).toHaveBeenCalledTimes(2);
    });

    it('should stop virtual camera when currently active', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: true });
        }
        return Promise.resolve({});
      });

      const newState = await controller.toggle();

      expect(newState).toBe(false);
      expect(mockCall).toHaveBeenCalledWith('GetVirtualCamStatus');
      expect(mockCall).toHaveBeenCalledWith('StopVirtualCam');
      expect(mockCall).toHaveBeenCalledTimes(2);
    });

    it('should propagate errors from getStatus during toggle', async () => {
      mockCall.mockRejectedValue(new Error('Failed to get status'));

      await expect(controller.toggle()).rejects.toThrow('Failed to get status');
    });

    it('should propagate errors from start during toggle', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: false });
        }
        if (requestType === 'StartVirtualCam') {
          return Promise.reject(new Error('Failed to start'));
        }
        return Promise.resolve({});
      });

      await expect(controller.toggle()).rejects.toThrow('Failed to start');
    });

    it('should propagate errors from stop during toggle', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: true });
        }
        if (requestType === 'StopVirtualCam') {
          return Promise.reject(new Error('Failed to stop'));
        }
        return Promise.resolve({});
      });

      await expect(controller.toggle()).rejects.toThrow('Failed to stop');
    });
  });

  describe('workflow integration', () => {
    it('should support full start-stop workflow', async () => {
      mockCall.mockResolvedValue({});

      await controller.start();
      await controller.stop();

      expect(mockCall).toHaveBeenNthCalledWith(1, 'StartVirtualCam');
      expect(mockCall).toHaveBeenNthCalledWith(2, 'StopVirtualCam');
      expect(mockCall).toHaveBeenCalledTimes(2);
    });

    it('should support checking status between operations', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: true });
        }
        return Promise.resolve({});
      });

      await controller.start();
      const status = await controller.getStatus();
      await controller.stop();

      expect(status.active).toBe(true);
      expect(mockCall).toHaveBeenCalledWith('StartVirtualCam');
      expect(mockCall).toHaveBeenCalledWith('GetVirtualCamStatus');
      expect(mockCall).toHaveBeenCalledWith('StopVirtualCam');
    });

    it('should support multiple toggle operations', async () => {
      let virtualCamActive = false;
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetVirtualCamStatus') {
          return Promise.resolve({ outputActive: virtualCamActive });
        }
        if (requestType === 'StartVirtualCam') {
          virtualCamActive = true;
          return Promise.resolve({});
        }
        if (requestType === 'StopVirtualCam') {
          virtualCamActive = false;
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const state1 = await controller.toggle(); // Start
      expect(state1).toBe(true);

      const state2 = await controller.toggle(); // Stop
      expect(state2).toBe(false);

      const state3 = await controller.toggle(); // Start again
      expect(state3).toBe(true);
    });
  });
});
