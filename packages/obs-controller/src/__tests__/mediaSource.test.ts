import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OBSWebSocket from 'obs-websocket-js';
import { MediaSourceController, type MediaPlaybackEndedEvent } from '../mediaSource.js';

describe('MediaSourceController', () => {
  let mockOBS: OBSWebSocket;
  let mockCall: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;
  let controller: MediaSourceController;
  let eventHandlers: Map<string, (event: MediaPlaybackEndedEvent) => void>;

  beforeEach(() => {
    eventHandlers = new Map();
    mockCall = vi.fn();
    mockOn = vi.fn((eventName: string, handler: (event: MediaPlaybackEndedEvent) => void) => {
      eventHandlers.set(eventName, handler);
    });

    mockOBS = {
      call: mockCall,
      on: mockOn,
    } as unknown as OBSWebSocket;

    controller = new MediaSourceController(mockOBS);
  });

  describe('constructor', () => {
    it('should setup event handlers on initialization', () => {
      expect(mockOn).toHaveBeenCalledWith('MediaInputPlaybackEnded', expect.any(Function));
    });
  });

  describe('play', () => {
    it('should play media source', async () => {
      mockCall.mockResolvedValue({});

      await controller.play('TransitionVideo');

      expect(mockCall).toHaveBeenCalledWith('TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY',
      });
    });

    it('should throw error on play failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.play('NonExistent')).rejects.toThrow(
        'Failed to play media source "NonExistent": Source not found',
      );
    });
  });

  describe('pause', () => {
    it('should pause media source', async () => {
      mockCall.mockResolvedValue({});

      await controller.pause('TransitionVideo');

      expect(mockCall).toHaveBeenCalledWith('TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE',
      });
    });

    it('should throw error on pause failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.pause('NonExistent')).rejects.toThrow(
        'Failed to pause media source "NonExistent": Source not found',
      );
    });
  });

  describe('stop', () => {
    it('should stop media source', async () => {
      mockCall.mockResolvedValue({});

      await controller.stop('TransitionVideo');

      expect(mockCall).toHaveBeenCalledWith('TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
      });
    });

    it('should throw error on stop failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.stop('NonExistent')).rejects.toThrow(
        'Failed to stop media source "NonExistent": Source not found',
      );
    });
  });

  describe('restart', () => {
    it('should restart media source from beginning', async () => {
      mockCall.mockResolvedValue({});

      await controller.restart('TransitionVideo');

      expect(mockCall).toHaveBeenCalledWith('TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      });
    });

    it('should throw error on restart failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.restart('NonExistent')).rejects.toThrow(
        'Failed to restart media source "NonExistent": Source not found',
      );
    });
  });

  describe('getSettings', () => {
    it('should get media source settings', async () => {
      mockCall.mockResolvedValue({
        inputSettings: {
          local_file: 'C:/videos/transition.mp4',
          is_local_file: true,
          restart_on_activate: true,
        },
      });

      const settings = await controller.getSettings('TransitionVideo');

      expect(mockCall).toHaveBeenCalledWith('GetInputSettings', {
        inputName: 'TransitionVideo',
      });
      expect(settings).toEqual({
        local_file: 'C:/videos/transition.mp4',
        is_local_file: true,
        restart_on_activate: true,
      });
    });

    it('should throw error on getSettings failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.getSettings('NonExistent')).rejects.toThrow(
        'Failed to get settings for media source "NonExistent": Source not found',
      );
    });
  });

  describe('setFilePath', () => {
    it('should set media source file path', async () => {
      mockCall.mockResolvedValue({});

      await controller.setFilePath('TransitionVideo', 'C:/videos/new-transition.mp4');

      expect(mockCall).toHaveBeenCalledWith('SetInputSettings', {
        inputName: 'TransitionVideo',
        inputSettings: {
          local_file: 'C:/videos/new-transition.mp4',
        },
      });
    });

    it('should throw error on setFilePath failure', async () => {
      mockCall.mockRejectedValue(new Error('Source not found'));

      await expect(controller.setFilePath('NonExistent', 'test.mp4')).rejects.toThrow(
        'Failed to set file path for media source "NonExistent": Source not found',
      );
    });
  });

  describe('onPlaybackEnded', () => {
    it('should register playback ended callback', () => {
      const callback = vi.fn();

      const unsubscribe = controller.onPlaybackEnded('TransitionVideo', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should trigger callback when MediaInputPlaybackEnded event fires', () => {
      const callback = vi.fn();
      controller.onPlaybackEnded('TransitionVideo', callback);

      const handler = eventHandlers.get('MediaInputPlaybackEnded');
      expect(handler).toBeDefined();

      handler!({
        inputName: 'TransitionVideo',
        inputUuid: 'test-uuid',
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback for different source name', () => {
      const callback = vi.fn();
      controller.onPlaybackEnded('TransitionVideo', callback);

      const handler = eventHandlers.get('MediaInputPlaybackEnded');
      handler!({
        inputName: 'OtherVideo',
        inputUuid: 'test-uuid',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks for same source', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controller.onPlaybackEnded('TransitionVideo', callback1);
      controller.onPlaybackEnded('TransitionVideo', callback2);

      const handler = eventHandlers.get('MediaInputPlaybackEnded');
      handler!({
        inputName: 'TransitionVideo',
        inputUuid: 'test-uuid',
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe callback', () => {
      const callback = vi.fn();
      const unsubscribe = controller.onPlaybackEnded('TransitionVideo', callback);

      unsubscribe();

      const handler = eventHandlers.get('MediaInputPlaybackEnded');
      handler!({
        inputName: 'TransitionVideo',
        inputUuid: 'test-uuid',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support callbacks for multiple sources', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      controller.onPlaybackEnded('Video1', callback1);
      controller.onPlaybackEnded('Video2', callback2);

      const handler = eventHandlers.get('MediaInputPlaybackEnded');

      handler!({ inputName: 'Video1', inputUuid: 'uuid1' });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      handler!({ inputName: 'Video2', inputUuid: 'uuid2' });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureMediaSource', () => {
    it('should create new media source when it does not exist', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          // First call: empty list, second call: after creation
          if (mockCall.mock.calls.filter((c) => c[0] === 'GetSceneItemList').length === 1) {
            return Promise.resolve({ sceneItems: [] });
          } else {
            return Promise.resolve({
              sceneItems: [{ sceneItemId: 123, sourceName: 'NewTransition' }],
            });
          }
        }
        return Promise.resolve({});
      });

      const itemId = await controller.ensureMediaSource(
        'SCN_TRANSITION',
        'NewTransition',
        'C:/videos/transition.mp4',
      );

      expect(itemId).toBe(123);
      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_TRANSITION',
      });
      expect(mockCall).toHaveBeenCalledWith('CreateInput', {
        sceneName: 'SCN_TRANSITION',
        inputName: 'NewTransition',
        inputKind: 'ffmpeg_source',
        inputSettings: {
          local_file: 'C:/videos/transition.mp4',
          is_local_file: true,
          restart_on_activate: true,
          close_when_inactive: true,
        },
      });
    });

    it('should update existing media source file path', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 456, sourceName: 'ExistingTransition' }],
          });
        }
        return Promise.resolve({});
      });

      const itemId = await controller.ensureMediaSource(
        'SCN_TRANSITION',
        'ExistingTransition',
        'C:/videos/new-transition.mp4',
      );

      expect(itemId).toBe(456);
      expect(mockCall).toHaveBeenCalledWith('SetInputSettings', {
        inputName: 'ExistingTransition',
        inputSettings: {
          local_file: 'C:/videos/new-transition.mp4',
        },
      });
      expect(mockCall).not.toHaveBeenCalledWith('CreateInput', expect.any(Object));
    });

    it('should throw error when creation fails', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        if (requestType === 'CreateInput') {
          return Promise.reject(new Error('Creation failed'));
        }
        return Promise.resolve({});
      });

      await expect(
        controller.ensureMediaSource('SCN_TRANSITION', 'NewSource', 'test.mp4'),
      ).rejects.toThrow('Failed to ensure media source "NewSource": Creation failed');
    });

    it('should throw error when created source is not found in scene items', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          // Always return empty list (source creation succeeded but not in scene items)
          return Promise.resolve({ sceneItems: [] });
        }
        return Promise.resolve({});
      });

      await expect(
        controller.ensureMediaSource('SCN_TRANSITION', 'NewSource', 'test.mp4'),
      ).rejects.toThrow('Failed to ensure media source "NewSource": Failed to create media source');
    });
  });

  describe('workflow integration', () => {
    it('should support full playback workflow', async () => {
      mockCall.mockResolvedValue({});

      await controller.play('TransitionVideo');
      await controller.pause('TransitionVideo');
      await controller.restart('TransitionVideo');
      await controller.stop('TransitionVideo');

      expect(mockCall).toHaveBeenNthCalledWith(1, 'TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY',
      });
      expect(mockCall).toHaveBeenNthCalledWith(2, 'TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE',
      });
      expect(mockCall).toHaveBeenNthCalledWith(3, 'TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      });
      expect(mockCall).toHaveBeenNthCalledWith(4, 'TriggerMediaInputAction', {
        inputName: 'TransitionVideo',
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
      });
    });

    it('should support playback with end event', async () => {
      mockCall.mockResolvedValue({});
      const endCallback = vi.fn();

      controller.onPlaybackEnded('TransitionVideo', endCallback);
      await controller.play('TransitionVideo');

      const handler = eventHandlers.get('MediaInputPlaybackEnded');
      handler!({ inputName: 'TransitionVideo', inputUuid: 'test-uuid' });

      expect(endCallback).toHaveBeenCalledTimes(1);
    });
  });
});
