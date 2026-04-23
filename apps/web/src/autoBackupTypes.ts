/**
 * Type definitions for Auto-Backup Recordings system
 * Provides intelligent recording management with auto-start, split intervals, and multi-location backup
 */

/**
 * Split interval configuration
 */
export type SplitInterval = 'none' | '30min' | '1hr' | '2hr';

/**
 * Backup location type
 */
export type LocationType = 'local' | 'network' | 'cloud';

/**
 * Cloud provider options
 */
export type CloudProvider = 'onedrive' | 'dropbox' | 'googledrive';

/**
 * Upload status for a backup location
 */
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'paused';

/**
 * Cloud authentication configuration
 */
export interface CloudAuthConfig {
  provider: CloudProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  enabled: boolean;
  autoStart: boolean;
  splitInterval: SplitInterval;
  fileNamingPattern: string; // e.g., "{date}_{time}_{scene}.mkv"
  autoCloudUpload: boolean;
  retryFailedUploads: boolean;
  maxRetries: number;
  deleteLocalAfterUpload: boolean;
}

/**
 * Backup location configuration
 */
export interface BackupLocation {
  id: string;
  type: LocationType;
  path: string;
  displayName: string;
  enabled: boolean;
  priority: number; // 1-10, higher = executed first
  cloudProvider?: CloudProvider;
  cloudAuth?: CloudAuthConfig;
  testStatus?: 'untested' | 'success' | 'failed';
  testError?: string;
  lastTestedAt?: Date;
  createdAt: Date;
}

/**
 * Location upload status for a single backup record
 */
export interface LocationStatus {
  locationId: string;
  locationDisplayName: string;
  status: UploadStatus;
  uploadedAt?: Date;
  error?: string;
  progress?: number; // 0-100
  bytesUploaded?: number;
  retryCount?: number;
}

/**
 * Backup record for a single recording session
 */
export interface BackupRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  filePath: string;
  fileName: string;
  fileSize?: number; // bytes
  sceneName?: string;
  isSplit: boolean; // true if this is a split segment
  splitIndex?: number; // 1, 2, 3, etc.
  parentRecordId?: string; // if split, reference to original recording
  locations: LocationStatus[]; // status for each backup location
  overallStatus: 'recording' | 'completed' | 'uploading' | 'backed-up' | 'failed' | 'pending';
  error?: string;
  createdAt: Date;
}

/**
 * Upload queue entry for retry management
 */
export interface UploadQueueEntry {
  recordId: string;
  locationId: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  lastError?: string;
  addedAt: Date;
}

/**
 * Storage distribution by location
 */
export interface StorageByLocation {
  locationId: string;
  locationDisplayName: string;
  recordingCount: number;
  totalSize: number; // bytes
  successRate: number; // 0-100
}

/**
 * Backup analytics
 */
export interface BackupAnalytics {
  totalRecordings: number;
  totalSize: number; // bytes
  totalDuration: number; // milliseconds
  successfulUploads: number;
  failedUploads: number;
  pendingUploads: number;
  storageByLocation: StorageByLocation[];
  mostUsedScene?: string;
  averageRecordingDuration: number; // milliseconds
  averageFileSize: number; // bytes
  oldestRecording?: Date;
  newestRecording?: Date;
  splitRecordingsCount: number;
}

/**
 * Backup engine state
 */
export interface BackupState {
  isRecording: boolean;
  currentRecordId?: string | null;
  currentFilePath?: string | null;
  recordingStartTime?: Date | null;
  nextSplitTime?: Date;
  splitTimerActive: boolean;
  activeUploads: number;
  queuedUploads: number;
  splitIndex?: number;
  isPaused?: boolean;
  splitTimer?: ReturnType<typeof setTimeout> | null;
  queueProcessorInterval?: ReturnType<typeof setInterval> | null;
}

/**
 * Upload progress event
 */
export interface UploadProgressEvent {
  recordId: string;
  locationId: string;
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  speed?: number; // bytes per second
}

/**
 * Default backup configuration
 */
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  autoStart: true,
  splitInterval: 'none',
  fileNamingPattern: '{date}_{time}_{scene}.mkv',
  autoCloudUpload: false,
  retryFailedUploads: true,
  maxRetries: 3,
  deleteLocalAfterUpload: false,
};

/**
 * Split interval durations in milliseconds
 */
export const SPLIT_INTERVAL_MS: Record<SplitInterval, number> = {
  none: 0,
  '30min': 30 * 60 * 1000,
  '1hr': 60 * 60 * 1000,
  '2hr': 2 * 60 * 60 * 1000,
};

/**
 * Cloud provider display names
 */
export const CLOUD_PROVIDER_NAMES: Record<CloudProvider, string> = {
  onedrive: 'OneDrive',
  dropbox: 'Dropbox',
  googledrive: 'Google Drive',
};

/**
 * Cloud provider colors (for UI)
 */
export const CLOUD_PROVIDER_COLORS: Record<CloudProvider, string> = {
  onedrive: '#0078d4',
  dropbox: '#0061ff',
  googledrive: '#4285f4',
};

/**
 * Location type icons (emoji)
 */
export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  local: '📁',
  network: '🌐',
  cloud: '☁️',
};

/**
 * Generate unique backup record ID
 */
