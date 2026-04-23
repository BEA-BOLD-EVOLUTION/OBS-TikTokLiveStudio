/**
 * Adaptive Quality Types
 * Type definitions for network monitoring and automatic bitrate/quality adjustment
 */

// ==================== Network Metrics ====================

/**
 * Network quality level
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Real-time network metrics
 */
export interface NetworkMetrics {
  /** Timestamp of measurement */
  timestamp: Date;
  /** Available bandwidth in Kbps */
  bandwidthKbps: number;
  /** Network latency in milliseconds */
  latencyMs: number;
  /** Packet loss percentage (0-100) */
  packetLoss: number;
  /** Calculated network quality level */
  quality: NetworkQuality;
  /** Jitter in milliseconds (variation in latency) */
  jitterMs?: number;
}

/**
 * Network quality thresholds for determining quality levels
 */
export interface NetworkThresholds {
  /** Excellent quality: >= this bandwidth */
  excellentBandwidthKbps: number;
  /** Good quality: >= this bandwidth */
  goodBandwidthKbps: number;
  /** Fair quality: >= this bandwidth */
  fairBandwidthKbps: number;
  /** Maximum acceptable latency in ms */
  maxLatencyMs: number;
  /** Maximum acceptable packet loss % */
  maxPacketLoss: number;
}

// ==================== Quality Settings ====================

/**
 * Video quality preset levels
 */
export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';

/**
 * Video encoder settings
 */
export interface VideoSettings {
  /** Video bitrate in Kbps */
  videoBitrateKbps: number;
  /** Video resolution width */
  width: number;
  /** Video resolution height */
  height: number;
  /** Frames per second */
  fps: number;
  /** Encoder preset (e.g., 'veryfast', 'fast', 'medium') */
  encoderPreset?: string;
  /** Keyframe interval in seconds */
  keyframeInterval?: number;
}

/**
 * Complete quality preset configuration
 */
export interface QualityPresetConfig {
  /** Preset identifier */
  preset: QualityPreset;
  /** Display name */
  name: string;
  /** Minimum required bandwidth in Kbps */
  minBandwidthKbps: number;
  /** Video settings for this preset */
  video: VideoSettings;
  /** Audio bitrate in Kbps */
  audioBitrateKbps: number;
  /** Quality score (0-100) */
  qualityScore: number;
}

// ==================== Quality Adjustments ====================

/**
 * Quality adjustment direction
 */
export type AdjustmentDirection = 'increase' | 'decrease' | 'maintain';

/**
 * Reason for quality adjustment
 */
export type AdjustmentReason =
  | 'bandwidth-increase'
  | 'bandwidth-decrease'
  | 'high-latency'
  | 'packet-loss'
  | 'stable-recovery'
  | 'manual-override'
  | 'stream-start'
  | 'stream-end';

/**
 * Record of a quality adjustment event
 */
export interface QualityAdjustment {
  /** Unique identifier */
  id: string;
  /** Timestamp of adjustment */
  timestamp: Date;
  /** Previous quality preset */
  fromPreset: QualityPreset;
  /** New quality preset */
  toPreset: QualityPreset;
  /** Adjustment direction */
  direction: AdjustmentDirection;
  /** Reason for adjustment */
  reason: AdjustmentReason;
  /** Network metrics at time of adjustment */
  networkMetrics: NetworkMetrics;
  /** Whether adjustment was successful */
  success: boolean;
  /** Error message if adjustment failed */
  error?: string;
  /** Previous video bitrate */
  fromBitrateKbps: number;
  /** New video bitrate */
  toBitrateKbps: number;
}

// ==================== Adaptive Quality Engine ====================

/**
 * Adaptive quality engine state
 */
export type EngineState = 'stopped' | 'monitoring' | 'adjusting' | 'paused';

/**
 * Adaptation strategy
 */
export type AdaptationStrategy = 'conservative' | 'balanced' | 'aggressive';

/**
 * Configuration for adaptive quality engine
 */
export interface AdaptiveQualityConfig {
  /** Whether adaptive quality is enabled */
  enabled: boolean;
  /** Monitoring interval in milliseconds */
  monitoringIntervalMs: number;
  /** Adaptation strategy */
  strategy: AdaptationStrategy;
  /** Network quality thresholds */
  thresholds: NetworkThresholds;
  /** Minimum time between adjustments in milliseconds */
  minAdjustmentIntervalMs: number;
  /** Number of consecutive poor measurements before downgrade */
  poorMeasurementsThreshold: number;
  /** Number of consecutive good measurements before upgrade */
  goodMeasurementsThreshold: number;
  /** Whether to automatically recover to higher quality when network improves */
  autoRecovery: boolean;
  /** Starting quality preset */
  startingPreset: QualityPreset;
}

