/**
 * Auto-Backup Engine
 * Manages recording automation, split intervals, multi-location backups, and retry logic
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  BackupConfig,
  BackupRecord,
  BackupLocation,
  LocationStatus,
  UploadQueueEntry,
  BackupState,
  UploadProgressEvent,
  SPLIT_INTERVAL_MS,
} from './autoBackupTypes.js';
import {
  generateRecordId,
  generateQueueId,
  formatFileName,
  calculateRetryDelay,
  DEFAULT_BACKUP_CONFIG,
} from './autoBackupTypes.js';
import {
  getBackupConfig,
  saveBackupConfig,
  saveBackupRecord,
  getBackupRecord,
  getEnabledBackupLocations,
  addToUploadQueue,
  getQueueEntry,
  removeFromUploadQueue,
  getReadyQueueEntries,
} from './autoBackupStorage.js';

/**
 * AutoBackupEngine - Singleton class for managing recording automation
 */
export class AutoBackupEngine {
  private obsController: OBSController | null = null;
  private config: BackupConfig = { ...DEFAULT_BACKUP_CONFIG };
  private state: BackupState = {
    isRecording: false,
    isPaused: false,
    currentRecordId: null,
    currentFilePath: null,
    recordingStartTime: null,
    splitTimer: null,
    splitIndex: 0,
    queueProcessorInterval: null,
  };

  // Callback subscriptions
  private stateChangeCallbacks = new Set<(state: BackupState) => void>();
  private uploadProgressCallbacks = new Set<
    (event: UploadProgressEvent) => void
  >();
  private backupCompleteCallbacks = new Set<
    (recordId: string, success: boolean) => void
  >();

