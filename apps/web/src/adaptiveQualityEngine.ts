/**
 * Adaptive Quality Engine
 * Monitors network conditions and automatically adjusts OBS streaming quality
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  NetworkMetrics,
  QualityAdjustment,
  AdaptiveQualityConfig,
  AdaptiveQualityState,
  QualityPreset,
  AdjustmentReason,
} from './adaptiveQualityTypes.js';
import {
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_QUALITY_PRESETS,
  calculateNetworkQuality,
  getHigherPreset,
  getLowerPreset,
  generateAdjustmentId,
} from './adaptiveQualityTypes.js';
import {
  recordNetworkMetrics,
  recordQualityAdjustment,
  getConfig,
  saveConfig,
} from './adaptiveQualityStorage.js';

/**
 * Adaptive Quality Engine
 * Singleton class that manages network monitoring and quality adaptation
 */
class AdaptiveQualityEngine {
  private obsController: OBSController | null = null;
  private config: AdaptiveQualityConfig = DEFAULT_ADAPTIVE_CONFIG;
  private state: AdaptiveQualityState = {
    state: 'stopped',
    currentPreset: DEFAULT_ADAPTIVE_CONFIG.startingPreset,
    currentSettings: DEFAULT_QUALITY_PRESETS[DEFAULT_ADAPTIVE_CONFIG.startingPreset].video,
    consecutivePoorCount: 0,
    consecutiveGoodCount: 0,
    isStreaming: false,
  };

  private monitoringInterval: number | null = null;
  private stateChangeCallbacks: Set<(state: AdaptiveQualityState) => void> = new Set();
  private adjustmentCallbacks: Set<(adjustment: QualityAdjustment) => void> = new Set();