/**
 * Current state of adaptive quality engine
 */
export interface AdaptiveQualityState {
  /** Engine state */
  state: EngineState;
  /** Current quality preset */
  currentPreset: QualityPreset;
  /** Current video settings */
  currentSettings: VideoSettings;
  /** Latest network metrics */
  latestMetrics?: NetworkMetrics;
  /** Consecutive poor measurements count */
  consecutivePoorCount: number;
  /** Consecutive good measurements count */
  consecutiveGoodCount: number;
  /** Last adjustment timestamp */
  lastAdjustment?: Date;
  /** Whether currently streaming */
  isStreaming: boolean;
}

// ==================== Analytics ====================

/**
 * Quality stability metrics
 */
export interface QualityStability {
  /** Total time monitored in milliseconds */
  totalTimeMs: number;
  /** Time at each quality level */
  timeAtPreset: Record<QualityPreset, number>;
  /** Number of quality changes */
  adjustmentCount: number;
  /** Average time between adjustments in minutes */
  avgTimeBetweenAdjustments: number;
  /** Percentage of time at optimal quality */
  optimalTimePercentage: number;
}

/**
 * Network performance summary
 */
export interface NetworkPerformance {
  /** Average bandwidth in Kbps */
  avgBandwidthKbps: number;
  /** Minimum bandwidth in Kbps */
  minBandwidthKbps: number;
  /** Maximum bandwidth in Kbps */
  maxBandwidthKbps: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** Average packet loss % */
  avgPacketLoss: number;
  /** Most common network quality level */
  mostCommonQuality: NetworkQuality;
}

/**
 * Complete analytics for adaptive quality
 */
export interface AdaptiveQualityAnalytics {
  /** Quality stability metrics */
  stability: QualityStability;
  /** Network performance summary */
  network: NetworkPerformance;
  /** Total adjustments made */
  totalAdjustments: number;
  /** Successful adjustments */
  successfulAdjustments: number;
  /** Failed adjustments */
  failedAdjustments: number;
  /** Most recent adjustments */
  recentAdjustments: QualityAdjustment[];
}

// ==================== Default Values ====================

/**
 * Default network quality thresholds
 */
export const DEFAULT_NETWORK_THRESHOLDS: NetworkThresholds = {
  excellentBandwidthKbps: 5000, // 5 Mbps
  goodBandwidthKbps: 3000, // 3 Mbps
  fairBandwidthKbps: 1500, // 1.5 Mbps
  maxLatencyMs: 100,
  maxPacketLoss: 2,
};

/**
 * Default quality presets
 */
export const DEFAULT_QUALITY_PRESETS: Record<QualityPreset, QualityPresetConfig> = {
  ultra: {
    preset: 'ultra',
    name: 'Ultra (1080p60)',
    minBandwidthKbps: 6000,
    video: {
      videoBitrateKbps: 6000,
      width: 1920,
      height: 1080,
      fps: 60,
      encoderPreset: 'fast',
      keyframeInterval: 2,
    },
    audioBitrateKbps: 160,
    qualityScore: 100,
  },
  high: {
    preset: 'high',
    name: 'High (1080p30)',
    minBandwidthKbps: 4500,
    video: {
      videoBitrateKbps: 4500,
      width: 1920,
      height: 1080,
      fps: 30,
      encoderPreset: 'veryfast',
      keyframeInterval: 2,
    },
    audioBitrateKbps: 128,
    qualityScore: 80,
  },
  medium: {
    preset: 'medium',
    name: 'Medium (720p30)',
    minBandwidthKbps: 2500,
    video: {
      videoBitrateKbps: 2500,
      width: 1280,
      height: 720,
      fps: 30,
      encoderPreset: 'veryfast',
      keyframeInterval: 2,
    },
    audioBitrateKbps: 128,
    qualityScore: 60,
  },
  low: {
    preset: 'low',
    name: 'Low (480p30)',
    minBandwidthKbps: 1200,
    video: {
      videoBitrateKbps: 1200,
      width: 854,
      height: 480,
      fps: 30,
      encoderPreset: 'ultrafast',
      keyframeInterval: 2,
    },
    audioBitrateKbps: 96,
    qualityScore: 40,
  },
  minimal: {
    preset: 'minimal',
    name: 'Minimal (360p30)',
    minBandwidthKbps: 600,
    video: {
      videoBitrateKbps: 600,
      width: 640,
      height: 360,
      fps: 30,
      encoderPreset: 'ultrafast',
      keyframeInterval: 2,
    },
    audioBitrateKbps: 64,
    qualityScore: 20,
  },
};