  constructor() {
    this.loadConfig();
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      this.config = await getBackupConfig();
    } catch (error) {
      console.error('Failed to load backup config:', error);
      this.config = { ...DEFAULT_BACKUP_CONFIG };
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(partialConfig: Partial<BackupConfig>): Promise<void> {
    this.config = { ...this.config, ...partialConfig };
    await saveBackupConfig(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  /**
   * Set OBS controller reference
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
  }

  // ============================================================================
  // RECORDING CONTROL
  // ============================================================================

  /**
   * Start recording with auto-backup
   */
  async startRecording(sceneName?: string): Promise<void> {
    if (!this.obsController) {
      throw new Error('OBS controller not set');
    }

    if (this.state.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      // Start OBS recording
      await this.obsController.recording.startRecording();

      // Create backup record
      const recordId = generateRecordId();
      const now = new Date();
      const fileName = formatFileName(
        this.config.fileNamingPattern,
        now,
        sceneName || 'unknown',
        this.state.splitIndex,
        this.state.splitIndex > 0,
      );

      const record: BackupRecord = {
        id: recordId,
        startTime: now,
        endTime: undefined,
        duration: 0,
        filePath: '', // Will be updated when recording stops
        fileName,
        fileSize: 0,
        sceneName: sceneName || undefined,
        isSplit: this.state.splitIndex > 0,
        splitIndex: this.state.splitIndex,
        parentRecordId: this.state.splitIndex > 0 ? this.state.currentRecordId : undefined,
        locations: [],
        overallStatus: 'pending',
        error: undefined,
        createdAt: now,
      };

      await saveBackupRecord(record);

      // Update state
      this.state.isRecording = true;
      this.state.isPaused = false;
      this.state.currentRecordId = recordId;
      this.state.currentFilePath = fileName;
      this.state.recordingStartTime = now;

      // Setup split timer if enabled
      if (this.config.splitInterval !== 'none') {
        this.setupSplitTimer();
      }

      this.notifyStateChange();
      console.log(`Recording started: ${recordId}`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and trigger backups
   */
  async stopRecording(): Promise<void> {
    if (!this.obsController || !this.state.isRecording) {
      return;
    }

    try {
      // Stop OBS recording
      await this.obsController.recording.stopRecording();

      // Clear split timer
      if (this.state.splitTimer) {
        clearTimeout(this.state.splitTimer);
        this.state.splitTimer = null;
      }

      // Finalize record
      if (this.state.currentRecordId) {
        const record = await getBackupRecord(this.state.currentRecordId);
        if (record) {
          record.endTime = new Date();
          record.duration =
            (record.endTime.getTime() - record.startTime.getTime()) / 1000;

          // TODO: Get actual file path and size from OBS
          // For now, use placeholder values
          record.filePath = `recordings/${record.fileName}`;
          record.fileSize = Math.floor(Math.random() * 1000000000); // Placeholder

          await saveBackupRecord(record);

          // Execute backups
          await this.executeBackups(record.id);
        }
      }

      // Reset state
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.state.currentRecordId = null;
      this.state.currentFilePath = null;
      this.state.recordingStartTime = null;
      this.state.splitIndex = 0;

      this.notifyStateChange();
      console.log('Recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    if (!this.obsController || !this.state.isRecording) {
      return;
    }

    try {
      await this.obsController.recording.pauseRecording();
      this.state.isPaused = true;
      this.notifyStateChange();
      console.log('Recording paused');
    } catch (error) {
      console.error('Failed to pause recording:', error);
      throw error;
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (!this.obsController || !this.state.isRecording || !this.state.isPaused) {
      return;
    }

    try {
      await this.obsController.recording.resumeRecording();
      this.state.isPaused = false;
      this.notifyStateChange();
      console.log('Recording resumed');
    } catch (error) {
      console.error('Failed to resume recording:', error);
      throw error;
    }
  }

  // ============================================================================
  // SPLIT RECORDING LOGIC
  // ============================================================================

  /**
   * Setup timer for automatic recording split
   */
  private setupSplitTimer(): void {
    if (this.config.splitInterval === 'none') {
      return;
    }

    const intervalMs = this.getSplitIntervalMs();
    if (intervalMs === 0) {
      return;
    }

    this.state.splitTimer = setTimeout(() => {
      this.handleSplit();
    }, intervalMs);

    console.log(`Split timer set for ${intervalMs}ms`);
  }

  /**
   * Get split interval in milliseconds
   */
  private getSplitIntervalMs(): number {
    const intervals: Record<string, number> = {
      none: 0,
      '30min': 30 * 60 * 1000,
      '1hr': 60 * 60 * 1000,
      '2hr': 2 * 60 * 60 * 1000,
    };
    return intervals[this.config.splitInterval] || 0;
  }

  /**
   * Handle automatic recording split
   */
  private async handleSplit(): Promise<void> {
    if (!this.state.isRecording) {
      return;
    }

    console.log('Executing recording split...');

    try {
      // Stop current recording
      await this.stopRecording();

      // Increment split index
      this.state.splitIndex++;

      // Small delay before starting new recording
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Start new recording with same scene
      const currentRecord = await getBackupRecord(
        this.state.currentRecordId || '',
      );
      await this.startRecording(currentRecord?.sceneName);
    } catch (error) {
      console.error('Failed to execute split:', error);
    }
  }

  // ============================================================================
  // BACKUP EXECUTION
  // ============================================================================

  /**
   * Execute backups to all enabled locations
   */
  private async executeBackups(recordId: string): Promise<void> {
    const record = await getBackupRecord(recordId);
    if (!record) {
      console.error(`Record not found: ${recordId}`);
      return;
    }

    const locations = await getEnabledBackupLocations();
    if (locations.length === 0) {
      console.warn('No enabled backup locations');
      record.overallStatus = 'completed';
      await saveBackupRecord(record);
      return;
    }

    console.log(`Executing backups to ${locations.length} locations...`);

    // Initialize location statuses
    record.locations = locations.map((loc) => ({
      locationId: loc.id,
      status: 'pending',
      progress: 0,
      uploadedAt: undefined,
      error: undefined,
    }));
    await saveBackupRecord(record);

    // Execute backups sequentially by priority
    for (const location of locations) {
      await this.backupToLocation(record, location);
    }

    // Update overall status
    const allCompleted = record.locations.every(
      (loc) => loc.status === 'completed',
    );
    const anyFailed = record.locations.some((loc) => loc.status === 'failed');

    record.overallStatus = allCompleted
      ? 'completed'
      : anyFailed
        ? 'failed'
        : 'pending';

    await saveBackupRecord(record);
    this.notifyBackupComplete(recordId, allCompleted);
  }

  /**
   * Backup to a specific location
   */
  private async backupToLocation(
    record: BackupRecord,
    location: BackupLocation,
  ): Promise<void> {
    const locationStatus = record.locations.find(
      (loc) => loc.locationId === location.id,
    );
    if (!locationStatus) {
      return;
    }

    locationStatus.status = 'uploading';
    await saveBackupRecord(record);

    try {
      if (location.type === 'local' || location.type === 'network') {
        // File system copy (placeholder - needs Node.js fs or Electron)
        console.log(
          `[PLACEHOLDER] Copying file to ${location.type} path: ${location.path}`,
        );
        await this.simulateFileCopy(record, location, locationStatus);
      } else if (location.type === 'cloud') {
        // Cloud upload
        if (this.config.autoCloudUpload) {
          await this.uploadToCloud(record, location, locationStatus);
        } else {
          // Add to upload queue for later
          const queueEntry: UploadQueueEntry = {
            recordId: record.id,
            locationId: location.id,
            retryCount: 0,
            maxRetries: this.config.maxRetries,
            nextRetryAt: new Date(),
            lastError: undefined,
            addedAt: new Date(),
          };
          await addToUploadQueue(queueEntry);
          locationStatus.status = 'pending';
        }
      }

      await saveBackupRecord(record);
    } catch (error) {
      console.error(
        `Failed to backup to ${location.displayName}:`,
        error,
      );
      locationStatus.status = 'failed';
      locationStatus.error = error instanceof Error ? error.message : 'Unknown error';
      await saveBackupRecord(record);

      // Add to retry queue if enabled
      if (this.config.retryFailedUploads && location.type === 'cloud') {
        const queueEntry: UploadQueueEntry = {
          recordId: record.id,
          locationId: location.id,
          retryCount: 0,
          maxRetries: this.config.maxRetries,
          nextRetryAt: new Date(Date.now() + calculateRetryDelay(0)),
          lastError: locationStatus.error,
          addedAt: new Date(),
        };
        await addToUploadQueue(queueEntry);
      }
    }
  }

  /**
   * Simulate file copy (placeholder for actual implementation)
   */
  private async simulateFileCopy(
    record: BackupRecord,
    location: BackupLocation,
    locationStatus: LocationStatus,
  ): Promise<void> {
    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      locationStatus.progress = progress;
      await saveBackupRecord(record);

      this.notifyUploadProgress({
        recordId: record.id,
        locationId: location.id,
        progress,
        bytesUploaded: Math.floor((record.fileSize * progress) / 100),
        totalBytes: record.fileSize,
        speed: 5 * 1024 * 1024, // 5 MB/s placeholder
        estimatedTimeRemaining: Math.floor(((100 - progress) / 100) * 10),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    locationStatus.status = 'completed';
    locationStatus.uploadedAt = new Date();
    locationStatus.progress = 100;
  }

  /**
   * Upload to cloud storage
   */
  private async uploadToCloud(
    record: BackupRecord,
    location: BackupLocation,
    locationStatus: LocationStatus,
  ): Promise<void> {
    if (!location.cloudProvider || !location.cloudAuth) {
      throw new Error('Cloud provider or authentication not configured');
    }

    switch (location.cloudProvider) {
      case 'onedrive':
        await this.uploadToOneDrive(record, location, locationStatus);
        break;
      case 'dropbox':
        await this.uploadToDropbox(record, location, locationStatus);
        break;
      case 'googledrive':
        await this.uploadToGoogleDrive(record, location, locationStatus);
        break;
      default:
        throw new Error(`Unsupported cloud provider: ${location.cloudProvider}`);
    }
  }

  /**
   * Upload to OneDrive (placeholder)
   */
  private async uploadToOneDrive(
    record: BackupRecord,
    location: BackupLocation,
    locationStatus: LocationStatus,
  ): Promise<void> {
    console.log('[TODO] OneDrive upload implementation');
    // TODO: Microsoft Graph API /me/drive/root:/path:/createUploadSession
    await this.simulateFileCopy(record, location, locationStatus);
  }

  /**
   * Upload to Dropbox (placeholder)
   */
  private async uploadToDropbox(
    record: BackupRecord,
    location: BackupLocation,
    locationStatus: LocationStatus,
  ): Promise<void> {
    console.log('[TODO] Dropbox upload implementation');
    // TODO: Dropbox API /files/upload
    await this.simulateFileCopy(record, location, locationStatus);
  }

  /**
   * Upload to Google Drive (placeholder)
   */
  private async uploadToGoogleDrive(
    record: BackupRecord,
    location: BackupLocation,
    locationStatus: LocationStatus,
  ): Promise<void> {
    console.log('[TODO] Google Drive upload implementation');
    // TODO: Google Drive API /upload/drive/v3/files
    await this.simulateFileCopy(record, location, locationStatus);
  }

  // ============================================================================
  // UPLOAD QUEUE PROCESSING
  // ============================================================================

  /**
   * Start upload queue processor
   */
  start(): void {
    if (this.state.queueProcessorInterval) {
      return;
    }

    // Process queue every 30 seconds
    this.state.queueProcessorInterval = setInterval(() => {
      this.processUploadQueue();
    }, 30000);

    console.log('Upload queue processor started');
  }

  /**
   * Stop upload queue processor
   */
  stop(): void {
    if (this.state.queueProcessorInterval) {
      clearInterval(this.state.queueProcessorInterval);
      this.state.queueProcessorInterval = null;
      console.log('Upload queue processor stopped');
    }
  }

  /**
   * Process upload queue for retry
   */
  private async processUploadQueue(): Promise<void> {
    const readyEntries = await getReadyQueueEntries();
    if (readyEntries.length === 0) {
      return;
    }

    console.log(`Processing ${readyEntries.length} queue entries...`);

    for (const entry of readyEntries) {
      await this.retryUpload(entry);
    }
  }

  /**
   * Retry a failed upload
   */
  private async retryUpload(entry: UploadQueueEntry): Promise<void> {
    const record = await getBackupRecord(entry.recordId);
    const location = await getEnabledBackupLocations().then((locs) =>
      locs.find((loc) => loc.id === entry.locationId),
    );

    if (!record || !location) {
      await removeFromUploadQueue(entry.recordId);
      return;
    }

    const locationStatus = record.locations.find(
      (loc) => loc.locationId === entry.locationId,
    );
    if (!locationStatus) {
      await removeFromUploadQueue(entry.recordId);
      return;
    }

    console.log(
      `Retrying upload for ${record.fileName} to ${location.displayName} (attempt ${entry.retryCount + 1}/${entry.maxRetries})`,
    );

    try {
      await this.backupToLocation(record, location);

      if (locationStatus.status === 'completed') {
        await removeFromUploadQueue(entry.recordId);
        console.log('Upload retry successful');
      } else {
        throw new Error('Upload failed after retry');
      }
    } catch (error) {
      entry.retryCount++;
      entry.lastError = error instanceof Error ? error.message : 'Unknown error';

      if (entry.retryCount >= entry.maxRetries) {
        // Max retries reached
        await removeFromUploadQueue(entry.recordId);
        locationStatus.status = 'failed';
        locationStatus.error = `Max retries (${entry.maxRetries}) reached`;
        await saveBackupRecord(record);
        console.error('Upload failed after max retries');
      } else {
        // Schedule next retry
        entry.nextRetryAt = new Date(
          Date.now() + calculateRetryDelay(entry.retryCount),
        );
        await addToUploadQueue(entry);
        console.log(`Next retry scheduled for ${entry.nextRetryAt.toISOString()}`);
      }
    }
  }

  // ============================================================================
  // STATE & SUBSCRIPTIONS
  // ============================================================================

  /**
   * Get current state
   */
  getState(): BackupState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: BackupState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Subscribe to upload progress
   */
  onUploadProgress(
    callback: (event: UploadProgressEvent) => void,
  ): () => void {
    this.uploadProgressCallbacks.add(callback);
    return () => this.uploadProgressCallbacks.delete(callback);
  }

  /**
   * Subscribe to backup completion
   */
  onBackupComplete(
    callback: (recordId: string, success: boolean) => void,
  ): () => void {
    this.backupCompleteCallbacks.add(callback);
    return () => this.backupCompleteCallbacks.delete(callback);
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeCallbacks.forEach((callback) => callback(state));
  }

  /**
   * Notify upload progress
   */
  private notifyUploadProgress(event: UploadProgressEvent): void {
    this.uploadProgressCallbacks.forEach((callback) => callback(event));
  }

  /**
   * Notify backup completion
   */
  private notifyBackupComplete(recordId: string, success: boolean): void {
    this.backupCompleteCallbacks.forEach((callback) =>
      callback(recordId, success),
    );
  }
}

/**
 * Export singleton instance
 */
export const autoBackupEngine = new AutoBackupEngine();
