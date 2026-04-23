/**
 * Audio Ducking Types
 * 
 * Type system for voice activity detection and automatic music ducking.
 * Supports real-time audio analysis, configurable ducking behavior, and multi-source management.
 */

/**
 * Voice Activity Detection Configuration
 */
export interface VADConfig {
  /** Enable/disable voice activity detection */
  enabled: boolean;
  /** Microphone device ID (null for default) */
  microphoneDeviceId: string | null;
  /** Microphone sensitivity threshold (0-100, higher = more sensitive) */
  sensitivity: number;
  /** Audio analysis frequency in Hz (default: 2048) */
  fftSize: number;
  /** Minimum voice duration to trigger ducking (ms) */
  minVoiceDuration: number;
  /** Silence duration before un-ducking (ms) */
  silenceThreshold: number;
  /** Frequency range for voice detection (Hz) */
  voiceFrequencyRange: {
    min: number; // Typically 85 Hz (human voice low end)
    max: number; // Typically 3000 Hz (human voice high end)
  };
}

/**
 * Ducking Behavior Configuration
 */
export interface DuckingConfig {
  /** Enable/disable ducking */
  enabled: boolean;
  /** Volume reduction amount when ducking (0-100 percentage, e.g., 70 = reduce to 30%) */
  duckAmount: number;
  /** Time to ramp down volume (ms) */
  attackTime: number;
  /** Time to ramp up volume (ms) */
  releaseTime: number;
  /** Minimum time between duck triggers (ms, prevents rapid switching) */
  minDuckInterval: number;
  /** Use smooth ramping vs instant volume change */
  smoothTransition: boolean;
}

/**
 * OBS Audio Source Reference
 */
export interface OBSAudioSource {
  /** Unique identifier */
  id: string;
  /** OBS source name (e.g., "Music", "Desktop Audio") */
  sourceName: string;
  /** Display name for UI */
  displayName: string;
  /** Enable ducking for this source */
  enabled: boolean;
  /** Original volume level (0-100) */
  originalVolume: number;
  /** Current volume level (0-100) */
  currentVolume: number;
  /** Duck amount override for this source (null = use global) */
  customDuckAmount: number | null;
  /** Color for UI visualization */
  color: string;
  /** Last time ducking was applied */
  lastDucked: Date | null;
}

/**
 * Ducking State
 */
export type DuckingState = 'idle' | 'voice-detected' | 'ducking' | 'releasing' | 'error';

/**
 * Voice Activity State
 */
export interface VoiceActivityState {
  /** Current voice detection state */
  isVoiceDetected: boolean;
  /** Current audio level (0-100) */
  audioLevel: number;
  /** Dominant frequency (Hz) */
  dominantFrequency: number;
  /** Confidence score (0-100) */
  confidence: number;
  /** Time since voice started (ms, null if no voice) */
  voiceDuration: number | null;
  /** Time since silence started (ms, null if voice active) */
  silenceDuration: number | null;
}

/**
 * Audio Ducking Event
 */
