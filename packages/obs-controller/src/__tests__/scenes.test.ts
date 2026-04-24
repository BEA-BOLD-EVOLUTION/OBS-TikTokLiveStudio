import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OBSWebSocket from 'obs-websocket-js';
import { SceneController } from '../scenes.js';

describe('SceneController', () => {
  let mockOBS: OBSWebSocket;
  let mockCall: ReturnType<typeof vi.fn>;
  let controller: SceneController;

  beforeEach(() => {
    mockCall = vi.fn();
    mockOBS = {
      call: mockCall,
    } as unknown as OBSWebSocket;

    controller = new SceneController(mockOBS);
  });

  describe('getScenes', () => {
    it('should get list of all scenes', async () => {
      mockCall.mockResolvedValue({
        scenes: [
          { sceneName: 'SCN_STARTING' },
          { sceneName: 'SCN_LIVE' },
          { sceneName: 'SCN_BRB' },
        ],
      });

      const scenes = await controller.getScenes();

      expect(mockCall).toHaveBeenCalledWith('GetSceneList');
      expect(scenes).toEqual([
        { id: 'SCN_STARTING', name: 'SCN_STARTING' },
        { id: 'SCN_LIVE', name: 'SCN_LIVE' },
        { id: 'SCN_BRB', name: 'SCN_BRB' },
      ]);
    });

    it('should return empty array when no scenes exist', async () => {
      mockCall.mockResolvedValue({
        scenes: [],
      });

      const scenes = await controller.getScenes();

      expect(scenes).toEqual([]);
    });

    it('should handle single scene', async () => {
      mockCall.mockResolvedValue({
        scenes: [{ sceneName: 'Main Scene' }],
      });

      const scenes = await controller.getScenes();

      expect(scenes).toEqual([{ id: 'Main Scene', name: 'Main Scene' }]);
    });
  });

  describe('getCurrentScene', () => {
    it('should get currently active scene', async () => {
      mockCall.mockResolvedValue({
        currentProgramSceneName: 'SCN_LIVE',
      });

      const currentScene = await controller.getCurrentScene();

      expect(mockCall).toHaveBeenCalledWith('GetCurrentProgramScene');
      expect(currentScene).toBe('SCN_LIVE');
    });

    it('should return scene name without additional properties', async () => {
      mockCall.mockResolvedValue({
        currentProgramSceneName: 'My Custom Scene',
        otherProperty: 'ignored',
      });

      const currentScene = await controller.getCurrentScene();

      expect(currentScene).toBe('My Custom Scene');
    });
  });

  describe('switchScene', () => {
    it('should switch to scene by name', async () => {
      mockCall.mockResolvedValue({});

      await controller.switchScene('SCN_LIVE');

      expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', {
        sceneName: 'SCN_LIVE',
      });
    });

    it('should handle scene names with spaces', async () => {
      mockCall.mockResolvedValue({});

      await controller.switchScene('Main Camera Scene');

      expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', {
        sceneName: 'Main Camera Scene',
      });
    });

    it('should propagate OBS errors', async () => {
      mockCall.mockRejectedValue(new Error('Scene does not exist'));

      await expect(controller.switchScene('NonExistent')).rejects.toThrow('Scene does not exist');
    });
  });

  describe('switchSceneById', () => {
    beforeEach(() => {
      // Mock getScenes to return test data
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneList') {
          return Promise.resolve({
            scenes: [
              { sceneName: 'SCN_STARTING' },
              { sceneName: 'SCN_LIVE' },
              { sceneName: 'SCN_BRB' },
              { sceneName: 'Main Camera' },
            ],
          });
        }
        return Promise.resolve({});
      });
    });

    it('should switch scene by SCN_ prefixed ID', async () => {
      await controller.switchSceneById('SCN_LIVE');

      // First call: GetSceneList
      expect(mockCall).toHaveBeenCalledWith('GetSceneList');
      // Second call: SetCurrentProgramScene
      expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).toHaveBeenCalledTimes(2);
    });

    it('should find scene by exact name match', async () => {
      await controller.switchSceneById('Main Camera');

      expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', {
        sceneName: 'Main Camera',
      });
    });

    it('should throw error when scene not found by ID', async () => {
      await expect(controller.switchSceneById('SCN_NONEXISTENT')).rejects.toThrow(
        'Scene not found: SCN_NONEXISTENT',
      );
    });

    it('should throw error when scene not found by name', async () => {
      await expect(controller.switchSceneById('Unknown Scene')).rejects.toThrow(
        'Scene not found: Unknown Scene',
      );
    });

    it('should handle empty scene list', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneList') {
          return Promise.resolve({ scenes: [] });
        }
        return Promise.resolve({});
      });

      await expect(controller.switchSceneById('SCN_LIVE')).rejects.toThrow(
        'Scene not found: SCN_LIVE',
      );
    });

    it('should match scene by ID when ID and name are identical', async () => {
      await controller.switchSceneById('SCN_STARTING');

      expect(mockCall).toHaveBeenCalledWith('SetCurrentProgramScene', {
        sceneName: 'SCN_STARTING',
      });
    });

    it('should propagate OBS errors during scene switch', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneList') {
          return Promise.resolve({
            scenes: [{ sceneName: 'SCN_LIVE' }],
          });
        }
        if (requestType === 'SetCurrentProgramScene') {
          return Promise.reject(new Error('Failed to switch scene'));
        }
        return Promise.resolve({});
      });

      await expect(controller.switchSceneById('SCN_LIVE')).rejects.toThrow(
        'Failed to switch scene',
      );
    });
  });
});
