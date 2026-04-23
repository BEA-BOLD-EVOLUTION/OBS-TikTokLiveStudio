/**
 * OBS connection status and state types
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBSStatus {
  status: ConnectionStatus;
  activeScene: string | null;
  isRecording: boolean;
  isStreaming: boolean;
  virtualCameraActive: boolean;
  recordingDuration?: number;
  streamingDuration?: number;
}

export interface OBSConfig {
  host: string;
  port: number;
  password?: string;
}

export interface Scene {
  id: string;
  name: string;
  sources?: string[];
}

export interface ConnectionError {
  code: string;
  message: string;
  timestamp: Date;
}
