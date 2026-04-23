/**
 * Scene Tracker - Automatically record scene switches to build recommendation patterns
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import { addSceneSwitchRecord } from './sceneRecommendationStorage.js';
import { generateRecordId } from './sceneRecommendationTypes.js';

/**
 * Scene Tracker Class
 */
export class SceneTracker {
  private obsController: OBSController | null = null;
  private currentScene: string = '';
  private sceneStartTime: number = 0;
  private sessionId: string = generateRecordId();
  private isTracking: boolean = false;

  /**
   * Set OBS controller and start tracking
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
    this.startTracking();
  }

  /**
   * Start tracking scene switches
   */
  private startTracking(): void {
    if (!this.obsController || this.isTracking) {
      return;
    }

    this.isTracking = true;

    // Subscribe to scene change events
    if (this.obsController.connection.on) {
      this.obsController.connection.on('CurrentProgramSceneChanged', async (data: { sceneName: string }) => {
        await this.handleSceneChange(data.sceneName);
      });
    }

    // Get initial scene
    this.getCurrentScene();
  }

  /**
   * Get current scene from OBS
   */
  private async getCurrentScene(): Promise<void> {
    if (!this.obsController) return;

    try {
      const response = await this.obsController.connection.call('GetCurrentProgramScene');
      if (response && response.sceneName) {
        this.currentScene = response.sceneName;
        this.sceneStartTime = Date.now();
      }
    } catch (error) {
      console.error('Failed to get current scene:', error);
    }
  }

  /**
   * Handle scene change event
   */
  private async handleSceneChange(newScene: string): Promise<void> {
    if (!this.currentScene || newScene === this.currentScene) {
      // First scene or same scene, just update current
      this.currentScene = newScene;
      this.sceneStartTime = Date.now();
      return;
    }

    // Calculate duration in previous scene
    const duration = Date.now() - this.sceneStartTime;

    // Record the switch
    try {
      await addSceneSwitchRecord({
        sceneName: newScene,
        previousScene: this.currentScene,
        duration,
        sessionId: this.sessionId,
      });

      console.log(`Scene switch tracked: ${this.currentScene} → ${newScene} (${(duration / 1000).toFixed(1)}s)`);
    } catch (error) {
      console.error('Failed to record scene switch:', error);
    }

    // Update current scene
    this.currentScene = newScene;
    this.sceneStartTime = Date.now();
  }

  /**
   * Start new session (e.g., when going live)
   */
  startNewSession(): void {
    this.sessionId = generateRecordId();
    console.log('Started new scene tracking session:', this.sessionId);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Singleton instance
 */
export const sceneTracker = new SceneTracker();
