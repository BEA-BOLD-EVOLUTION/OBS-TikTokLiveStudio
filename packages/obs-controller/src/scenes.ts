import type OBSWebSocket from 'obs-websocket-js';
import type { Scene } from './types.js';

/**
 * Manages OBS scenes and scene switching
 */
export class SceneController {
  constructor(private obs: OBSWebSocket) {}

  /**
   * Get list of all scenes
   */
  async getScenes(): Promise<Scene[]> {
    const response = await this.obs.call('GetSceneList');
    return (response.scenes as Array<{ sceneName: string }>).map((scene) => ({
      id: scene.sceneName,
      name: scene.sceneName,
    }));
  }

  /**
   * Get currently active scene
   */
  async getCurrentScene(): Promise<string> {
    const response = await this.obs.call('GetCurrentProgramScene');
    return response.currentProgramSceneName;
  }

  /**
   * Switch to a different scene
   */
  async switchScene(sceneName: string): Promise<void> {
    await this.obs.call('SetCurrentProgramScene', {
      sceneName,
    });
  }

  /**
   * Switch to scene by SCN_ prefixed ID
   * Matches config naming convention (SCN_STARTING, SCN_LIVE, etc.)
   */
  async switchSceneById(sceneId: string): Promise<void> {
    const scenes = await this.getScenes();
    const scene = scenes.find((s) => s.id === sceneId || s.name === sceneId);

    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    await this.switchScene(scene.name);
  }
}
