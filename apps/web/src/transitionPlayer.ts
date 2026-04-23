import type { OBSController } from '@obs-tiktok/obs-controller';
import type { Transition } from './transitionTypes.js';

/**
 * Manages transition playback workflow with OBS
 */
export class TransitionPlayer {
  private obs: OBSController | null = null;
  private currentTransition: Transition | null = null;
  private previousScene: string | null = null;
  private isPlaying = false;

  /**
   * Set the OBS controller instance
   */
  setOBSController(obs: OBSController): void {
    this.obs = obs;
  }

  /**
   * Play a transition video
   * Workflow:
   * 1. Store current scene (if returnToPrevious is enabled)
   * 2. Switch to transition scene
   * 3. Configure media source with transition video file
   * 4. Play the media source
   * 5. Wait for playback to end
   * 6. Return to previous scene (or specified next scene)
   */
  async playTransition(
    transition: Transition,
    transitionSceneName = 'SCN_TRANSITION',
  ): Promise<void> {
    if (!this.obs) {
      throw new Error('OBS controller not initialized');
    }

    if (this.isPlaying) {
      throw new Error('A transition is already playing');
    }

    try {
      this.isPlaying = true;
      this.currentTransition = transition;

      const status = this.obs.getStatus();

      // Store current scene for auto-resume
      if (transition.returnToPrevious && status.activeScene) {
        this.previousScene = status.activeScene;
      }

      // Ensure media source exists in transition scene
      const mediaSourceName = `SRC_TRANSITION_${transition.id}`;
      await this.obs.mediaSource.ensureMediaSource(
        transitionSceneName,
        mediaSourceName,
        transition.video,
      );

      // Set up playback ended listener BEFORE switching scenes
      const unsubscribe = this.obs.mediaSource.onPlaybackEnded(mediaSourceName, async () => {
        unsubscribe(); // Clean up listener
        await this.handlePlaybackEnded(transition);
      });

      // Switch to transition scene
      await this.obs.scenes.switchScene(transitionSceneName);

      // Small delay to ensure scene is active
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Play the transition
      await this.obs.mediaSource.restart(mediaSourceName);

      console.log(`Playing transition: ${transition.name} (${transition.id})`);
    } catch (error) {
      this.isPlaying = false;
      this.currentTransition = null;
      this.previousScene = null;
      throw error;
    }
  }

  /**
   * Handle playback ended event
   */
  private async handlePlaybackEnded(transition: Transition): Promise<void> {
    if (!this.obs) {
      return;
    }

    try {
      console.log(`Transition playback ended: ${transition.name}`);

      // Determine which scene to switch to
      let targetScene: string | null = null;

      if (transition.nextScene) {
        // Use specified next scene
        targetScene = transition.nextScene;
      } else if (transition.returnToPrevious && this.previousScene) {
        // Return to previous scene
        targetScene = this.previousScene;
      }

      if (targetScene) {
        await this.obs.scenes.switchScene(targetScene);
        console.log(`Returned to scene: ${targetScene}`);
      }
    } catch (error) {
      console.error('Failed to switch scene after transition:', error);
    } finally {
      // Clean up state
      this.isPlaying = false;
      this.currentTransition = null;
      this.previousScene = null;
    }
  }

  /**
   * Stop the current transition playback
   */
  async stop(): Promise<void> {
    if (!this.obs || !this.currentTransition || !this.isPlaying) {
      return;
    }

    try {
      const mediaSourceName = `SRC_TRANSITION_${this.currentTransition.id}`;
      await this.obs.mediaSource.stop(mediaSourceName);

      // Return to previous scene if configured
      if (this.currentTransition.returnToPrevious && this.previousScene) {
        await this.obs.scenes.switchScene(this.previousScene);
      }
    } catch (error) {
      console.error('Failed to stop transition:', error);
    } finally {
      this.isPlaying = false;
      this.currentTransition = null;
      this.previousScene = null;
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): {
    isPlaying: boolean;
    currentTransition: Transition | null;
    previousScene: string | null;
  } {
    return {
      isPlaying: this.isPlaying,
      currentTransition: this.currentTransition,
      previousScene: this.previousScene,
    };
  }

  /**
   * Check if OBS is connected and ready
   */
  isReady(): boolean {
    if (!this.obs) {
      return false;
    }

    const status = this.obs.getStatus();
    return status.status === 'connected';
  }
}

// Singleton instance
export const transitionPlayer = new TransitionPlayer();
