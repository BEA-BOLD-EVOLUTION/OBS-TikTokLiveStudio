import { OBSConnectionManager } from './connection.js';
import { SceneController } from './scenes.js';
import { RecordingController } from './recording.js';
import { VirtualCameraController } from './virtualCamera.js';
import { MediaSourceController } from './mediaSource.js';
import { TextSourceController } from './textSource.js';
import type { OBSConfig, OBSStatus, ConnectionError } from './types.js';

/**
 * Main OBS controller that provides unified access to all OBS features
 */
export class OBSController {
  private connectionManager: OBSConnectionManager;
  public scenes: SceneController;
  public recording: RecordingController;
  public virtualCamera: VirtualCameraController;
  public mediaSource: MediaSourceController;
  public textSource: TextSourceController;

  constructor(config: OBSConfig) {
    this.connectionManager = new OBSConnectionManager(config);

    const obs = this.connectionManager.getOBS();
    this.scenes = new SceneController(obs);
    this.recording = new RecordingController(obs);
    this.virtualCamera = new VirtualCameraController(obs);
    this.mediaSource = new MediaSourceController(obs);
    this.textSource = new TextSourceController(obs);
  }

  /**
   * Connect to OBS
   */
  async connect(): Promise<void> {
    await this.connectionManager.connect();
  }

  /**
   * Disconnect from OBS
   */
  async disconnect(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  /**
   * Get current OBS status
   */
  getStatus(): OBSStatus {
    return this.connectionManager.getStatus();
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: OBSStatus) => void): () => void {
    return this.connectionManager.onStatusChange(callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: ConnectionError) => void): () => void {
    return this.connectionManager.onError(callback);
  }

  /**
   * Get raw OBS WebSocket instance for direct event subscriptions
   * Use sparingly - prefer high-level methods when available
   */
  getOBS() {
    return this.connectionManager.getOBS();
  }
}

// Re-export types
export type { OBSConfig, OBSStatus, ConnectionError, Scene } from './types.js';
export type { ConnectionStatus } from './types.js';
export type { MediaAction, MediaPlaybackEndedEvent } from './mediaSource.js';
