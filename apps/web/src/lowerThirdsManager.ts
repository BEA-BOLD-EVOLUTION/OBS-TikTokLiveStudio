/**
 * Lower Thirds Manager - Handles queue, rotation, and display logic
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import {
  type LowerThird,
  type LowerThirdTemplate,
  type QueuedLowerThird,
  type LowerThirdsState,
  type OBSTextSourceSettings,
  hexToABGR,
} from './lowerThirdsTypes';

export class LowerThirdsManager {
  private obs: OBSController | null = null;
  private state: LowerThirdsState = {
    activeItem: null,
    queue: [],
    isShowing: false,
    autoRotateEnabled: false,
    rotateInterval: 8000, // 8 seconds default
  };
  private stateChangeCallbacks: Set<(state: LowerThirdsState) => void> = new Set();
  private autoHideTimeout: number | null = null;
  private rotateInterval: number | null = null;

  /**
   * Set OBS controller instance
   */
  setOBSController(obs: OBSController): void {
    this.obs = obs;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: LowerThirdsState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Get current state
   */
  getState(): LowerThirdsState {
    return { ...this.state };
  }

  /**
   * Show a lower third
   */
  async show(lowerThird: LowerThird, template: LowerThirdTemplate): Promise<void> {
    if (!this.obs) {
      throw new Error('OBS controller not initialized');
    }

    try {
      // Hide current item if showing
      if (this.state.isShowing && this.state.activeItem) {
        await this.hide();
      }

      // Build text content
      const text = this.buildTextContent(lowerThird);

      // Create OBS text source settings
      const sourceName = 'SRC_LOWER_THIRD';
      const textSettings: OBSTextSourceSettings = {
        sourceName,
        text,
        fontSize: template.style.fontSize,
        fontFamily: template.style.fontFamily,
        fontWeight: this.parseFontWeight(template.style.fontWeight),
        color: hexToABGR(template.style.textColor, 100),
        backgroundColor: hexToABGR(template.style.backgroundColor, template.style.backgroundOpacity),
        opacity: 100,
        visible: true,
      };

      // Create or update text source in OBS
      await this.obs.textSource.ensureTextSource(textSettings);

      // Update state
      this.state.activeItem = {
        lowerThird: { ...lowerThird, lastShown: new Date() },
        template,
        showDuration: lowerThird.autoHideDuration || 0,
      };
      this.state.isShowing = true;
      this.notifyStateChange();

      // Set auto-hide timeout if configured
      if (lowerThird.autoHideDuration && lowerThird.autoHideDuration > 0) {
        this.scheduleAutoHide(lowerThird.autoHideDuration);
      }
    } catch (error) {
      console.error('[LowerThirdsManager] Error showing lower third:', error);
      throw error;
    }
  }

  /**
   * Hide current lower third
   */
  async hide(): Promise<void> {
    if (!this.obs || !this.state.isShowing) {
      return;
    }

    try {
      // Clear auto-hide timeout
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout);
        this.autoHideTimeout = null;
      }

      // Hide text source in OBS
      await this.obs.textSource.hideTextSource('SRC_LOWER_THIRD');

      // Update state
      this.state.activeItem = null;
      this.state.isShowing = false;
      this.notifyStateChange();
    } catch (error) {
      console.error('[LowerThirdsManager] Error hiding lower third:', error);
      throw error;
    }
  }

  /**
   * Add item to queue
   */
  addToQueue(lowerThird: LowerThird, template: LowerThirdTemplate, showDuration?: number): void {
    const queuedItem: QueuedLowerThird = {
      lowerThird,
      template,
      showDuration: showDuration || this.state.rotateInterval,
    };

    this.state.queue.push(queuedItem);
    this.notifyStateChange();

    // Start auto-rotate if enabled and not already running
    if (this.state.autoRotateEnabled && !this.rotateInterval) {
      this.startAutoRotate();
    }
  }

  /**
   * Remove item from queue
   */
  removeFromQueue(index: number): void {
    if (index >= 0 && index < this.state.queue.length) {
      this.state.queue.splice(index, 1);
      this.notifyStateChange();

      // Stop auto-rotate if queue is empty
      if (this.state.queue.length === 0) {
        this.stopAutoRotate();
      }
    }
  }

  /**
   * Clear entire queue
   */
  clearQueue(): void {
    this.state.queue = [];
    this.stopAutoRotate();
    this.notifyStateChange();
  }

  /**
   * Enable auto-rotate
   */
  async enableAutoRotate(interval?: number): Promise<void> {
    if (interval) {
      this.state.rotateInterval = interval;
    }
    this.state.autoRotateEnabled = true;
    this.notifyStateChange();

    if (this.state.queue.length > 0 && !this.rotateInterval) {
      await this.startAutoRotate();
    }
  }

  /**
   * Disable auto-rotate
   */
  disableAutoRotate(): void {
    this.state.autoRotateEnabled = false;
    this.stopAutoRotate();
    this.notifyStateChange();
  }

  /**
   * Start auto-rotate interval
   */
  private async startAutoRotate(): Promise<void> {
    if (this.rotateInterval || this.state.queue.length === 0) {
      return;
    }

    // Show first item immediately
    await this.showNextInQueue();

    // Set up rotation interval
    this.rotateInterval = window.setInterval(async () => {
      if (this.state.queue.length > 0) {
        await this.showNextInQueue();
      } else {
        this.stopAutoRotate();
      }
    }, this.state.rotateInterval);
  }

  /**
   * Stop auto-rotate interval
   */
  private stopAutoRotate(): void {
    if (this.rotateInterval) {
      clearInterval(this.rotateInterval);
      this.rotateInterval = null;
    }
  }

  /**
   * Show next item in queue
   */
  private async showNextInQueue(): Promise<void> {
    if (this.state.queue.length === 0) {
      return;
    }

    // Get next item (rotate to back of queue)
    const item = this.state.queue.shift()!;
    this.state.queue.push(item);

    // Show item
    await this.show(item.lowerThird, item.template);
  }

  /**
   * Schedule auto-hide
   */
  private scheduleAutoHide(duration: number): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }

    this.autoHideTimeout = window.setTimeout(async () => {
      await this.hide();
      this.autoHideTimeout = null;
    }, duration);
  }

  /**
   * Build text content from lower third data
   */
  private buildTextContent(lowerThird: LowerThird): string {
    let text = lowerThird.primaryText;
    if (lowerThird.secondaryText) {
      text += `\n${lowerThird.secondaryText}`;
    }
    return text;
  }

  /**
   * Parse font weight string to number
   */
  private parseFontWeight(weight: string): number {
    const weightMap: Record<string, number> = {
      normal: 400,
      '600': 600,
      '700': 700,
      bold: 700,
      '800': 800,
    };
    return weightMap[weight] || 400;
  }

  /**
   * Notify all state change listeners
   */
  private notifyStateChange(): void {
    const stateCopy = this.getState();
    this.stateChangeCallbacks.forEach((callback) => callback(stateCopy));
  }
}

// Singleton instance
export const lowerThirdsManager = new LowerThirdsManager();
