import type OBSWebSocket from 'obs-websocket-js';

/**
 * Manages OBS recording and streaming controls
 */
export class RecordingController {
  constructor(private obs: OBSWebSocket) {}

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    await this.obs.call('StartRecord');
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    await this.obs.call('StopRecord');
  }

  /**
   * Pause recording (if supported)
   */
  async pauseRecording(): Promise<void> {
    await this.obs.call('PauseRecord');
  }

  /**
   * Resume paused recording
   */
  async resumeRecording(): Promise<void> {
    await this.obs.call('ResumeRecord');
  }

  /**
   * Get recording status
   */
  async getRecordingStatus(): Promise<{
    active: boolean;
    paused: boolean;
    duration?: number;
  }> {
    const status = await this.obs.call('GetRecordStatus');
    return {
      active: status.outputActive,
      paused: status.outputPaused || false,
      duration: status.outputDuration,
    };
  }

  /**
   * Start streaming
   */
  async startStreaming(): Promise<void> {
    await this.obs.call('StartStream');
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    await this.obs.call('StopStream');
  }

  /**
   * Get streaming status
   */
  async getStreamingStatus(): Promise<{
    active: boolean;
    duration?: number;
  }> {
    const status = await this.obs.call('GetStreamStatus');
    return {
      active: status.outputActive,
      duration: status.outputDuration,
    };
  }
}