  // Simulated network state for testing (in production, use real network monitoring)
  private simulatedBandwidth = 4500; // Start at High quality bandwidth
  private simulatedLatency = 50;
  private simulatedPacketLoss = 0.5;

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      this.config = await getConfig();
      this.state.currentPreset = this.config.startingPreset;
      this.state.currentSettings = DEFAULT_QUALITY_PRESETS[this.config.startingPreset].video;
    } catch (error) {
      console.error('Failed to load adaptive quality config:', error);
    }
  }

  /**
   * Set OBS controller
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AdaptiveQualityConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await saveConfig(this.config);

    // If monitoring and config changed, restart
    if (this.state.state === 'monitoring') {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AdaptiveQualityConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState(): AdaptiveQualityState {
    return { ...this.state };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('Adaptive quality is disabled');
      return;
    }

    if (this.state.state === 'monitoring') {
      console.log('Adaptive quality already monitoring');
      return;
    }

    console.log('Starting adaptive quality monitoring...');
    this.state.state = 'monitoring';
    this.state.consecutivePoorCount = 0;
    this.state.consecutiveGoodCount = 0;
    this.notifyStateChange();

    // Start monitoring interval
    this.monitoringInterval = window.setInterval(() => {
      this.checkNetworkConditions();
    }, this.config.monitoringIntervalMs);

    // Initial check
    this.checkNetworkConditions();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.state.state = 'stopped';
    this.state.consecutivePoorCount = 0;
    this.state.consecutiveGoodCount = 0;
    this.notifyStateChange();

    console.log('Adaptive quality monitoring stopped');
  }

  /**
   * Pause monitoring (e.g., during manual quality changes)
   */
  pause(): void {
    if (this.state.state === 'monitoring') {
      this.state.state = 'paused';
      this.notifyStateChange();
    }
  }

  /**
   * Resume monitoring
   */
  resume(): void {
    if (this.state.state === 'paused') {
      this.state.state = 'monitoring';
      this.notifyStateChange();
    }
  }

  /**
   * Check network conditions and adjust quality if needed
   */
  private async checkNetworkConditions(): Promise<void> {
    if (this.state.state !== 'monitoring') {
      return;
    }

    try {
      // Get current network metrics (simulated for now)
      const metrics = this.measureNetworkMetrics();

      // Record metrics
      await recordNetworkMetrics(metrics);

      // Update state
      this.state.latestMetrics = metrics;
      this.notifyStateChange();

      // Determine if adjustment is needed
      const shouldAdjust = this.shouldAdjustQuality(metrics);

      if (shouldAdjust) {
        await this.adjustQuality(metrics);
      }
    } catch (error) {
      console.error('Error checking network conditions:', error);
    }
  }

  /**
   * Measure current network metrics
   * NOTE: In production, this should use real network monitoring APIs
   * For now, we simulate network conditions for testing
   */
  private measureNetworkMetrics(): NetworkMetrics {
    // Simulate network fluctuations
    this.simulatedBandwidth += (Math.random() - 0.5) * 500;
    this.simulatedBandwidth = Math.max(500, Math.min(8000, this.simulatedBandwidth));

    this.simulatedLatency += (Math.random() - 0.5) * 20;
    this.simulatedLatency = Math.max(10, Math.min(200, this.simulatedLatency));

    this.simulatedPacketLoss += (Math.random() - 0.5) * 1;
    this.simulatedPacketLoss = Math.max(0, Math.min(5, this.simulatedPacketLoss));

    const metricsWithoutQuality = {
      timestamp: new Date(),
      bandwidthKbps: this.simulatedBandwidth,
      latencyMs: this.simulatedLatency,
      packetLoss: this.simulatedPacketLoss,
      jitterMs: Math.random() * 10,
    };

    const quality = calculateNetworkQuality(metricsWithoutQuality, this.config.thresholds);

    return {
      ...metricsWithoutQuality,
      quality,
    };
  }

  /**
   * Determine if quality adjustment is needed
   */
  private shouldAdjustQuality(metrics: NetworkMetrics): boolean {
    // Don't adjust too frequently
    if (this.state.lastAdjustment) {
      const timeSinceLastAdjustment = Date.now() - this.state.lastAdjustment.getTime();
      if (timeSinceLastAdjustment < this.config.minAdjustmentIntervalMs) {
        return false;
      }
    }

    // Check if network is poor
    const isPoor = metrics.quality === 'poor' || metrics.quality === 'critical';

    if (isPoor) {
      this.state.consecutivePoorCount++;
      this.state.consecutiveGoodCount = 0;

      // Downgrade if exceeded threshold
      return this.state.consecutivePoorCount >= this.config.poorMeasurementsThreshold;
    }

    // Check if network is good
    const isGood = metrics.quality === 'excellent' || metrics.quality === 'good';

    if (isGood && this.config.autoRecovery) {
      this.state.consecutiveGoodCount++;
      this.state.consecutivePoorCount = 0;

      // Upgrade if exceeded threshold
      return this.state.consecutiveGoodCount >= this.config.goodMeasurementsThreshold;
    }

    // Reset counters for fair quality
    if (metrics.quality === 'fair') {
      this.state.consecutivePoorCount = 0;
      this.state.consecutiveGoodCount = 0;
    }

    return false;
  }

  /**
   * Adjust quality based on network conditions
   */
  private async adjustQuality(metrics: NetworkMetrics): Promise<void> {
    this.state.state = 'adjusting';
    this.notifyStateChange();

    try {
      const currentPreset = this.state.currentPreset;
      let newPreset: QualityPreset | null = null;
      let reason: AdjustmentReason;

      // Determine new preset
      if (metrics.quality === 'poor' || metrics.quality === 'critical') {
        newPreset = getLowerPreset(currentPreset);
        reason = 'bandwidth-decrease';

        if (metrics.latencyMs > this.config.thresholds.maxLatencyMs) {
          reason = 'high-latency';
        } else if (metrics.packetLoss > this.config.thresholds.maxPacketLoss) {
          reason = 'packet-loss';
        }
      } else if (
        this.config.autoRecovery &&
        (metrics.quality === 'excellent' || metrics.quality === 'good')
      ) {
        newPreset = getHigherPreset(currentPreset);
        reason = 'stable-recovery';
      } else {
        // No adjustment needed
        this.state.state = 'monitoring';
        this.notifyStateChange();
        return;
      }

      // If no preset change (already at min/max), reset counters and continue monitoring
      if (!newPreset) {
        this.state.consecutivePoorCount = 0;
        this.state.consecutiveGoodCount = 0;
        this.state.state = 'monitoring';
        this.notifyStateChange();
        return;
      }

      // Apply new preset
      const success = await this.applyPreset(newPreset);

      // Record adjustment
      const adjustment: QualityAdjustment = {
        id: generateAdjustmentId(),
        timestamp: new Date(),
        fromPreset: currentPreset,
        toPreset: newPreset,
        direction: this.getAdjustmentDirection(currentPreset, newPreset),
        reason,
        networkMetrics: metrics,
        success,
        fromBitrateKbps: DEFAULT_QUALITY_PRESETS[currentPreset].video.videoBitrateKbps,
        toBitrateKbps: DEFAULT_QUALITY_PRESETS[newPreset].video.videoBitrateKbps,
      };

      await recordQualityAdjustment(adjustment);

      // Update state
      if (success) {
        this.state.currentPreset = newPreset;
        this.state.currentSettings = DEFAULT_QUALITY_PRESETS[newPreset].video;
        this.state.lastAdjustment = new Date();
        this.state.consecutivePoorCount = 0;
        this.state.consecutiveGoodCount = 0;
      }

      this.state.state = 'monitoring';
      this.notifyStateChange();
      this.notifyAdjustment(adjustment);

      console.log(
        `Quality adjusted: ${currentPreset} → ${newPreset} (${reason}, success: ${success})`,
      );
    } catch (error) {
      console.error('Error adjusting quality:', error);
      this.state.state = 'monitoring';
      this.notifyStateChange();
    }
  }

  /**
   * Apply quality preset to OBS
   */
  private async applyPreset(preset: QualityPreset): Promise<boolean> {
    if (!this.obsController) {
      console.error('OBS controller not set');
      return false;
    }

    try {
      const presetConfig = DEFAULT_QUALITY_PRESETS[preset];
      const settings = presetConfig.video;

      // NOTE: OBS WebSocket doesn't directly support encoder settings changes during stream
      // In production, this would require stopping stream, changing settings, and restarting
      // For now, we log the intended change

      console.log('Applying quality preset to OBS:', {
        preset,
        videoBitrate: settings.videoBitrateKbps,
        resolution: `${settings.width}x${settings.height}`,
        fps: settings.fps,
      });

      // In a real implementation, you would:
      // 1. Get current streaming settings via obs-websocket
      // 2. Update video bitrate, resolution, fps
      // 3. Apply changes (may require stream restart)

      // For demonstration, we assume success
      return true;
    } catch (error) {
      console.error('Failed to apply preset to OBS:', error);
      return false;
    }
  }

  /**
   * Get adjustment direction
   */
  private getAdjustmentDirection(
    from: QualityPreset,
    to: QualityPreset,
  ): 'increase' | 'decrease' | 'maintain' {
    const order: QualityPreset[] = ['minimal', 'low', 'medium', 'high', 'ultra'];
    const fromIndex = order.indexOf(from);
    const toIndex = order.indexOf(to);

    if (toIndex > fromIndex) return 'increase';
    if (toIndex < fromIndex) return 'decrease';
    return 'maintain';
  }

  /**
   * Manually set quality preset
   */
  async setPreset(preset: QualityPreset): Promise<boolean> {
    const wasPaused = this.state.state === 'monitoring';

    // Pause monitoring during manual change
    if (wasPaused) {
      this.pause();
    }

    try {
      const success = await this.applyPreset(preset);

      if (success) {
        const currentMetrics = this.state.latestMetrics || this.measureNetworkMetrics();

        // Record manual adjustment
        const adjustment: QualityAdjustment = {
          id: generateAdjustmentId(),
          timestamp: new Date(),
          fromPreset: this.state.currentPreset,
          toPreset: preset,
          direction: this.getAdjustmentDirection(this.state.currentPreset, preset),
          reason: 'manual-override',
          networkMetrics: currentMetrics,
          success: true,
          fromBitrateKbps: DEFAULT_QUALITY_PRESETS[this.state.currentPreset].video.videoBitrateKbps,
          toBitrateKbps: DEFAULT_QUALITY_PRESETS[preset].video.videoBitrateKbps,
        };

        await recordQualityAdjustment(adjustment);

        // Update state
        this.state.currentPreset = preset;
        this.state.currentSettings = DEFAULT_QUALITY_PRESETS[preset].video;
        this.state.lastAdjustment = new Date();
        this.state.consecutivePoorCount = 0;
        this.state.consecutiveGoodCount = 0;

        this.notifyStateChange();
        this.notifyAdjustment(adjustment);
      }

      // Resume monitoring
      if (wasPaused) {
        this.resume();
      }

      return success;
    } catch (error) {
      console.error('Error setting preset:', error);
      if (wasPaused) {
        this.resume();
      }
      return false;
    }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: AdaptiveQualityState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Subscribe to quality adjustments
   */
  onAdjustment(callback: (adjustment: QualityAdjustment) => void): () => void {
    this.adjustmentCallbacks.add(callback);
    return () => this.adjustmentCallbacks.delete(callback);
  }

  /**
   * Notify state change to subscribers
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((callback) => callback(this.state));
  }

  /**
   * Notify adjustment to subscribers
   */
  private notifyAdjustment(adjustment: QualityAdjustment): void {
    this.adjustmentCallbacks.forEach((callback) => callback(adjustment));
  }

  /**
   * Update streaming status
   */
  setStreamingStatus(isStreaming: boolean): void {
    this.state.isStreaming = isStreaming;
    this.notifyStateChange();

    if (isStreaming && this.config.enabled) {
      this.start();
    } else if (!isStreaming && this.state.state === 'monitoring') {
      this.stop();
    }
  }

  /**
   * Get engine status
   */
  isMonitoring(): boolean {
    return this.state.state === 'monitoring';
  }
}

// Export singleton instance
export const adaptiveQualityEngine = new AdaptiveQualityEngine();
