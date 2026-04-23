import OBSWebSocket from 'obs-websocket-js';
import type { OBSConfig, OBSStatus, ConnectionError } from './types.js';

/**
 * Manages connection to OBS WebSocket server and broadcasts status updates
 */
export class OBSConnectionManager {
  private obs: OBSWebSocket;
  private config: OBSConfig;
  private status: OBSStatus;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private statusListeners: Set<(status: OBSStatus) => void> = new Set();
  private errorListeners: Set<(error: ConnectionError) => void> = new Set();

  constructor(config: OBSConfig) {
    this.obs = new OBSWebSocket();
    this.config = config;
    this.status = {
      status: 'disconnected',
      activeScene: null,
      isRecording: false,
      isStreaming: false,
      virtualCameraActive: false,
    };

    this.setupEventHandlers();
  }

  /**
   * Connect to OBS WebSocket server
   */
  async connect(): Promise<void> {
    try {
      this.updateStatus({ status: 'connecting' });

      await this.obs.connect(`ws://${this.config.host}:${this.config.port}`, this.config.password);

      this.updateStatus({ status: 'connected' });
      this.reconnectAttempts = 0;

      // Fetch initial state
      await this.refreshStatus();
    } catch (error) {
      const err = error as Error;
      this.updateStatus({ status: 'error' });
      this.emitError({
        code: 'CONNECTION_FAILED',
        message: `Failed to connect to OBS: ${err.message}`,
        timestamp: new Date(),
      });

      // Auto-reconnect
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from OBS WebSocket server
   */
  async disconnect(): Promise<void> {
    try {
      await this.obs.disconnect();
      this.updateStatus({ status: 'disconnected' });
    } catch (error) {
      const err = error as Error;
      console.error('Failed to disconnect:', err);
    }
  }

  /**
   * Get current OBS status
   */
  getStatus(): OBSStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: (status: OBSStatus) => void): () => void {
    this.statusListeners.add(callback);
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: ConnectionError) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Get raw OBS WebSocket instance for direct API calls
   */
  getOBS(): OBSWebSocket {
    return this.obs;
  }

  /**
   * Refresh current status from OBS
   */
  private async refreshStatus(): Promise<void> {
    try {
      const sceneInfo = await this.obs.call('GetCurrentProgramScene');
      const recordStatus = await this.obs.call('GetRecordStatus');
      const streamStatus = await this.obs.call('GetStreamStatus');
      const virtualCamStatus = await this.obs.call('GetVirtualCamStatus');

      this.updateStatus({
        activeScene: sceneInfo.currentProgramSceneName,
        isRecording: recordStatus.outputActive,
        isStreaming: streamStatus.outputActive,
        virtualCameraActive: virtualCamStatus.outputActive,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Failed to refresh status:', err);
    }
  }

  /**
   * Setup OBS event handlers
   */
  private setupEventHandlers(): void {
    // Scene changes
    this.obs.on('CurrentProgramSceneChanged', (event) => {
      this.updateStatus({ activeScene: event.sceneName });
    });

    // Recording events
    this.obs.on('RecordStateChanged', (event) => {
      this.updateStatus({ isRecording: event.outputActive });
    });

    // Streaming events
    this.obs.on('StreamStateChanged', (event) => {
      this.updateStatus({ isStreaming: event.outputActive });
    });

    // Virtual camera events
    this.obs.on('VirtualcamStateChanged', (event) => {
      this.updateStatus({ virtualCameraActive: event.outputActive });
    });

    // Connection lost
    this.obs.on('ConnectionClosed', () => {
      this.updateStatus({ status: 'disconnected' });
      this.emitError({
        code: 'CONNECTION_LOST',
        message: 'Connection to OBS lost',
        timestamp: new Date(),
      });
      this.scheduleReconnect();
    });

    // Connection error
    this.obs.on('ConnectionError', (err) => {
      this.updateStatus({ status: 'error' });
      this.emitError({
        code: 'CONNECTION_ERROR',
        message: err.message || 'Unknown connection error',
        timestamp: new Date(),
      });
    });
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(partial: Partial<OBSStatus>): void {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach((listener) => listener(this.status));
  }

  /**
   * Emit error to listeners
   */
  private emitError(error: ConnectionError): void {
    this.errorListeners.forEach((listener) => listener(error));
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emitError({
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
        timestamp: new Date(),
      });
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(
        `Reconnecting to OBS (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      );
      this.connect();
    }, this.reconnectDelay);
  }
}
