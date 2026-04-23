/**
 * Go Live Sequence - Workflow controller for automated stream start
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  GoLiveState,
  GoLiveConfig,
} from './goLiveTypes';
import {
  DEFAULT_GO_LIVE_CONFIG,
  DEFAULT_PREFLIGHT_CHECKS,
  DEFAULT_USER_CHECKLIST,
} from './goLiveTypes';
import { sceneTracker } from './sceneTracker.js';

/**
 * Manages the Go Live sequence workflow
 */
export class GoLiveWorkflow {
  private obs: OBSController | null = null;
  private config: GoLiveConfig;
  private state: GoLiveState;
  private stateChangeCallbacks: Set<(state: GoLiveState) => void> = new Set();

  constructor(config: Partial<GoLiveConfig> = {}) {
    this.config = { ...DEFAULT_GO_LIVE_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Set OBS controller instance
   */
  setOBSController(obs: OBSController): void {
    this.obs = obs;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: GoLiveState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Get current state
   */
  getState(): GoLiveState {
    return { ...this.state };
  }

  /**
   * Start the Go Live sequence
   */
  async start(): Promise<void> {
    if (!this.obs) {
      this.updateState({ currentStep: 'error', error: 'OBS not connected' });
      return;
    }

    try {
      // Step 1: Run pre-flight checks
      this.updateState({ currentStep: 'preflight' });
      await this.runPreflightChecks();

      // Check if all required checks passed
      const failedChecks = this.state.preflightChecks.filter(
        (check) => check.required && check.status === 'failed'
      );
      if (failedChecks.length > 0) {
        this.updateState({
          currentStep: 'error',
          error: `Pre-flight checks failed: ${failedChecks.map((c) => c.label).join(', ')}`,
        });
        return;
      }

      // Step 2: Switch to starting scene and start virtual camera
      this.updateState({ currentStep: 'starting' });
      await this.obs.scenes.switchScene(this.config.startingScene);
      this.updateState({ currentScene: this.config.startingScene });

      if (this.config.enableVirtualCamera) {
        await this.obs.virtualCamera.start();
        this.updateState({ isVirtualCameraActive: true });
      }

      // Step 3: Show checklist for user confirmation
      this.updateState({ currentStep: 'checklist' });
      // UI will call confirmChecklist() when user is ready
    } catch (error) {
      this.updateState({
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * User confirms checklist - proceed to go live
   */
  async confirmChecklist(): Promise<void> {
    if (!this.obs) {
      this.updateState({ currentStep: 'error', error: 'OBS not connected' });
      return;
    }

    // Verify all required checklist items are checked
    const uncheckedRequired = this.state.userChecklist.filter(
      (item) => item.required && !item.checked
    );
    if (uncheckedRequired.length > 0) {
      this.updateState({
        error: `Please confirm: ${uncheckedRequired.map((i) => i.label).join(', ')}`,
      });
      return;
    }

    try {
      // Step 4: Switch to live scene
      this.updateState({ currentStep: 'going-live' });
      await this.obs.scenes.switchScene(this.config.liveScene);
      this.updateState({ currentScene: this.config.liveScene });

      // Step 5: Start recording backup
      if (this.config.enableRecording) {
        await this.obs.recording.startRecording();
        this.updateState({ isRecording: true });
      }

      // Step 6: Start new scene tracking session
      sceneTracker.startNewSession();

      // Step 7: Mark as live
      this.updateState({
        currentStep: 'live',
        startTime: new Date(),
        error: undefined,
      });
    } catch (error) {
      this.updateState({
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to go live',
      });
    }
  }

  /**
   * Update a checklist item
   */
  updateChecklistItem(id: string, checked: boolean): void {
    const updatedChecklist = this.state.userChecklist.map((item) =>
      item.id === id ? { ...item, checked } : item
    );
    this.updateState({ userChecklist: updatedChecklist });
  }

  /**
   * Cancel the workflow and return to idle
   */
  async cancel(): Promise<void> {
    // Stop virtual camera if we started it
    if (this.obs && this.state.isVirtualCameraActive && this.config.enableVirtualCamera) {
      try {
        await this.obs.virtualCamera.stop();
      } catch (error) {
        console.warn('Failed to stop virtual camera:', error);
      }
    }

    this.state = this.createInitialState();
    this.notifyStateChange();
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.state = this.createInitialState();
    this.notifyStateChange();
  }

  /**
   * Run pre-flight checks
   */
  private async runPreflightChecks(): Promise<void> {
    const checks = [...this.state.preflightChecks];

    for (const check of checks) {
      check.status = 'checking';
      this.updateState({ preflightChecks: [...checks] });

      try {
        if (check.id === 'obs-connection') {
          const isConnected = this.obs?.connection.isConnected() ?? false;
          check.status = isConnected ? 'passed' : 'failed';
          if (!isConnected) {
            check.errorMessage = 'OBS WebSocket not connected';
          }
        } else if (check.id === 'starting-scene') {
          const scenes = await this.obs!.scenes.getSceneList();
          const exists = scenes.some((s) => s.name === this.config.startingScene);
          check.status = exists ? 'passed' : 'failed';
          if (!exists) {
            check.errorMessage = `Scene "${this.config.startingScene}" not found in OBS`;
          }
        } else if (check.id === 'live-scene') {
          const scenes = await this.obs!.scenes.getSceneList();
          const exists = scenes.some((s) => s.name === this.config.liveScene);
          check.status = exists ? 'passed' : 'failed';
          if (!exists) {
            check.errorMessage = `Scene "${this.config.liveScene}" not found in OBS`;
          }
        }
      } catch (error) {
        check.status = 'failed';
        check.errorMessage = error instanceof Error ? error.message : 'Check failed';
      }

      this.updateState({ preflightChecks: [...checks] });
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  /**
   * Create initial state
   */
  private createInitialState(): GoLiveState {
    return {
      currentStep: 'idle',
      preflightChecks: DEFAULT_PREFLIGHT_CHECKS.map((c) => ({ ...c })),
      userChecklist: DEFAULT_USER_CHECKLIST.map((c) => ({ ...c })),
      isVirtualCameraActive: false,
      isRecording: false,
      currentScene: '',
    };
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(updates: Partial<GoLiveState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyStateChange();
  }

  /**
   * Notify all state change subscribers
   */
  private notifyStateChange(): void {
    const stateCopy = { ...this.state };
    this.stateChangeCallbacks.forEach((callback) => callback(stateCopy));
  }
}

/**
 * Singleton instance
 */
export const goLiveWorkflow = new GoLiveWorkflow();