/**
 * Default adaptive quality configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveQualityConfig = {
  enabled: false,
  monitoringIntervalMs: 5000, // Check every 5 seconds
  strategy: 'balanced',
  thresholds: DEFAULT_NETWORK_THRESHOLDS,
  minAdjustmentIntervalMs: 30000, // Wait 30 seconds between adjustments
  poorMeasurementsThreshold: 3, // 3 consecutive poor readings before downgrade
  goodMeasurementsThreshold: 6, // 6 consecutive good readings before upgrade
  autoRecovery: true,
  startingPreset: 'high',
};

// ==================== Utility Functions ====================

/**
 * Determine network quality from metrics
 */
export function calculateNetworkQuality(
  metrics: Omit<NetworkMetrics, 'quality'>,
  thresholds: NetworkThresholds,
): NetworkQuality {
  const { bandwidthKbps, latencyMs, packetLoss } = metrics;

  // Critical if latency or packet loss too high
  if (latencyMs > thresholds.maxLatencyMs * 2 || packetLoss > thresholds.maxPacketLoss * 3) {
    return 'critical';
  }

  // Poor if latency or packet loss concerning
  if (latencyMs > thresholds.maxLatencyMs || packetLoss > thresholds.maxPacketLoss) {
    return 'poor';
  }

  // Based on bandwidth
  if (bandwidthKbps >= thresholds.excellentBandwidthKbps) {
    return 'excellent';
  } else if (bandwidthKbps >= thresholds.goodBandwidthKbps) {
    return 'good';
  } else if (bandwidthKbps >= thresholds.fairBandwidthKbps) {
    return 'fair';
  } else {
    return 'poor';
  }
}

/**
 * Get quality preset for available bandwidth
 */
export function getPresetForBandwidth(bandwidthKbps: number): QualityPreset {
  if (bandwidthKbps >= DEFAULT_QUALITY_PRESETS.ultra.minBandwidthKbps) {
    return 'ultra';
  } else if (bandwidthKbps >= DEFAULT_QUALITY_PRESETS.high.minBandwidthKbps) {
    return 'high';
  } else if (bandwidthKbps >= DEFAULT_QUALITY_PRESETS.medium.minBandwidthKbps) {
    return 'medium';
  } else if (bandwidthKbps >= DEFAULT_QUALITY_PRESETS.low.minBandwidthKbps) {
    return 'low';
  } else {
    return 'minimal';
  }
}

/**
 * Get next higher quality preset
 */
export function getHigherPreset(current: QualityPreset): QualityPreset | null {
  const order: QualityPreset[] = ['minimal', 'low', 'medium', 'high', 'ultra'];
  const index = order.indexOf(current);
  return index < order.length - 1 ? order[index + 1] : null;
}

/**
 * Get next lower quality preset
 */
export function getLowerPreset(current: QualityPreset): QualityPreset | null {
  const order: QualityPreset[] = ['minimal', 'low', 'medium', 'high', 'ultra'];
  const index = order.indexOf(current);
  return index > 0 ? order[index - 1] : null;
}

/**
 * Generate unique adjustment ID
 */
export function generateAdjustmentId(): string {
  return `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format bandwidth for display
 */
export function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} Kbps`;
}

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

/**
 * Get network quality color
 */
export function getNetworkQualityColor(quality: NetworkQuality): string {
  switch (quality) {
    case 'excellent':
      return '#10B981'; // Green
    case 'good':
      return '#3B82F6'; // Blue
    case 'fair':
      return '#F59E0B'; // Yellow
    case 'poor':
      return '#EF4444'; // Red
    case 'critical':
      return '#991B1B'; // Dark Red
  }
}

/**
 * Get network quality emoji
 */
export function getNetworkQualityEmoji(quality: NetworkQuality): string {
  switch (quality) {
    case 'excellent':
      return '🟢';
    case 'good':
      return '🔵';
    case 'fair':
      return '🟡';
    case 'poor':
      return '🔴';
    case 'critical':
      return '⛔';
  }
}

/**
 * Get adjustment direction emoji
 */
export function getAdjustmentDirectionEmoji(direction: AdjustmentDirection): string {
  switch (direction) {
    case 'increase':
      return '⬆️';
    case 'decrease':
      return '⬇️';
    case 'maintain':
      return '➡️';
  }
}