export interface DuckingEvent {
  /** Unique event ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Event type */
  type: 'duck-started' | 'duck-released' | 'voice-detected' | 'voice-ended' | 'source-ducked' | 'source-released';
  /** Voice activity at time of event */
  voiceActivity: VoiceActivityState;
  /** Sources affected */
  affectedSources: string[]; // Source IDs
  /** Duck amount applied */
  duckAmount?: number;
  /** Success/failure */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Audio Ducking Analytics
 */
export interface DuckingAnalytics {
  /** Total ducking events */
  totalEvents: number;
  /** Successful ducks */
  successfulDucks: number;
  /** Failed ducks */
  failedDucks: number;
  /** Total voice detection time (ms) */
  totalVoiceTime: number;
  /** Total ducked time (ms) */
  totalDuckedTime: number;
  /** Average voice duration (ms) */
  avgVoiceDuration: number;
  /** Average duck duration (ms) */
  avgDuckDuration: number;
  /** Most ducked source */
  mostDuckedSource: {
    sourceId: string;
    sourceName: string;
    duckCount: number;
  } | null;
  /** Ducking effectiveness (percentage of voice time ducked) */
  effectiveness: number;
  /** Voice detection accuracy estimate (0-100) */
  accuracy: number;
  /** Time-of-day distribution */
  timeOfDayDistribution: {
    morning: number; // 6am-12pm
    afternoon: number; // 12pm-6pm
    evening: number; // 6pm-12am
    lateNight: number; // 12am-6am
  };
}

/**
 * Audio Ducking Complete State
 */
export interface AudioDuckingState {
  /** Current ducking state */
  state: DuckingState;
  /** VAD configuration */
  vadConfig: VADConfig;
  /** Ducking behavior configuration */
  duckingConfig: DuckingConfig;
  /** Registered audio sources */
  audioSources: OBSAudioSource[];
  /** Current voice activity */
  voiceActivity: VoiceActivityState;
  /** Is VAD currently monitoring */
  isMonitoring: boolean;
  /** Last ducking event time */
  lastDuckTime: Date | null;
  /** Is paused */
  isPaused: boolean;
}

/**
 * Audio Ducking Filter Options
 */
export interface DuckingFilter {
  /** Search query */
  searchQuery: string;
  /** Filter by event type */
  eventType?: DuckingEvent['type'];
  /** Filter by success/failure */
  success?: boolean;
  /** Sort order */
  sortBy: 'timestamp' | 'duckAmount' | 'voiceDuration';
}

/**
 * Default Configurations
 */
export const DEFAULT_VAD_CONFIG: VADConfig = {
  enabled: true,
  microphoneDeviceId: null,
  sensitivity: 50,
  fftSize: 2048,
  minVoiceDuration: 300, // 300ms minimum to avoid false positives
  silenceThreshold: 500, // 500ms silence before releasing
  voiceFrequencyRange: {
    min: 85, // Human voice typically starts around 85 Hz
    max: 3000, // Most voice energy below 3000 Hz
  },
};

export const DEFAULT_DUCKING_CONFIG: DuckingConfig = {
  enabled: true,
  duckAmount: 70, // Reduce to 30% of original volume
  attackTime: 100, // Fast attack (100ms)
  releaseTime: 500, // Slower release (500ms) for natural feel
  minDuckInterval: 200, // Prevent rapid switching
  smoothTransition: true,
};

export const DEFAULT_AUDIO_DUCKING_STATE: Omit<AudioDuckingState, 'audioSources'> = {
  state: 'idle',
  vadConfig: DEFAULT_VAD_CONFIG,
  duckingConfig: DEFAULT_DUCKING_CONFIG,
  voiceActivity: {
    isVoiceDetected: false,
    audioLevel: 0,
    dominantFrequency: 0,
    confidence: 0,
    voiceDuration: null,
    silenceDuration: null,
  },
  isMonitoring: false,
  lastDuckTime: null,
  isPaused: false,
};

export const DEFAULT_DUCKING_FILTER: DuckingFilter = {
  searchQuery: '',
  sortBy: 'timestamp',
};

/**
 * Source Color Palette
 */
export const SOURCE_COLORS = [
  '#3B82F6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange-red
];

/**
 * Utility Functions
 */

/**
 * Generate unique ducking event ID
 */
export function generateEventId(): string {
  return `duck_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique audio source ID
 */
export function generateSourceId(): string {
  return `src_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get time of day category
 */
export function getTimeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'lateNight' {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'lateNight';
}

/**
 * Format audio level for display
 */
export function formatAudioLevel(level: number): string {
  return `${Math.round(level)}%`;
}

/**
 * Format frequency for display
 */
export function formatFrequency(hz: number): string {
  if (hz < 1000) {
    return `${Math.round(hz)} Hz`;
  }
  return `${(hz / 1000).toFixed(1)} kHz`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get state color for UI
 */
export function getStateColor(state: DuckingState): string {
  switch (state) {
    case 'idle':
      return '#6b7280'; // Gray
    case 'voice-detected':
      return '#3B82F6'; // Blue
    case 'ducking':
      return '#10b981'; // Green
    case 'releasing':
      return '#f59e0b'; // Orange
    case 'error':
      return '#ef4444'; // Red
    default:
      return '#6b7280';
  }
}

/**
 * Get state emoji for UI
 */
export function getStateEmoji(state: DuckingState): string {
  switch (state) {
    case 'idle':
      return '⏸️';
    case 'voice-detected':
      return '🎤';
    case 'ducking':
      return '🔉';
    case 'releasing':
      return '🔊';
    case 'error':
      return '❌';
    default:
      return '⏸️';
  }
}

/**
 * Calculate effectiveness percentage
 */
export function calculateEffectiveness(totalVoiceTime: number, totalDuckedTime: number): number {
  if (totalVoiceTime === 0) return 0;
  return Math.round((totalDuckedTime / totalVoiceTime) * 100);
}

/**
 * Validate VAD configuration
 */
export function validateVADConfig(config: VADConfig): string[] {
  const errors: string[] = [];

  if (config.sensitivity < 0 || config.sensitivity > 100) {
    errors.push('Sensitivity must be between 0 and 100');
  }

  if (config.fftSize < 32 || config.fftSize > 32768 || !Number.isInteger(Math.log2(config.fftSize))) {
    errors.push('FFT size must be a power of 2 between 32 and 32768');
  }

  if (config.minVoiceDuration < 0) {
    errors.push('Minimum voice duration must be positive');
  }

  if (config.silenceThreshold < 0) {
    errors.push('Silence threshold must be positive');
  }

  if (config.voiceFrequencyRange.min >= config.voiceFrequencyRange.max) {
    errors.push('Voice frequency range min must be less than max');
  }

  return errors;
}

/**
 * Validate ducking configuration
 */
export function validateDuckingConfig(config: DuckingConfig): string[] {
  const errors: string[] = [];

  if (config.duckAmount < 0 || config.duckAmount > 100) {
    errors.push('Duck amount must be between 0 and 100');
  }

  if (config.attackTime < 0) {
    errors.push('Attack time must be positive');
  }

  if (config.releaseTime < 0) {
    errors.push('Release time must be positive');
  }

  if (config.minDuckInterval < 0) {
    errors.push('Minimum duck interval must be positive');
  }

  return errors;
}

/**
 * Validate audio source
 */
export function validateAudioSource(source: OBSAudioSource): string[] {
  const errors: string[] = [];

  if (!source.sourceName || source.sourceName.trim() === '') {
    errors.push('Source name is required');
  }

  if (!source.displayName || source.displayName.trim() === '') {
    errors.push('Display name is required');
  }

  if (source.originalVolume < 0 || source.originalVolume > 100) {
    errors.push('Original volume must be between 0 and 100');
  }

  if (source.currentVolume < 0 || source.currentVolume > 100) {
    errors.push('Current volume must be between 0 and 100');
  }

  if (source.customDuckAmount !== null && (source.customDuckAmount < 0 || source.customDuckAmount > 100)) {
    errors.push('Custom duck amount must be between 0 and 100');
  }

  return errors;
}