export function generateRecordId(): string {
  return `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique location ID
 */
export function generateLocationId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique upload queue entry ID
 */
export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format file naming pattern with actual values
 * Replaces {date}, {time}, {scene} placeholders
 */
export function formatFileName(
  pattern: string,
  date: Date,
  sceneName?: string,
  splitIndex?: number,
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  let result = pattern;
  result = result.replace('{date}', `${year}-${month}-${day}`);
  result = result.replace('{time}', `${hours}-${minutes}-${seconds}`);
  result = result.replace('{scene}', sceneName || 'unknown');

  if (splitIndex !== undefined) {
    result = result.replace('.mkv', `_part${splitIndex}.mkv`);
  }

  return result;
}

/**
 * Format file size for display (bytes to KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration for display (milliseconds to HH:MM:SS)
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format speed for display (bytes per second to KB/s, MB/s)
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
}

/**
 * Calculate estimated time remaining (milliseconds)
 */
export function calculateETA(bytesUploaded: number, totalBytes: number, speed: number): number {
  if (speed === 0) return 0;
  const remaining = totalBytes - bytesUploaded;
  return (remaining / speed) * 1000; // convert seconds to milliseconds
}

/**
 * Format ETA for display
 */
export function formatETA(ms: number): string {
  if (ms === 0) return 'Calculating...';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Validate file naming pattern
 */
export function isValidFileNamingPattern(pattern: string): boolean {
  // Must contain {date} and {time}
  if (!pattern.includes('{date}') || !pattern.includes('{time}')) {
    return false;
  }
  // Must end with .mkv
  if (!pattern.endsWith('.mkv')) {
    return false;
  }
  // Must not contain invalid characters
  const invalidChars = /[<>:"|?*]/;
  return !invalidChars.test(pattern.replace(/\{[^}]+\}/g, ''));
}

/**
 * Get upload status color for UI
 */
export function getUploadStatusColor(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return '#6b7280'; // gray
    case 'uploading':
      return '#3B82F6'; // blue
    case 'completed':
      return '#10b981'; // green
    case 'failed':
      return '#ef4444'; // red
    case 'paused':
      return '#f59e0b'; // yellow
    default:
      return '#6b7280';
  }
}

/**
 * Get upload status icon (emoji)
 */
export function getUploadStatusIcon(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'uploading':
      return '⬆️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    case 'paused':
      return '⏸️';
    default:
      return '❓';
  }
}

/**
 * Calculate retry delay with exponential backoff
 * @param retryCount Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const baseDelay = 1000;
  const maxDelay = 60000; // 1 minute max
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Check if cloud provider is authenticated
 */
export function isCloudProviderAuthenticated(auth?: CloudAuthConfig): boolean {
  if (!auth) return false;
  // Check if token is expired
  return auth.expiresAt > new Date();
}

/**
 * Get split interval display name
 */
export function getSplitIntervalDisplayName(interval: SplitInterval): string {
  switch (interval) {
    case 'none':
      return 'No Split';
    case '30min':
      return '30 Minutes';
    case '1hr':
      return '1 Hour';
    case '2hr':
      return '2 Hours';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color for UI badges
 */
export function getStatusColor(status: UploadStatus): string {
  switch (status) {
    case 'pending':
      return '#6b7280'; // Gray
    case 'uploading':
      return '#3B82F6'; // Blue
    case 'completed':
      return '#10b981'; // Green
    case 'failed':
      return '#ef4444'; // Red
    case 'paused':
      return '#f59e0b'; // Yellow
    default:
      return '#9ca3af'; // Light gray
  }
}

/**
 * Get backup record overall status color
 */
export function getRecordStatusColor(
  status: 'recording' | 'completed' | 'uploading' | 'backed-up' | 'failed' | 'pending',
): string {
  switch (status) {
    case 'recording':
      return '#ef4444'; // Red (active recording)
    case 'pending':
      return '#6b7280'; // Gray
    case 'uploading':
      return '#3B82F6'; // Blue
    case 'completed':
    case 'backed-up':
      return '#10b981'; // Green
    case 'failed':
      return '#ef4444'; // Red
    default:
      return '#9ca3af'; // Light gray
  }
}

/**
 * Get location type icon
 */
export function getLocationTypeIcon(type: LocationType): string {
  switch (type) {
    case 'local':
      return '📁';
    case 'network':
      return '🌐';
    case 'cloud':
      return '☁️';
    default:
      return '❓';
  }
}

/**
 * Get cloud provider icon
 */
export function getCloudProviderIcon(provider: CloudProvider): string {
  switch (provider) {
    case 'onedrive':
      return '☁️';
    case 'dropbox':
      return '📦';
    case 'googledrive':
      return '🔷';
    default:
      return '☁️';
  }
}

/**
 * Get cloud provider brand color
 */
export function getCloudProviderColor(provider: CloudProvider): string {
  switch (provider) {
    case 'onedrive':
      return '#0078d4'; // Microsoft blue
    case 'dropbox':
      return '#0061ff'; // Dropbox blue
    case 'googledrive':
      return '#4285f4'; // Google blue
    default:
      return '#3B82F6'; // Default blue
  }
}

/**
 * Validate backup location path
 */
export function isValidLocationPath(path: string, type: LocationType): boolean {
  if (!path || path.trim() === '') return false;

  if (type === 'local' || type === 'network') {
    // Check for valid filesystem path format
    // Windows: C:\path or \\network\path
    // Unix: /path
    const windowsPath = /^[A-Za-z]:\\|^\\\\/;
    const unixPath = /^\//;
    return windowsPath.test(path) || unixPath.test(path);
  }

  // Cloud paths can be any non-empty string (handled by cloud API)
  return true;
}
