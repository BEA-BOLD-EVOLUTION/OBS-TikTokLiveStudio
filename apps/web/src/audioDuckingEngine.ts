/**
 * Audio Ducking Engine
 *
 * Real-time voice activity detection and automatic music ducking using Web Audio API.
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  VADConfig,
  DuckingConfig,
  OBSAudioSource,
  DuckingEvent,
  AudioDuckingState,
} from './audioDuckingTypes.js';
import {
  DEFAULT_AUDIO_DUCKING_STATE,
  generateEventId,
} from './audioDuckingTypes.js';
import {
  getVADConfig,
  getDuckingConfig,
  getAllAudioSources,
  saveAudioSource,
  recordDuckingEvent,
} from './audioDuckingStorage.js';

/**
 * Callback function types
 */
type StateChangeCallback = (state: AudioDuckingState) => void;
type EventCallback = (event: DuckingEvent) => void;
type UnsubscribeFunction = () => void;

/**
 * Audio Ducking Engine Class
 */
export class AudioDuckingEngine {
  private obsController: OBSController | null = null;
  private state: AudioDuckingState;

  // Web Audio API components
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  // Voice detection state
  private voiceStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private lastDuckTime: number = 0;

  // RAF for continuous monitoring
  private monitoringRAF: number | null = null;

  // Callbacks
  private stateChangeCallbacks = new Set<StateChangeCallback>();
  private eventCallbacks = new Set<EventCallback>();

