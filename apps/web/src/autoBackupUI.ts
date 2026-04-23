/**
 * Auto-Backup Recordings UI Component
 * Four-view interface: Configuration, Locations, Active Session (conditional), History
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  BackupConfig,
  BackupLocation,
  BackupRecord,
  BackupState,
  UploadProgressEvent,
  LocationStatus,
} from './autoBackupTypes.js';
import {
  formatFileSize,
  formatDuration,
  getStatusColor,
  getRecordStatusColor,
  getLocationTypeIcon,
  getCloudProviderIcon,
  getCloudProviderColor,
  SPLIT_INTERVAL_MS,
} from './autoBackupTypes.js';
import { autoBackupEngine } from './autoBackupEngine.js';
import {
  getBackupConfig,
  saveBackupConfig,
  getAllBackupLocations,
  saveBackupLocation,
  deleteBackupLocation,
  getAllBackupRecords,
} from './autoBackupStorage.js';

type ViewMode = 'config' | 'locations' | 'history';

export class AutoBackupUI {
  private containerId: string;
  private container: HTMLElement | null = null;
  private currentView: ViewMode = 'config';
  private config: BackupConfig | null = null;
  private locations: BackupLocation[] = [];
  private records: BackupRecord[] = [];
  private currentState: BackupState | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private obsController: OBSController | null = null;
  constructor(containerId: string) {
    this.containerId = containerId;
    this.init();
  }

  private async init(): Promise<void> {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }

    // Load initial data
    await this.loadData();

    // Subscribe to engine events
    autoBackupEngine.onStateChange((state) => {
      this.currentState = state;
      this.render();

      // Start/stop duration timer based on recording state
      if (state.isRecording && !this.durationInterval) {
        this.durationInterval = setInterval(() => this.updateDurationDisplay(), 1000);
      } else if (!state.isRecording && this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }
    });

    autoBackupEngine.onUploadProgress((event) => {
      this.handleUploadProgress(event);
    });

    autoBackupEngine.onBackupComplete((recordId, success) => {
      this.showNotification(
        success
          ? `Backup completed for recording ${recordId}`
          : `Backup failed for recording ${recordId}`,
        success ? 'success' : 'error',
      );
      this.loadData();
    });

    this.render();
  }

  public setOBSController(obs: OBSController): void {
    this.obsController = obs;
    console.log('OBS controller set for Auto Backup UI');
  }

  private async loadData(): Promise<void> {
    try {
      this.config = await getBackupConfig();
      this.locations = await getAllBackupLocations();
      this.records = await getAllBackupRecords();
      this.render();
    } catch (error) {
      console.error('Failed to load Auto-Backup data:', error);
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="auto-backup">
        <div class="auto-backup-header">
          <h2>Auto-Backup Recordings</h2>
          <div class="header-actions">
            <button class="btn-view ${this.currentView === 'config' ? 'active' : ''}" data-view="config">
              Configuration
            </button>
            <button class="btn-view ${this.currentView === 'locations' ? 'active' : ''}" data-view="locations">
              Locations
            </button>
            <button class="btn-view ${this.currentView === 'history' ? 'active' : ''}" data-view="history">
              History
            </button>
          </div>
        </div>
        <div class="auto-backup-body">
          ${this.currentState?.isRecording ? this.renderActiveSession() : ''}
          ${this.renderCurrentView()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  // ============================================================================
  // VIEW SWITCHER
  // ============================================================================

  private renderCurrentView(): string {
    switch (this.currentView) {
      case 'config':
        return this.renderConfigView();
      case 'locations':
        return this.renderLocationsView();
      case 'history':
        return this.renderHistoryView();
      default:
        return '';
    }
  }

  // ============================================================================
  // ACTIVE SESSION VIEW
  // ============================================================================

  private renderActiveSession(): string {
    if (!this.currentState || !this.currentState.isRecording) return '';

    const duration = this.currentState.recordingStartTime
      ? Date.now() - this.currentState.recordingStartTime.getTime()
      : 0;

    const splitRemaining = this.getSplitRemainingTime();

    return `
      <div class="active-session">
        <div class="session-header">
          <div class="recording-indicator">
            <span class="recording-dot"></span>
            <span class="recording-text">Recording in Progress</span>
          </div>
          <button class="btn-stop-recording">Stop Recording</button>
        </div>
        <div class="session-info">
          <div class="info-row">
            <span class="info-label">File:</span>
            <span class="info-value">${this.currentState.currentFilePath || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration:</span>
            <span class="info-value duration-display">${formatDuration(duration)}</span>
          </div>
          ${
            splitRemaining !== null
              ? `
            <div class="info-row">
              <span class="info-label">Next Split:</span>
              <span class="info-value">${formatDuration(splitRemaining)}</span>
            </div>
          `
              : ''
          }
          <div class="info-row">
            <span class="info-label">Split Index:</span>
            <span class="info-value">${this.currentState.splitIndex}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value">${this.currentState.isPaused ? 'Paused' : 'Recording'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private getSplitRemainingTime(): number | null {
    if (
      !this.config ||
      !this.currentState?.recordingStartTime ||
      this.config.splitInterval === 'none'
    ) {
      return null;
    }

    const intervalMs = SPLIT_INTERVAL_MS[this.config.splitInterval];
    const elapsed = Date.now() - this.currentState.recordingStartTime.getTime();
    const splitElapsed = elapsed % intervalMs;
    return intervalMs - splitElapsed;
  }

  private updateDurationDisplay(): void {
    if (!this.currentState?.isRecording || !this.currentState.recordingStartTime) return;

    const durationEl = this.container?.querySelector('.duration-display');
    if (durationEl) {
      const duration = Date.now() - this.currentState.recordingStartTime.getTime();
      durationEl.textContent = formatDuration(duration);
    }
  }

  // ============================================================================
  // CONFIGURATION VIEW
  // ============================================================================

  private renderConfigView(): string {
    if (!this.config) return '<p>Loading configuration...</p>';

    return `
      <div class="config-view">
        <form class="config-form" id="config-form">
          <div class="form-section">
            <h3>Recording Settings</h3>
            <label class="form-label">
              <input type="checkbox" name="enabled" ${this.config.enabled ? 'checked' : ''} />
              Enable Auto-Backup
            </label>
            <label class="form-label">
              <input type="checkbox" name="autoStart" ${this.config.autoStart ? 'checked' : ''} />
              Auto-start recording when going live
            </label>
            <label class="form-label">
              Split Interval:
              <select name="splitInterval">
                <option value="none" ${this.config.splitInterval === 'none' ? 'selected' : ''}>No splitting</option>
                <option value="30min" ${this.config.splitInterval === '30min' ? 'selected' : ''}>Every 30 minutes</option>
                <option value="1hr" ${this.config.splitInterval === '1hr' ? 'selected' : ''}>Every 1 hour</option>
                <option value="2hr" ${this.config.splitInterval === '2hr' ? 'selected' : ''}>Every 2 hours</option>
              </select>
            </label>
          </div>

          <div class="form-section">
            <h3>File Naming</h3>
            <label class="form-label">
              Pattern:
              <input type="text" name="fileNamingPattern" value="${this.config.fileNamingPattern}" />
            </label>
            <p class="form-hint">Available tokens: {date}, {time}, {scene}</p>
          </div>

          <div class="form-section">
            <h3>Cloud Upload</h3>
            <label class="form-label">
              <input type="checkbox" name="autoCloudUpload" ${this.config.autoCloudUpload ? 'checked' : ''} />
              Automatically upload to cloud
            </label>
            <label class="form-label">
              <input type="checkbox" name="retryFailedUploads" ${this.config.retryFailedUploads ? 'checked' : ''} />
              Retry failed uploads
            </label>
            <label class="form-label">
              Max Retries:
              <input type="number" name="maxRetries" value="${this.config.maxRetries}" min="0" max="10" />
            </label>
            <label class="form-label">
              <input type="checkbox" name="deleteLocalAfterUpload" ${this.config.deleteLocalAfterUpload ? 'checked' : ''} />
              Delete local file after successful upload
            </label>
          </div>

          <button type="submit" class="btn-save-config">Save Configuration</button>
        </form>
      </div>
    `;
  }

  // ============================================================================
  // LOCATIONS VIEW
  // ============================================================================

  private renderLocationsView(): string {
    return `
      <div class="locations-view">
        <div class="locations-header">
          <button class="btn-add-location">+ Add Location</button>
        </div>
        <div class="locations-grid">
          ${
            this.locations.length === 0
              ? '<p class="empty-state">No backup locations configured. Add one to get started.</p>'
              : this.locations.map((loc) => this.renderLocationCard(loc)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderLocationCard(location: BackupLocation): string {
    const typeIcon = getLocationTypeIcon(location.type);
    const cloudIcon = location.cloudProvider ? getCloudProviderIcon(location.cloudProvider) : '';
    const cloudColor = location.cloudProvider ? getCloudProviderColor(location.cloudProvider) : '';

    return `
      <div class="location-card ${location.enabled ? 'enabled' : 'disabled'}">
        <div class="location-header">
          <div class="location-icon">${typeIcon}</div>
          <div class="location-info">
            <div class="location-name">${location.displayName}</div>
            <div class="location-path">${location.path}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" class="location-toggle" data-location-id="${location.id}" ${location.enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="location-details">
          <div class="detail-row">
            <span class="detail-label">Type:</span>
            <span class="detail-value">${location.type}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Priority:</span>
            <span class="detail-value">${location.priority}</span>
          </div>
          ${
            location.cloudProvider
              ? `
            <div class="detail-row">
              <span class="detail-label">Cloud:</span>
              <span class="detail-value cloud-badge" style="background: ${cloudColor}">${cloudIcon} ${location.cloudProvider}</span>
            </div>
          `
              : ''
          }
          ${
            location.lastTestedAt
              ? `
            <div class="detail-row">
              <span class="detail-label">Last Tested:</span>
              <span class="detail-value">${this.formatTimeAgo(location.lastTestedAt)}</span>
            </div>
          `
              : ''
          }
        </div>
        <div class="location-actions">
          <button class="btn-test-location" data-location-id="${location.id}">Test</button>
          <button class="btn-edit-location" data-location-id="${location.id}">Edit</button>
          <button class="btn-delete-location" data-location-id="${location.id}">Delete</button>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // HISTORY VIEW
  // ============================================================================

  private renderHistoryView(): string {
    const analytics = this.calculateAnalytics();

    return `
      <div class="history-view">
        <div class="analytics-summary">
          <div class="summary-card">
            <div class="summary-label">Total Recordings</div>
            <div class="summary-value">${analytics.totalRecordings}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Size</div>
            <div class="summary-value">${formatFileSize(analytics.totalSize)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Duration</div>
            <div class="summary-value">${formatDuration(analytics.totalDuration)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Successful Uploads</div>
            <div class="summary-value">${analytics.successfulUploads}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Failed Uploads</div>
            <div class="summary-value">${analytics.failedUploads}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Pending Uploads</div>
            <div class="summary-value">${analytics.pendingUploads ?? 0}</div>
          </div>
        </div>
        <div class="records-list">
          ${
            this.records.length === 0
              ? '<p class="empty-state">No recordings yet.</p>'
              : this.records.map((rec) => this.renderRecordCard(rec)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderRecordCard(record: BackupRecord): string {
    const statusColor = getRecordStatusColor(record.overallStatus);

    return `
      <div class="record-card" style="border-left: 4px solid ${statusColor}">
        <div class="record-header">
          <div class="record-info">
            <div class="record-name">${record.fileName}</div>
            <div class="record-meta">${this.formatTimeAgo(record.startTime)} • ${formatDuration(record.duration ?? 0)} • ${formatFileSize(record.fileSize ?? 0)}</div>
          </div>
          <div class="record-status" style="color: ${statusColor}">${record.overallStatus}</div>
        </div>
        <div class="record-locations">
          ${record.locations.map((loc) => this.renderLocationStatus(loc)).join('')}
        </div>
        ${record.error ? `<div class="record-error">Error: ${record.error}</div>` : ''}
      </div>
    `;
  }

  private renderLocationStatus(location: LocationStatus): string {
    const statusColor = getStatusColor(location.status);
    return `
      <div class="location-status">
        <span class="status-dot" style="background: ${statusColor}"></span>
        <span class="location-name">${location.locationDisplayName}</span>
        <span class="location-status-text">${location.status}</span>
      </div>
    `;
  }

  private calculateAnalytics(): {
    totalRecordings: number;
    totalSize: number;
    totalDuration: number;
    successfulUploads: number;
    failedUploads: number;
    pendingUploads: number;
  } {
    return {
      totalRecordings: this.records.length,
      totalSize: this.records.reduce((sum, r) => sum + (r.fileSize ?? 0), 0),
      totalDuration: this.records.reduce((sum, r) => sum + (r.duration ?? 0), 0),
      successfulUploads: this.records.reduce(
        (sum, r) => sum + r.locations.filter((l) => l.status === 'completed').length,
        0,
      ),
      failedUploads: this.records.reduce(
        (sum, r) => sum + r.locations.filter((l) => l.status === 'failed').length,
        0,
      ),
      pendingUploads: this.records.reduce(
        (sum, r) =>
          sum +
          r.locations.filter((l) => l.status === 'pending' || l.status === 'uploading').length,
        0,
      ),
    };
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private attachEventListeners(): void {
    if (!this.container) return;

    // View switcher
    this.container.querySelectorAll('.btn-view').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const view = target.dataset.view as ViewMode;
        if (view) {
          this.currentView = view;
          this.render();
        }
      });
    });

    // Stop recording
    const stopBtn = this.container.querySelector('.btn-stop-recording');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStopRecording());
    }

    // Configuration form
    const configForm = this.container.querySelector('#config-form');
    if (configForm) {
      configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveConfiguration();
      });
    }

    // Add location
    const addLocationBtn = this.container.querySelector('.btn-add-location');
    if (addLocationBtn) {
      addLocationBtn.addEventListener('click', () => this.showAddLocationModal());
    }

    // Location toggles
    this.container.querySelectorAll('.location-toggle').forEach((toggle) => {
      toggle.addEventListener('change', (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const locationId = target.dataset.locationId;
        if (locationId) {
          this.handleToggleLocation(locationId, target.checked);
        }
      });
    });

    // Location actions
    this.container.querySelectorAll('.btn-test-location').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const locationId = target.dataset.locationId;
        if (locationId) this.handleTestLocation();
      });
    });

    this.container.querySelectorAll('.btn-delete-location').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const locationId = target.dataset.locationId;
        if (locationId) this.handleDeleteLocation(locationId);
      });
    });
  }

  private async handleStopRecording(): Promise<void> {
    try {
      await autoBackupEngine.stopRecording();
      this.showNotification('Recording stopped', 'success');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.showNotification('Failed to stop recording', 'error');
    }
  }

  private async handleSaveConfiguration(): Promise<void> {
    const form = this.container?.querySelector('#config-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const config: BackupConfig = {
      enabled: formData.get('enabled') === 'on',
      autoStart: formData.get('autoStart') === 'on',
      splitInterval: formData.get('splitInterval') as 'none' | '30min' | '1hr' | '2hr',
      fileNamingPattern: formData.get('fileNamingPattern') as string,
      autoCloudUpload: formData.get('autoCloudUpload') === 'on',
      retryFailedUploads: formData.get('retryFailedUploads') === 'on',
      maxRetries: parseInt(formData.get('maxRetries') as string, 10),
      deleteLocalAfterUpload: formData.get('deleteLocalAfterUpload') === 'on',
    };

    try {
      await saveBackupConfig(config);
      await autoBackupEngine.updateConfig(config);
      this.config = config;
      this.showNotification('Configuration saved', 'success');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.showNotification('Failed to save configuration', 'error');
    }
  }

  private showAddLocationModal(): void {
    // TODO: Implement modal
    this.showNotification('Add location modal - not yet implemented', 'info');
  }

  private async handleToggleLocation(locationId: string, enabled: boolean): Promise<void> {
    const location = this.locations.find((loc) => loc.id === locationId);
    if (!location) return;

    location.enabled = enabled;
    try {
      await saveBackupLocation(location);
      this.showNotification(`Location ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle location:', error);
      this.showNotification('Failed to toggle location', 'error');
    }
  }

  private async handleTestLocation(): Promise<void> {
    // locationId parameter removed as it's not yet used in implementation
    this.showNotification('Testing location - not yet implemented', 'info');
  }

  private async handleDeleteLocation(locationId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await deleteBackupLocation(locationId);
      this.locations = this.locations.filter((loc) => loc.id !== locationId);
      this.render();
      this.showNotification('Location deleted', 'success');
    } catch (error) {
      console.error('Failed to delete location:', error);
      this.showNotification('Failed to delete location', 'error');
    }
  }

  private handleUploadProgress(event: UploadProgressEvent): void {
    // TODO: Update progress bars in real-time
    console.log('Upload progress:', event);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
