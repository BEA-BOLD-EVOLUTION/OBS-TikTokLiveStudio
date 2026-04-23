/**
 * Audio Ducking UI Component
 *
 * User interface for voice activity detection and automatic music ducking.
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type { OBSAudioSource, DuckingEvent, AudioDuckingState } from './audioDuckingTypes.js';
import {
  generateSourceId,
  getStateColor,
  getStateEmoji,
  formatFrequency,
  formatDuration,
  SOURCE_COLORS,
} from './audioDuckingTypes.js';
import { audioDuckingEngine } from './audioDuckingEngine.js';
import {
  calculateAnalytics,
  getRecentEvents,
  saveAudioSource,
  deleteAudioSource,
  saveVADConfig,
  saveDuckingConfig,
} from './audioDuckingStorage.js';

/**
 * Audio Ducking UI Class
 */
export class AudioDuckingUI {
  private container: HTMLElement | null = null;
  private currentView: 'status' | 'sources' | 'history' = 'status';
  private obsController: OBSController | null = null;
  private state: AudioDuckingState | null = null;
  private refreshInterval: number | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element '${containerId}' not found`);
    }

    this.container = container;
    this.initialize();
  }

  /**
   * Set OBS controller
   */
  setOBSController(obs: OBSController | null): void {
    this.obsController = obs;
    console.log('OBS controller set for Audio Ducking UI');
    audioDuckingEngine.setOBSController(obs);
  }

  /**
   * Initialize UI
   */
  private async initialize(): Promise<void> {
    // Subscribe to engine events
    audioDuckingEngine.onStateChange((state) => {
      this.state = state;
      this.render();
    });

    audioDuckingEngine.onEvent((event) => {
      this.handleDuckingEvent(event);
    });

    // Get initial state
    this.state = audioDuckingEngine.getState();

    // Render UI
    this.render();

    // Auto-refresh every 10 seconds
    this.refreshInterval = window.setInterval(() => {
      if (this.currentView === 'history') {
        this.render();
      }
    }, 10000);
  }

  /**
   * Handle ducking event
   */
  private handleDuckingEvent(event: DuckingEvent): void {
    if (event.type === 'duck-started') {
      this.showNotification('Music ducked', 'success');
    } else if (event.type === 'duck-released') {
      this.showNotification('Music restored', 'info');
    } else if (!event.success && event.error) {
      this.showNotification(event.error, 'error');
    }

    // Refresh history view
    if (this.currentView === 'history') {
      this.render();
    }
  }

  /**
   * Render UI
   */
  private render(): void {
    if (!this.container || !this.state) return;

    this.container.innerHTML = `
      <div class="audio-ducking">
        <div class="audio-ducking-header">
          <h2>🎙️ Audio Ducking</h2>
          <div class="header-actions">
            <button class="btn-view ${this.currentView === 'status' ? 'active' : ''}" data-view="status">
              Status
            </button>
            <button class="btn-view ${this.currentView === 'sources' ? 'active' : ''}" data-view="sources">
              Sources
            </button>
            <button class="btn-view ${this.currentView === 'history' ? 'active' : ''}" data-view="history">
              History
            </button>
            <button class="btn-toggle-monitoring ${this.state.isMonitoring ? 'active' : ''}">
              ${this.state.isMonitoring ? '⏸️ Stop' : '▶️ Start'} Monitoring
            </button>
          </div>
        </div>
        <div class="audio-ducking-body">
          ${this.renderView()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render current view
   */
  private renderView(): string {
    switch (this.currentView) {
      case 'status':
        return this.renderStatusView();
      case 'sources':
        return this.renderSourcesView();
      case 'history':
        return this.renderHistoryView();
      default:
        return '';
    }
  }

  /**
   * Render status view
   */
  private renderStatusView(): string {
    if (!this.state) return '';

    const { voiceActivity, state, vadConfig, duckingConfig } = this.state;
    const enabledSources = this.state.audioSources.filter((s) => s.enabled);

    return `
      <div class="status-view">
        <div class="status-grid">
          <div class="level-meter-container">
            <h3>Voice Level</h3>
            <div class="level-meter">
              <div class="level-bar" style="height: ${voiceActivity.audioLevel}%; background: linear-gradient(180deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)"></div>
            </div>
            <div class="level-value">${voiceActivity.audioLevel}%</div>
          </div>

          <div class="voice-activity-panel">
            <h3>Voice Activity</h3>
            <div class="voice-activity-indicator ${voiceActivity.isVoiceDetected ? 'active' : ''}">
              <span class="indicator-dot"></span>
              ${voiceActivity.isVoiceDetected ? 'Voice Detected' : 'No Voice'}
            </div>
            <div class="voice-metrics">
              <div class="metric-row">
                <span class="metric-label">Dominant Frequency:</span>
                <span class="metric-value">${formatFrequency(voiceActivity.dominantFrequency)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Confidence:</span>
                <span class="metric-value">${voiceActivity.confidence}%</span>
              </div>
              ${
                voiceActivity.voiceDuration !== null
                  ? `
                <div class="metric-row">
                  <span class="metric-label">Voice Duration:</span>
                  <span class="metric-value">${formatDuration(voiceActivity.voiceDuration)}</span>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <div class="ducking-status-panel">
            <h3>Ducking Status</h3>
            <div class="state-badge" style="color: ${getStateColor(state)}">
              ${getStateEmoji(state)} ${state.replace('-', ' ').toUpperCase()}
            </div>
            <div class="enabled-sources">
              <p><strong>${enabledSources.length}</strong> source${enabledSources.length !== 1 ? 's' : ''} enabled</p>
              ${enabledSources
                .map(
                  (s) => `
                <div class="source-item" style="border-left-color: ${s.color}">
                  ${s.displayName}
                  ${state === 'ducking' && s.currentVolume < s.originalVolume ? ' 🔉' : ''}
                </div>
              `,
                )
                .join('')}
            </div>
          </div>

          <div class="settings-quick-panel">
            <h3>Quick Settings</h3>
            <div class="setting-row">
              <label for="sensitivity-slider">Sensitivity:</label>
              <input type="range" id="sensitivity-slider" min="0" max="100" value="${vadConfig.sensitivity}" />
              <span class="setting-value">${vadConfig.sensitivity}%</span>
            </div>
            <div class="setting-row">
              <label for="duck-amount-slider">Duck Amount:</label>
              <input type="range" id="duck-amount-slider" min="0" max="100" value="${duckingConfig.duckAmount}" />
              <span class="setting-value">${duckingConfig.duckAmount}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render sources view
   */
  private renderSourcesView(): string {
    if (!this.state) return '';

    return `
      <div class="sources-view">
        <div class="sources-header">
          <h3>Audio Sources</h3>
          <button class="btn-add-source">+ Add Source</button>
        </div>
        <div class="sources-grid">
          ${this.state.audioSources
            .map(
              (source) => `
            <div class="source-card" data-source-id="${source.id}">
              <div class="source-header">
                <div class="source-info">
                  <div class="source-color-indicator" style="background-color: ${source.color}"></div>
                  <div>
                    <div class="source-name">${source.displayName}</div>
                    <div class="source-obs-name">${source.sourceName}</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="source-enabled-toggle" ${source.enabled ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="volume-controls">
                <div class="volume-row">
                  <span class="volume-label">Original Volume:</span>
                  <span class="volume-value">${source.originalVolume}%</span>
                </div>
                <div class="volume-row">
                  <span class="volume-label">Current Volume:</span>
                  <span class="volume-value" style="color: ${source.currentVolume < source.originalVolume ? '#f59e0b' : '#10b981'}">${source.currentVolume}%</span>
                </div>
                <div class="volume-bar">
                  <div class="volume-fill" style="width: ${(source.currentVolume / 100) * 100}%; background-color: ${source.color}"></div>
                </div>
              </div>
              <div class="custom-duck-control">
                <label for="custom-duck-${source.id}">Custom Duck Amount:</label>
                <input type="number" id="custom-duck-${source.id}" class="custom-duck-input" min="0" max="100" 
                  value="${source.customDuckAmount ?? ''}" placeholder="Default" />
                <span class="duck-hint">%</span>
              </div>
              <button class="btn-remove-source" data-source-id="${source.id}">Delete</button>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render history view
   */
  private renderHistoryView(): string {
    return `
      <div class="history-view">
        <div class="analytics-loading">Loading analytics...</div>
      </div>
    `;
  }

  /**
   * Render history view async (loads data)
   */
  private async renderHistoryViewAsync(): Promise<void> {
    const analytics = await calculateAnalytics(24);
    const recentEvents = await getRecentEvents(20);

    const historyContainer = this.container?.querySelector('.history-view');
    if (!historyContainer) return;

    historyContainer.innerHTML = `
      <div class="analytics-summary">
        <div class="summary-card">
          <div class="summary-value">${analytics.totalEvents}</div>
          <div class="summary-label">Total Events</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${analytics.successfulDucks}</div>
          <div class="summary-label">Successful Ducks</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${analytics.failedDucks}</div>
          <div class="summary-label">Failed Ducks</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${analytics.effectiveness}%</div>
          <div class="summary-label">Effectiveness</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${formatDuration(analytics.avgVoiceDuration)}</div>
          <div class="summary-label">Avg Voice Duration</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${formatDuration(analytics.avgDuckDuration)}</div>
          <div class="summary-label">Avg Duck Duration</div>
        </div>
      </div>

      <div class="time-distribution">
        <h3>Time of Day Distribution</h3>
        ${Object.entries(analytics.timeOfDayDistribution)
          .map(
            ([time, count]) => `
          <div class="distribution-item">
            <span class="distribution-label">${time}:</span>
            <div class="distribution-bar-container">
              <div class="distribution-bar" style="width: ${(count / analytics.totalEvents) * 100}%"></div>
            </div>
            <span class="distribution-value">${count}</span>
          </div>
        `,
          )
          .join('')}
      </div>

      <div class="events-list">
        <h3>Recent Events</h3>
        ${
          recentEvents.length === 0
            ? `
          <div class="empty-state">No ducking events yet</div>
        `
            : recentEvents
                .map(
                  (event) => `
          <div class="event-row ${event.success ? 'success' : 'failed'}">
            <div class="event-time">${this.timeAgo(event.timestamp)}</div>
            <div class="event-type">${event.type.replace(/-/g, ' ')}</div>
            <div class="event-sources">${event.affectedSources.length} source(s)</div>
            ${event.duckAmount !== undefined ? `<div class="event-duck">${event.duckAmount}% duck</div>` : ''}
            ${event.error ? `<div class="event-error">${event.error}</div>` : ''}
          </div>
        `,
                )
                .join('')
        }
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // View toggle buttons
    this.container?.querySelectorAll('.btn-view').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const view = target.dataset.view as 'status' | 'sources' | 'history';
        if (view) {
          this.currentView = view;
          this.render();
          if (view === 'history') {
            this.renderHistoryViewAsync();
          }
        }
      });
    });

    // Monitoring toggle
    const monitoringBtn = this.container?.querySelector('.btn-toggle-monitoring');
    monitoringBtn?.addEventListener('click', () => {
      this.toggleMonitoring();
    });

    // Sensitivity slider
    const sensitivitySlider = this.container?.querySelector(
      '#sensitivity-slider',
    ) as HTMLInputElement;
    sensitivitySlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.updateSensitivity(value);
    });

    // Duck amount slider
    const duckAmountSlider = this.container?.querySelector(
      '#duck-amount-slider',
    ) as HTMLInputElement;
    duckAmountSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.updateDuckAmount(value);
    });

    // Add source button
    const addSourceBtn = this.container?.querySelector('.btn-add-source');
    addSourceBtn?.addEventListener('click', () => {
      this.openAddSourceModal();
    });

    // Remove source buttons
    this.container?.querySelectorAll('.btn-remove-source').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const sourceId = (e.target as HTMLElement).dataset.sourceId;
        if (sourceId) {
          this.removeSource(sourceId);
        }
      });
    });

    // Source enabled toggles
    this.container?.querySelectorAll('.source-enabled-toggle').forEach((toggle) => {
      toggle.addEventListener('change', (e) => {
        const card = (e.target as HTMLElement).closest('.source-card');
        const sourceId = card?.getAttribute('data-source-id');
        if (sourceId) {
          this.toggleSourceEnabled(sourceId, (e.target as HTMLInputElement).checked);
        }
      });
    });

    // Custom duck inputs
    this.container?.querySelectorAll('.custom-duck-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const sourceId = (e.target as HTMLInputElement).id.replace('custom-duck-', '');
        const value = (e.target as HTMLInputElement).value;
        this.setCustomDuckAmount(sourceId, value ? parseInt(value) : null);
      });
    });
  }

  /**
   * Toggle monitoring
   */
  private async toggleMonitoring(): Promise<void> {
    if (this.state?.isMonitoring) {
      await audioDuckingEngine.stop();
      this.showNotification('Monitoring stopped', 'info');
    } else {
      await audioDuckingEngine.start();
      this.showNotification('Monitoring started', 'success');
    }
  }

  /**
   * Update sensitivity
   */
  private async updateSensitivity(value: number): Promise<void> {
    await audioDuckingEngine.updateVADConfig({ sensitivity: value });
    await saveVADConfig(this.state!.vadConfig);
    this.render();
  }

  /**
   * Update duck amount
   */
  private async updateDuckAmount(value: number): Promise<void> {
    await audioDuckingEngine.updateDuckingConfig({ duckAmount: value });
    await saveDuckingConfig(this.state!.duckingConfig);
    this.render();
  }

  /**
   * Open add source modal
   */
  private openAddSourceModal(): void {
    const modal = document.createElement('div');
    modal.className = 'source-modal-backdrop';
    modal.innerHTML = `
      <div class="source-modal">
        <div class="modal-header">
          <h3>Add Audio Source</h3>
          <button class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="source-name">OBS Source Name:</label>
            <input type="text" id="source-name" placeholder="e.g., Music" />
          </div>
          <div class="form-group">
            <label for="display-name">Display Name:</label>
            <input type="text" id="display-name" placeholder="e.g., Background Music" />
          </div>
          <div class="form-group">
            <label for="original-volume">Original Volume (%):</label>
            <input type="number" id="original-volume" min="0" max="100" value="100" />
          </div>
          <div class="form-group">
            <label>Color:</label>
            <div class="color-picker">
              ${SOURCE_COLORS.map(
                (color) => `
                <div class="color-option" data-color="${color}" style="background-color: ${color}"></div>
              `,
              ).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-save-source">Add Source</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let selectedColor = SOURCE_COLORS[0];

    // Color picker
    modal.querySelectorAll('.color-option').forEach((option) => {
      option.addEventListener('click', (e) => {
        modal.querySelectorAll('.color-option').forEach((opt) => opt.classList.remove('selected'));
        (e.target as HTMLElement).classList.add('selected');
        selectedColor = (e.target as HTMLElement).dataset.color!;
      });
    });

    // Select first color by default
    modal.querySelector('.color-option')?.classList.add('selected');

    // Close button
    modal.querySelector('.btn-close-modal')?.addEventListener('click', () => {
      modal.remove();
    });

    // Cancel button
    modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
      modal.remove();
    });

    // Save button
    modal.querySelector('.btn-save-source')?.addEventListener('click', async () => {
      const sourceNameInput = modal.querySelector('#source-name') as HTMLInputElement;
      const displayNameInput = modal.querySelector('#display-name') as HTMLInputElement;
      const originalVolumeInput = modal.querySelector('#original-volume') as HTMLInputElement;

      const sourceName = sourceNameInput.value.trim();
      const displayName = displayNameInput.value.trim() || sourceName;
      const originalVolume = parseInt(originalVolumeInput.value);

      if (!sourceName) {
        this.showNotification('Source name is required', 'error');
        return;
      }

      const newSource: OBSAudioSource = {
        id: generateSourceId(),
        sourceName,
        displayName,
        enabled: true,
        originalVolume,
        currentVolume: originalVolume,
        color: selectedColor,
        customDuckAmount: null,
        lastDucked: null,
      };

      await audioDuckingEngine.addAudioSource(newSource);
      this.showNotification(`Added source: ${displayName}`, 'success');
      modal.remove();
      this.render();
    });
  }

  /**
   * Remove source
   */
  private async removeSource(sourceId: string): Promise<void> {
    const source = this.state?.audioSources.find((s) => s.id === sourceId);
    if (!source) return;

    if (confirm(`Remove source "${source.displayName}"?`)) {
      await audioDuckingEngine.removeAudioSource(sourceId);
      await deleteAudioSource(sourceId);
      this.showNotification(`Removed source: ${source.displayName}`, 'info');
      this.render();
    }
  }

  /**
   * Toggle source enabled
   */
  private async toggleSourceEnabled(sourceId: string, enabled: boolean): Promise<void> {
    const source = this.state?.audioSources.find((s) => s.id === sourceId);
    if (!source) return;

    source.enabled = enabled;
    await saveAudioSource(source);
    await audioDuckingEngine.addAudioSource(source);
  }

  /**
   * Set custom duck amount
   */
  private async setCustomDuckAmount(sourceId: string, amount: number | null): Promise<void> {
    const source = this.state?.audioSources.find((s) => s.id === sourceId);
    if (!source) return;

    source.customDuckAmount = amount;
    await saveAudioSource(source);
    await audioDuckingEngine.addAudioSource(source);
  }

  /**
   * Time ago helper
   */
  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Show notification
   */
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

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
    }
  }
}