  constructor() {
    this.state = {
      ...DEFAULT_AUDIO_DUCKING_STATE,
      audioSources: [],
    };
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const [vadConfig, duckingConfig, audioSources] = await Promise.all([
        getVADConfig(),
        getDuckingConfig(),
        getAllAudioSources(),
      ]);

      this.state.vadConfig = vadConfig;
      this.state.duckingConfig = duckingConfig;
      this.state.audioSources = audioSources;
    } catch (error) {
      console.error('Failed to load audio ducking config:', error);
    }
  }

  /**
   * Set OBS controller
   */
  setOBSController(obs: OBSController | null): void {
    this.obsController = obs;
  }

  /**
   * Update VAD configuration
   */
  async updateVADConfig(config: Partial<VADConfig>): Promise<void> {
    this.state.vadConfig = { ...this.state.vadConfig, ...config };
    this.notifyStateChange();
  }

  /**
   * Update ducking configuration
   */
  async updateDuckingConfig(config: Partial<DuckingConfig>): Promise<void> {
    this.state.duckingConfig = { ...this.state.duckingConfig, ...config };
    this.notifyStateChange();
  }

  /**
   * Add or update audio source
   */
  async addAudioSource(source: OBSAudioSource): Promise<void> {
    const existingIndex = this.state.audioSources.findIndex((s) => s.id === source.id);

    if (existingIndex >= 0) {
      this.state.audioSources[existingIndex] = source;
    } else {
      this.state.audioSources.push(source);
    }

    await saveAudioSource(source);
    this.notifyStateChange();
  }

  /**
   * Remove audio source
   */
  async removeAudioSource(sourceId: string): Promise<void> {
    this.state.audioSources = this.state.audioSources.filter((s) => s.id !== sourceId);
    this.notifyStateChange();
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (!this.state.vadConfig.enabled) {
      console.warn('VAD is disabled in config');
      return;
    }

    if (this.state.isMonitoring) {
      console.warn('Already monitoring');
      return;
    }

    try {
      // Request microphone access
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.state.vadConfig.microphoneDeviceId || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create Web Audio API context
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.state.vadConfig.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);

      this.state.isMonitoring = true;
      this.state.state = 'idle';
      this.notifyStateChange();

      // Start analysis loop
      this.startAnalysisLoop();

      console.log('Audio ducking monitoring started');
    } catch (error) {
      console.error('Failed to start audio ducking:', error);
      this.state.state = 'error';
      this.notifyStateChange();

      const errorEvent: DuckingEvent = {
        id: generateEventId(),
        timestamp: new Date(),
        type: 'voice-detected',
        voiceActivity: this.state.voiceActivity,
        affectedSources: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await recordDuckingEvent(errorEvent);
      this.notifyEvent(errorEvent);
    }
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.state.isMonitoring) {
      return;
    }

    // Stop RAF loop
    if (this.monitoringRAF !== null) {
      cancelAnimationFrame(this.monitoringRAF);
      this.monitoringRAF = null;
    }

    // Release duck (restore volumes)
    await this.releaseDuck();

    // Clean up Web Audio API
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Stop microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }

    this.state.isMonitoring = false;
    this.state.state = 'idle';
    this.voiceStartTime = null;
    this.silenceStartTime = null;
    this.notifyStateChange();

    console.log('Audio ducking monitoring stopped');
  }

  /**
   * Pause monitoring (keep resources but stop processing)
   */
  pause(): void {
    if (!this.state.isMonitoring) {
      return;
    }

    if (this.monitoringRAF !== null) {
      cancelAnimationFrame(this.monitoringRAF);
      this.monitoringRAF = null;
    }

    this.state.isPaused = true;
    this.notifyStateChange();
  }

  /**
   * Resume monitoring
   */
  resume(): void {
    if (!this.state.isMonitoring || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    this.startAnalysisLoop();
    this.notifyStateChange();
  }

  /**
   * Start analysis loop using RAF
   */
  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.state.isMonitoring || this.state.isPaused || !this.analyser) {
        return;
      }

      this.analyzeAudio();
      this.monitoringRAF = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Analyze audio from microphone
   */
  private analyzeAudio(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate overall audio level (0-100)
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    const audioLevel = Math.round((sum / bufferLength / 255) * 100);

    // Detect voice frequency range
    const sampleRate = this.audioContext!.sampleRate;
    const binWidth = sampleRate / this.analyser.fftSize;
    const minBin = Math.floor(this.state.vadConfig.voiceFrequencyRange.min / binWidth);
    const maxBin = Math.floor(this.state.vadConfig.voiceFrequencyRange.max / binWidth);

    let voiceEnergy = 0;
    let dominantFrequency = 0;
    let maxAmplitude = 0;

    for (let i = minBin; i < maxBin && i < bufferLength; i++) {
      voiceEnergy += dataArray[i];
      if (dataArray[i] > maxAmplitude) {
        maxAmplitude = dataArray[i];
        dominantFrequency = i * binWidth;
      }
    }

    const avgVoiceEnergy = voiceEnergy / (maxBin - minBin);
    const threshold = (this.state.vadConfig.sensitivity / 100) * 255;

    // Voice detection: average energy in voice range above threshold
    const isVoiceDetected = avgVoiceEnergy > threshold && audioLevel > 5;

    // Calculate confidence (0-100)
    const confidence = Math.min(100, Math.round((avgVoiceEnergy / 255) * 100));

    // Update voice activity state
    this.state.voiceActivity = {
      isVoiceDetected,
      audioLevel,
      dominantFrequency,
      confidence,
      voiceDuration:
        isVoiceDetected && this.voiceStartTime ? Date.now() - this.voiceStartTime : null,
      silenceDuration:
        !isVoiceDetected && this.silenceStartTime ? Date.now() - this.silenceStartTime : null,
    };

    // Handle voice state transitions
    this.handleVoiceStateChange(isVoiceDetected);
  }

  /**
   * Handle voice state changes
   */
  private async handleVoiceStateChange(isVoiceDetected: boolean): Promise<void> {
    const now = Date.now();

    if (isVoiceDetected) {
      // Voice detected
      if (this.voiceStartTime === null) {
        this.voiceStartTime = now;
        this.silenceStartTime = null;

        this.state.state = 'voice-detected';
        this.notifyStateChange();

        const event: DuckingEvent = {
          id: generateEventId(),
          timestamp: new Date(),
          type: 'voice-detected',
          voiceActivity: { ...this.state.voiceActivity },
          affectedSources: [],
          success: true,
        };

        await recordDuckingEvent(event);
        this.notifyEvent(event);
      }

      // Check if should duck (voice duration meets minimum)
      const voiceDuration = now - this.voiceStartTime;
      const timeSinceLastDuck = now - this.lastDuckTime;

      if (
        voiceDuration >= this.state.vadConfig.minVoiceDuration &&
        timeSinceLastDuck >= this.state.duckingConfig.minDuckInterval &&
        this.state.state !== 'ducking'
      ) {
        await this.applyDuck();
      }
    } else {
      // Silence detected
      if (this.silenceStartTime === null && this.voiceStartTime !== null) {
        this.silenceStartTime = now;

        const event: DuckingEvent = {
          id: generateEventId(),
          timestamp: new Date(),
          type: 'voice-ended',
          voiceActivity: { ...this.state.voiceActivity },
          affectedSources: [],
          success: true,
        };

        await recordDuckingEvent(event);
        this.notifyEvent(event);
      }

      // Check if should release duck (silence duration meets threshold)
      if (this.silenceStartTime !== null) {
        const silenceDuration = now - this.silenceStartTime;

        if (
          silenceDuration >= this.state.vadConfig.silenceThreshold &&
          this.state.state === 'ducking'
        ) {
          await this.releaseDuck();
          this.voiceStartTime = null;
        }
      }
    }
  }

  /**
   * Apply duck to audio sources
   */
  private async applyDuck(): Promise<void> {
    if (!this.state.duckingConfig.enabled || !this.obsController) {
      return;
    }

    this.state.state = 'ducking';
    this.lastDuckTime = Date.now();
    this.notifyStateChange();

    const enabledSources = this.state.audioSources.filter((s) => s.enabled);
    const affectedSourceIds: string[] = [];

    for (const source of enabledSources) {
      try {
        const duckAmount = source.customDuckAmount ?? this.state.duckingConfig.duckAmount;
        const targetVolume = Math.round(source.originalVolume * (1 - duckAmount / 100));

        // TODO: Implement OBS WebSocket audio source volume control
        // Currently logs intended action - needs obs-websocket SetInputVolume call
        console.log(`[Duck] ${source.displayName}: ${source.currentVolume}% → ${targetVolume}%`);

        source.currentVolume = targetVolume;
        source.lastDucked = new Date();
        await saveAudioSource(source);

        affectedSourceIds.push(source.id);
      } catch (error) {
        console.error(`Failed to duck source ${source.displayName}:`, error);
      }
    }

    const event: DuckingEvent = {
      id: generateEventId(),
      timestamp: new Date(),
      type: 'duck-started',
      voiceActivity: { ...this.state.voiceActivity },
      affectedSources: affectedSourceIds,
      duckAmount: this.state.duckingConfig.duckAmount,
      success: affectedSourceIds.length > 0,
    };

    await recordDuckingEvent(event);
    this.notifyEvent(event);
  }

  /**
   * Release duck (restore volumes)
   */
  private async releaseDuck(): Promise<void> {
    if (this.state.state !== 'ducking') {
      return;
    }

    this.state.state = 'releasing';
    this.notifyStateChange();

    const duckedSources = this.state.audioSources.filter((s) => s.currentVolume < s.originalVolume);
    const affectedSourceIds: string[] = [];

    for (const source of duckedSources) {
      try {
        // TODO: Implement OBS WebSocket audio source volume control
        // Currently logs intended action - needs obs-websocket SetInputVolume call
        console.log(
          `[Release] ${source.displayName}: ${source.currentVolume}% → ${source.originalVolume}%`,
        );

        source.currentVolume = source.originalVolume;
        await saveAudioSource(source);

        affectedSourceIds.push(source.id);
      } catch (error) {
        console.error(`Failed to release source ${source.displayName}:`, error);
      }
    }

    this.state.state = 'idle';
    this.silenceStartTime = null;
    this.notifyStateChange();

    const event: DuckingEvent = {
      id: generateEventId(),
      timestamp: new Date(),
      type: 'duck-released',
      voiceActivity: { ...this.state.voiceActivity },
      affectedSources: affectedSourceIds,
      success: affectedSourceIds.length > 0,
    };

    await recordDuckingEvent(event);
    this.notifyEvent(event);
  }

  /**
   * Get current state
   */
  getState(): AudioDuckingState {
    return { ...this.state };
  }

  /**
   * Is monitoring active
   */
  isMonitoring(): boolean {
    return this.state.isMonitoring;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): UnsubscribeFunction {
    this.stateChangeCallbacks.add(callback);
    const unsubscribe: UnsubscribeFunction = () => {
      this.stateChangeCallbacks.delete(callback);
    };
    return unsubscribe;
  }

  /**
   * Subscribe to ducking events
   */
  onEvent(callback: EventCallback): UnsubscribeFunction {
    this.eventCallbacks.add(callback);
    const unsubscribe: UnsubscribeFunction = () => {
      this.eventCallbacks.delete(callback);
    };
    return unsubscribe;
  }

  /**
   * Notify state change callbacks
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach((callback) => callback(this.getState()));
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: DuckingEvent): void {
    this.eventCallbacks.forEach((callback) => callback(event));
  }
}

// Singleton export
export const audioDuckingEngine = new AudioDuckingEngine();
