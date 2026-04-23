/**
 * OBS Text Source Controller - Manages text sources for lower thirds
 */

import OBSWebSocket from 'obs-websocket-js';
import type { OBSTextSourceSettings } from '../../../apps/web/src/lowerThirdsTypes.js';

export class TextSourceController {
  private obs: OBSWebSocket;
  private sceneName: string = 'SCN_LIVE'; // Default scene for text overlays

  constructor(obs: OBSWebSocket) {
    this.obs = obs;
  }

  /**
   * Set the target scene for text overlays
   */
  setTargetScene(sceneName: string): void {
    this.sceneName = sceneName;
  }

  /**
   * Create or update a text source
   */
  async ensureTextSource(settings: OBSTextSourceSettings): Promise<void> {
    try {
      // Check if source already exists in the scene
      const sceneItems = await this.obs.call('GetSceneItemList', {
        sceneName: this.sceneName,
      });

      const existingItem = (
        sceneItems.sceneItems as Array<{ sceneItemId: number; sourceName: string }>
      ).find((item) => item.sourceName === settings.sourceName);

      if (!existingItem) {
        // Create new text source (GDI+ Text in OBS)
        await this.obs.call('CreateInput', {
          sceneName: this.sceneName,
          inputName: settings.sourceName,
          inputKind: 'text_gdiplus_v2', // GDI+ Text source for Windows
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputSettings: this.buildTextSettings(settings) as any,
          sceneItemEnabled: settings.visible,
        });
      } else {
        // Update existing source
        await this.obs.call('SetInputSettings', {
          inputName: settings.sourceName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputSettings: this.buildTextSettings(settings) as any,
        });

        // Update visibility
        await this.obs.call('SetSceneItemEnabled', {
          sceneName: this.sceneName,
          sceneItemId: existingItem.sceneItemId as number,
          sceneItemEnabled: settings.visible,
        });
      }
    } catch (error) {
      console.error('[TextSourceController] Error ensuring text source:', error);
      throw error;
    }
  }

  /**
   * Show a text source (make visible)
   */
  async showTextSource(sourceName: string): Promise<void> {
    try {
      const sceneItems = await this.obs.call('GetSceneItemList', {
        sceneName: this.sceneName,
      });

      const item = (
        sceneItems.sceneItems as Array<{ sceneItemId: number; sourceName: string }>
      ).find((item) => item.sourceName === sourceName);

      if (item) {
        await this.obs.call('SetSceneItemEnabled', {
          sceneName: this.sceneName,
          sceneItemId: item.sceneItemId as number,
          sceneItemEnabled: true,
        });
      }
    } catch (error) {
      console.error('[TextSourceController] Error showing text source:', error);
      throw error;
    }
  }

  /**
   * Hide a text source (make invisible)
   */
  async hideTextSource(sourceName: string): Promise<void> {
    try {
      const sceneItems = await this.obs.call('GetSceneItemList', {
        sceneName: this.sceneName,
      });

      const item = (
        sceneItems.sceneItems as Array<{ sceneItemId: number; sourceName: string }>
      ).find((item) => item.sourceName === sourceName);

      if (item) {
        await this.obs.call('SetSceneItemEnabled', {
          sceneName: this.sceneName,
          sceneItemId: item.sceneItemId as number,
          sceneItemEnabled: false,
        });
      }
    } catch (error) {
      console.error('[TextSourceController] Error hiding text source:', error);
      throw error;
    }
  }

  /**
   * Update text content
   */
  async updateText(sourceName: string, text: string): Promise<void> {
    try {
      await this.obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: { text },
      });
    } catch (error) {
      console.error('[TextSourceController] Error updating text:', error);
      throw error;
    }
  }

  /**
   * Remove a text source
   */
  async removeTextSource(sourceName: string): Promise<void> {
    try {
      await this.obs.call('RemoveInput', {
        inputName: sourceName,
      });
    } catch (error) {
      console.error('[TextSourceController] Error removing text source:', error);
      throw error;
    }
  }

  /**
   * Build OBS text source settings
   */
  private buildTextSettings(
    settings: OBSTextSourceSettings,
  ): Record<string, string | number | boolean | { face: string; size: number; flags: number }> {
    return {
      text: settings.text,
      font: {
        face: settings.fontFamily,
        size: settings.fontSize,
        flags: this.getFontFlags(settings.fontWeight),
      },
      color: settings.color,
      opacity: settings.opacity,
      bk_color: settings.backgroundColor,
      bk_opacity: settings.opacity,
      align: 'left',
      valign: 'top',
      outline: false,
      chatlog: false,
      extents: false,
    };
  }

  /**
   * Convert font weight to OBS font flags
   */
  private getFontFlags(weight: number): number {
    // OBS font flags: 1 = bold, 2 = italic, 4 = underline, 8 = strikeout
    if (weight >= 700) {
      return 1; // Bold
    }
    return 0; // Normal
  }
}
