import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OBSWebSocket from 'obs-websocket-js';
import { RecordingController } from '../recording.js';

describe('RecordingController', () => {
  let mockOBS: OBSWebSocket;
  let mockCall: ReturnType<typeof vi.fn>;
  let controller: RecordingController;

  beforeEach(() => {
    mockCall = vi.fn();
    mockOBS = {
      call: mockCall,
    } as unknown as OBSWebSocket;

    controller = new RecordingController(mockOBS);
  });

  describe('recording operations', () => {
    it('should start recording', async () => {
      mockCall.mockResolvedValue({});

      await controller.startRecording();

      expect(mockCall).toHaveBeenCalledWith('StartRecord');
    });

    it('should stop recording', async () => {
      mockCall.mockResolvedValue({});

      await controller.stopRecording();

      expect(mockCall).toHaveBeenCalledWith('StopRecord');
    });

    it('should pause recording', async () => {
      mockCall.mockResolvedValue({});

      await controller.pauseRecording();

      expect(mockCall).toHaveBeenCalledWith('PauseRecord');
    });

    it('should resume recording', async () => {
      mockCall.mockResolvedValue({});

      await controller.resumeRecording();

      expect(mockCall).toHaveBeenCalledWith('ResumeRecord');
    });

    it('should propagate errors from start recording', async () => {
      mockCall.mockRejectedValue(new Error('Already recording'));

      await expect(controller.startRecording()).rejects.toThrow('Already recording');
    });

    it('should propagate errors from stop recording', async () => {
      mockCall.mockRejectedValue(new Error('Not recording'));

      await expect(controller.stopRecording()).rejects.toThrow('Not recording');
    });

    it('should propagate errors from pause recording', async () => {
      mockCall.mockRejectedValue(new Error('Cannot pause'));

      await expect(controller.pauseRecording()).rejects.toThrow('Cannot pause');
    });

    it('should propagate errors from resume recording', async () => {
      mockCall.mockRejectedValue(new Error('Not paused'));

      await expect(controller.resumeRecording()).rejects.toThrow('Not paused');
    });
  });

  describe('getRecordingStatus', () => {
    it('should get recording status when active and not paused', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
        outputPaused: false,
        outputDuration: 12345,
      });

      const status = await controller.getRecordingStatus();

      expect(mockCall).toHaveBeenCalledWith('GetRecordStatus');
      expect(status).toEqual({
        active: true,
        paused: false,
        duration: 12345,
      });
    });

    it('should get recording status when paused', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
        outputPaused: true,
        outputDuration: 5000,
      });

      const status = await controller.getRecordingStatus();

      expect(status).toEqual({
        active: true,
        paused: true,
        duration: 5000,
      });
    });

    it('should get recording status when inactive', async () => {
      mockCall.mockResolvedValue({
        outputActive: false,
        outputPaused: false,
        outputDuration: 0,
      });

      const status = await controller.getRecordingStatus();

      expect(status).toEqual({
        active: false,
        paused: false,
        duration: 0,
      });
    });

    it('should handle missing outputPaused field', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
        outputDuration: 1000,
      });

      const status = await controller.getRecordingStatus();

      expect(status).toEqual({
        active: true,
        paused: false,
        duration: 1000,
      });
    });

    it('should handle missing outputDuration field', async () => {
      mockCall.mockResolvedValue({
        outputActive: false,
        outputPaused: false,
      });

      const status = await controller.getRecordingStatus();

      expect(status).toEqual({
        active: false,
        paused: false,
        duration: undefined,
      });
    });

    it('should propagate errors from getRecordingStatus', async () => {
      mockCall.mockRejectedValue(new Error('Failed to get status'));

      await expect(controller.getRecordingStatus()).rejects.toThrow('Failed to get status');
    });
  });

  describe('streaming operations', () => {
    it('should start streaming', async () => {
      mockCall.mockResolvedValue({});

      await controller.startStreaming();

      expect(mockCall).toHaveBeenCalledWith('StartStream');
    });

    it('should stop streaming', async () => {
      mockCall.mockResolvedValue({});

      await controller.stopStreaming();

      expect(mockCall).toHaveBeenCalledWith('StopStream');
    });

    it('should propagate errors from start streaming', async () => {
      mockCall.mockRejectedValue(new Error('Already streaming'));

      await expect(controller.startStreaming()).rejects.toThrow('Already streaming');
    });

    it('should propagate errors from stop streaming', async () => {
      mockCall.mockRejectedValue(new Error('Not streaming'));

      await expect(controller.stopStreaming()).rejects.toThrow('Not streaming');
    });
  });

  describe('getStreamingStatus', () => {
    it('should get streaming status when active', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
        outputDuration: 30000,
      });

      const status = await controller.getStreamingStatus();

      expect(mockCall).toHaveBeenCalledWith('GetStreamStatus');
      expect(status).toEqual({
        active: true,
        duration: 30000,
      });
    });

    it('should get streaming status when inactive', async () => {
      mockCall.mockResolvedValue({
        outputActive: false,
        outputDuration: 0,
      });

      const status = await controller.getStreamingStatus();

      expect(status).toEqual({
        active: false,
        duration: 0,
      });
    });

    it('should handle missing outputDuration field', async () => {
      mockCall.mockResolvedValue({
        outputActive: true,
      });

      const status = await controller.getStreamingStatus();

      expect(status).toEqual({
        active: true,
        duration: undefined,
      });
    });

    it('should propagate errors from getStreamingStatus', async () => {
      mockCall.mockRejectedValue(new Error('Failed to get stream status'));

      await expect(controller.getStreamingStatus()).rejects.toThrow('Failed to get stream status');
    });
  });

  describe('workflow integration', () => {
    it('should support full recording workflow', async () => {
      mockCall.mockResolvedValue({});

      await controller.startRecording();
      await controller.pauseRecording();
      await controller.resumeRecording();
      await controller.stopRecording();

      expect(mockCall).toHaveBeenNthCalledWith(1, 'StartRecord');
      expect(mockCall).toHaveBeenNthCalledWith(2, 'PauseRecord');
      expect(mockCall).toHaveBeenNthCalledWith(3, 'ResumeRecord');
      expect(mockCall).toHaveBeenNthCalledWith(4, 'StopRecord');
      expect(mockCall).toHaveBeenCalledTimes(4);
    });

    it('should support full streaming workflow', async () => {
      mockCall.mockResolvedValue({});

      await controller.startStreaming();
      await controller.stopStreaming();

      expect(mockCall).toHaveBeenNthCalledWith(1, 'StartStream');
      expect(mockCall).toHaveBeenNthCalledWith(2, 'StopStream');
      expect(mockCall).toHaveBeenCalledTimes(2);
    });

    it('should allow checking status between operations', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetRecordStatus') {
          return Promise.resolve({
            outputActive: true,
            outputPaused: false,
            outputDuration: 5000,
          });
        }
        return Promise.resolve({});
      });

      await controller.startRecording();
      const status = await controller.getRecordingStatus();
      await controller.stopRecording();

      expect(status.active).toBe(true);
      expect(mockCall).toHaveBeenCalledWith('StartRecord');
      expect(mockCall).toHaveBeenCalledWith('GetRecordStatus');
      expect(mockCall).toHaveBeenCalledWith('StopRecord');
    });
  });
});
