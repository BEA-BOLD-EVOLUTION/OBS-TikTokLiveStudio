import { describe, it, expect, beforeEach, vi } from 'vitest';
import type OBSWebSocket from 'obs-websocket-js';
import { TextSourceController } from '../textSource.js';
import type { OBSTextSourceSettings } from '../../../apps/web/src/lowerThirdsTypes.js';

describe('TextSourceController', () => {
  let mockOBS: OBSWebSocket;
  let mockCall: ReturnType<typeof vi.fn>;
  let controller: TextSourceController;

  beforeEach(() => {
    mockCall = vi.fn();
    mockOBS = {
      call: mockCall,
    } as unknown as OBSWebSocket;

    controller = new TextSourceController(mockOBS);
  });

  describe('setTargetScene', () => {
    it('should set target scene for text overlays', () => {
      controller.setTargetScene('SCN_BRB');
      // Verify by calling a method that uses sceneName
      mockCall.mockResolvedValue({ sceneItems: [] });
      controller.showTextSource('TestSource');
      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_BRB',
      });
    });

    it('should default to SCN_LIVE when not set', () => {
      mockCall.mockResolvedValue({ sceneItems: [] });
      controller.showTextSource('TestSource');
      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
    });
  });

  describe('ensureTextSource', () => {
    const mockSettings: OBSTextSourceSettings = {
      sourceName: 'LowerThird_Cohost',
      text: '@username',
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 400,
      color: 0xffffffff,
      backgroundColor: 0x000000ff,
      opacity: 100,
      visible: true,
    };

    it('should create new text source when it does not exist', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        return Promise.resolve({});
      });

      await controller.ensureTextSource(mockSettings);

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).toHaveBeenCalledWith('CreateInput', {
        sceneName: 'SCN_LIVE',
        inputName: 'LowerThird_Cohost',
        inputKind: 'text_gdiplus_v2',
        inputSettings: expect.objectContaining({
          text: '@username',
          font: {
            face: 'Arial',
            size: 24,
            flags: 0, // Normal weight
          },
          color: 0xffffffff,
          opacity: 100,
          bk_color: 0x000000ff,
          bk_opacity: 100,
        }),
        sceneItemEnabled: true,
      });
    });

    it('should create text source with bold font weight', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        return Promise.resolve({});
      });

      const boldSettings = { ...mockSettings, fontWeight: 700 };
      await controller.ensureTextSource(boldSettings);

      expect(mockCall).toHaveBeenCalledWith(
        'CreateInput',
        expect.objectContaining({
          inputSettings: expect.objectContaining({
            font: expect.objectContaining({
              flags: 1, // Bold
            }),
          }),
        }),
      );
    });

    it('should update existing text source', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 123, sourceName: 'LowerThird_Cohost' }],
          });
        }
        return Promise.resolve({});
      });

      await controller.ensureTextSource(mockSettings);

      expect(mockCall).toHaveBeenCalledWith('SetInputSettings', {
        inputName: 'LowerThird_Cohost',
        inputSettings: expect.objectContaining({
          text: '@username',
          font: {
            face: 'Arial',
            size: 24,
            flags: 0,
          },
        }),
      });
      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 123,
        sceneItemEnabled: true,
      });
      expect(mockCall).not.toHaveBeenCalledWith('CreateInput', expect.any(Object));
    });

    it('should update visibility when updating existing source', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 123, sourceName: 'LowerThird_Cohost' }],
          });
        }
        return Promise.resolve({});
      });

      const hiddenSettings = { ...mockSettings, visible: false };
      await controller.ensureTextSource(hiddenSettings);

      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 123,
        sceneItemEnabled: false,
      });
    });

    it('should throw error on creation failure', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        if (requestType === 'CreateInput') {
          return Promise.reject(new Error('Creation failed'));
        }
        return Promise.resolve({});
      });

      await expect(controller.ensureTextSource(mockSettings)).rejects.toThrow('Creation failed');
    });
  });

  describe('showTextSource', () => {
    it('should show text source by enabling it', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 456, sourceName: 'LowerThird_Name' }],
          });
        }
        return Promise.resolve({});
      });

      await controller.showTextSource('LowerThird_Name');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 456,
        sceneItemEnabled: true,
      });
    });

    it('should not error when source not found', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        return Promise.resolve({});
      });

      await controller.showTextSource('NonExistent');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).not.toHaveBeenCalledWith('SetSceneItemEnabled', expect.any(Object));
    });

    it('should throw error on OBS failure', async () => {
      mockCall.mockRejectedValue(new Error('OBS error'));

      await expect(controller.showTextSource('LowerThird_Name')).rejects.toThrow('OBS error');
    });
  });

  describe('hideTextSource', () => {
    it('should hide text source by disabling it', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 789, sourceName: 'LowerThird_Social' }],
          });
        }
        return Promise.resolve({});
      });

      await controller.hideTextSource('LowerThird_Social');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 789,
        sceneItemEnabled: false,
      });
    });

    it('should not error when source not found', async () => {
      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          return Promise.resolve({ sceneItems: [] });
        }
        return Promise.resolve({});
      });

      await controller.hideTextSource('NonExistent');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
      expect(mockCall).not.toHaveBeenCalledWith('SetSceneItemEnabled', expect.any(Object));
    });

    it('should throw error on OBS failure', async () => {
      mockCall.mockRejectedValue(new Error('OBS error'));

      await expect(controller.hideTextSource('LowerThird_Social')).rejects.toThrow('OBS error');
    });
  });

  describe('updateText', () => {
    it('should update text content', async () => {
      mockCall.mockResolvedValue({});

      await controller.updateText('LowerThird_Cohost', '@newusername');

      expect(mockCall).toHaveBeenCalledWith('SetInputSettings', {
        inputName: 'LowerThird_Cohost',
        inputSettings: { text: '@newusername' },
      });
    });

    it('should throw error on update failure', async () => {
      mockCall.mockRejectedValue(new Error('Update failed'));

      await expect(controller.updateText('LowerThird_Cohost', 'text')).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('removeTextSource', () => {
    it('should remove text source', async () => {
      mockCall.mockResolvedValue({});

      await controller.removeTextSource('LowerThird_Old');

      expect(mockCall).toHaveBeenCalledWith('RemoveInput', {
        inputName: 'LowerThird_Old',
      });
    });

    it('should throw error on removal failure', async () => {
      mockCall.mockRejectedValue(new Error('Removal failed'));

      await expect(controller.removeTextSource('LowerThird_Old')).rejects.toThrow('Removal failed');
    });
  });

  describe('workflow integration', () => {
    it('should support full text source lifecycle', async () => {
      const settings: OBSTextSourceSettings = {
        sourceName: 'TestSource',
        text: 'Initial Text',
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 400,
        color: 0xffffffff,
        backgroundColor: 0x000000ff,
        opacity: 100,
        visible: true,
      };

      mockCall.mockImplementation((requestType: string) => {
        if (requestType === 'GetSceneItemList') {
          // First call: empty list, subsequent calls: source exists
          if (mockCall.mock.calls.filter((c) => c[0] === 'GetSceneItemList').length === 1) {
            return Promise.resolve({ sceneItems: [] });
          }
          return Promise.resolve({
            sceneItems: [{ sceneItemId: 999, sourceName: 'TestSource' }],
          });
        }
        return Promise.resolve({});
      });

      // Create
      await controller.ensureTextSource(settings);
      expect(mockCall).toHaveBeenCalledWith(
        'CreateInput',
        expect.objectContaining({ inputName: 'TestSource' }),
      );

      // Update text
      await controller.updateText('TestSource', 'Updated Text');
      expect(mockCall).toHaveBeenCalledWith('SetInputSettings', {
        inputName: 'TestSource',
        inputSettings: { text: 'Updated Text' },
      });

      // Hide
      await controller.hideTextSource('TestSource');
      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 999,
        sceneItemEnabled: false,
      });

      // Show
      await controller.showTextSource('TestSource');
      expect(mockCall).toHaveBeenCalledWith('SetSceneItemEnabled', {
        sceneName: 'SCN_LIVE',
        sceneItemId: 999,
        sceneItemEnabled: true,
      });

      // Remove
      await controller.removeTextSource('TestSource');
      expect(mockCall).toHaveBeenCalledWith('RemoveInput', {
        inputName: 'TestSource',
      });
    });

    it('should support changing target scene', async () => {
      mockCall.mockResolvedValue({ sceneItems: [] });

      controller.setTargetScene('SCN_BRB');
      await controller.showTextSource('TestSource');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_BRB',
      });

      controller.setTargetScene('SCN_LIVE');
      await controller.hideTextSource('TestSource');

      expect(mockCall).toHaveBeenCalledWith('GetSceneItemList', {
        sceneName: 'SCN_LIVE',
      });
    });
  });
});
