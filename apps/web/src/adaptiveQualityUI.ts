/**
 * Adaptive Quality UI
 * User interface for network monitoring and quality management
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  AdaptiveQualityState,
  QualityAdjustment,
  AdaptiveQualityConfig,
  QualityPreset,
  NetworkMetrics,
} from './adaptiveQualityTypes.js';
import {
  DEFAULT_QUALITY_PRESETS,
  formatBandwidth,
  formatLatency,
  getNetworkQualityColor,
  getNetworkQualityEmoji,
  getAdjustmentDirectionEmoji,
} from './adaptiveQualityTypes.js';
import { adaptiveQualityEngine } from './adaptiveQualityEngine.js';
import { calculateAnalytics } from './adaptiveQualityStorage.js';

export class AdaptiveQualityUI {
  private container: HTMLElement;
  private obsController: OBSController | null = null;
  private currentState: AdaptiveQualityState | null = null;
  private currentView: 'status' | 'settings' | 'history' = 'status';

  private stateUnsubscribe: (() => void) | null = null;
  private adjustmentUnsubscribe: (() => void) | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = container;
    this.initialize();
  }

  /**
   * Set OBS controller
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
    adaptiveQualityEngine.setOBSController(obs);
  }

  /**
   * Initialize UI
   */
  private initialize(): void {
    this.render();

    // Subscribe to state changes
    this.stateUnsubscribe = adaptiveQualityEngine.onStateChange((state) => {
      this.currentState = state;
      this.renderStatusView();
    });

    // Subscribe to adjustments
    this.adjustmentUnsubscribe = adaptiveQualityEngine.onAdjustment((adjustment) => {
      this.showNotification(
        `Quality adjusted: ${adjustment.fromPreset} → ${adjustment.toPreset}`,
        adjustment.success ? 'success' : 'error'
      );
      this.renderStatusView();
    });

    // Initial state
    this.currentState = adaptiveQualityEngine.getState();
  }

  /**
   * Render main UI
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="adaptive-quality">
        <div class="adaptive-quality-header">
          <h2>📊 Adaptive Quality</h2>
          <div class="header-actions">
            <button class="btn-view" data-view="status">Status</button>
            <button class="btn-view" data-view="settings">Settings</button>
            <button class="btn-view" data-view="history">History</button>
            <button class="btn-toggle-monitoring">Start Monitoring</button>
          </div>
        </div>
        <div class="adaptive-quality-content"></div>
      </div>
    `;

    this.attachEventListeners();
    this.renderStatusView();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // View toggle buttons
    this.container.querySelectorAll('.btn-view').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = (e.target as HTMLElement).dataset.view as 'status' | 'settings' | 'history';
        this.switchView(view);
      });
    });

    // Toggle monitoring button
    const toggleBtn = this.container.querySelector('.btn-toggle-monitoring');
    toggleBtn?.addEventListener('click', () => this.toggleMonitoring());
  }

  /**
   * Switch view
   */
  private switchView(view: 'status' | 'settings' | 'history'): void {
    this.currentView = view;

    // Update active button
    this.container.querySelectorAll('.btn-view').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.view === view);
    });

    // Render appropriate view
    if (view === 'status') {
      this.renderStatusView();
    } else if (view === 'settings') {
      this.renderSettingsView();
    } else if (view === 'history') {
      this.renderHistoryView();
    }
  }

  /**
   * Render status view
   */
  private renderStatusView(): void {
    const content = this.container.querySelector('.adaptive-quality-content');
    if (!content) return;

    const state = this.currentState || adaptiveQualityEngine.getState();
    const config = adaptiveQualityEngine.getConfig();
    const metrics = state.latestMetrics;
    const currentPresetConfig = DEFAULT_QUALITY_PRESETS[state.currentPreset];

    // Update toggle button text
    const toggleBtn = this.container.querySelector('.btn-toggle-monitoring');
    if (toggleBtn) {
      const isMonitoring = state.state === 'monitoring';
      toggleBtn.textContent = isMonitoring ? 'Stop Monitoring' : 'Start Monitoring';
      toggleBtn.classList.toggle('active', isMonitoring);
    }

    content.innerHTML = `
      <div class="status-grid">
        <!-- Current Quality Status -->
        <div class="status-card">
          <h3>Network Quality</h3>
          ${
            metrics
              ? `
            <div class="quality-indicator" style="background: ${getNetworkQualityColor(metrics.quality)}">
              ${getNetworkQualityEmoji(metrics.quality)} ${metrics.quality.toUpperCase()}
            </div>
            <div class="metrics-list">
              <div class="metric-item">
                <span class="metric-label">Bandwidth:</span>
                <span class="metric-value">${formatBandwidth(metrics.bandwidthKbps)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Latency:</span>
                <span class="metric-value">${formatLatency(metrics.latencyMs)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Packet Loss:</span>
                <span class="metric-value">${metrics.packetLoss.toFixed(1)}%</span>
              </div>
              ${
                metrics.jitterMs
                  ? `
                <div class="metric-item">
                  <span class="metric-label">Jitter:</span>
                  <span class="metric-value">${metrics.jitterMs.toFixed(1)}ms</span>
                </div>
              `
                  : ''
              }
            </div>
          `
              : '<div class="no-metrics">No metrics available. Start monitoring to begin.</div>'
          }
        </div>

        <!-- Current Preset -->
        <div class="status-card">
          <h3>Current Quality Preset</h3>
          <div class="preset-display">
            <div class="preset-badge preset-${state.currentPreset}">
              ${currentPresetConfig.name}
            </div>
            <div class="preset-details">
              <div class="detail-row">
                <span>Resolution:</span>
                <span>${state.currentSettings.width}x${state.currentSettings.height} @ ${state.currentSettings.fps}fps</span>
              </div>
              <div class="detail-row">
                <span>Bitrate:</span>
                <span>${state.currentSettings.videoBitrateKbps} Kbps</span>
              </div>
              <div class="detail-row">
                <span>Encoder:</span>
                <span>${state.currentSettings.encoderPreset || 'Default'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Manual Preset Selector -->
        <div class="status-card">
          <h3>Manual Preset Override</h3>
          <div class="preset-selector">
            ${Object.entries(DEFAULT_QUALITY_PRESETS).map(
              ([preset, config]) => `
              <button
                class="btn-preset ${state.currentPreset === preset ? 'active' : ''}"
                data-preset="${preset}"
                ${state.state === 'stopped' ? 'disabled' : ''}
              >
                <div class="preset-name">${config.name}</div>
                <div class="preset-info">${config.video.width}x${config.video.height} @ ${config.video.videoBitrateKbps}Kbps</div>
              </button>
            `
            ).join('')}
          </div>
          <p class="help-text">Click a preset to manually override automatic adjustments</p>
        </div>

        <!-- Adaptation Status -->
        <div class="status-card">
          <h3>Adaptation Status</h3>
          <div class="adaptation-status">
            <div class="status-row">
              <span class="status-label">State:</span>
              <span class="status-value status-${state.state}">${state.state}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Strategy:</span>
              <span class="status-value">${config.strategy}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Auto-Recovery:</span>
              <span class="status-value">${config.autoRecovery ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Consecutive Poor:</span>
              <span class="status-value">${state.consecutivePoorCount} / ${config.poorMeasurementsThreshold}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Consecutive Good:</span>
              <span class="status-value">${state.consecutiveGoodCount} / ${config.goodMeasurementsThreshold}</span>
            </div>
            ${
              state.lastAdjustment
                ? `
              <div class="status-row">
                <span class="status-label">Last Adjustment:</span>
                <span class="status-value">${this.timeAgo(state.lastAdjustment)}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;

    // Attach preset button listeners
    content.querySelectorAll('.btn-preset').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const preset = (e.currentTarget as HTMLElement).dataset.preset as QualityPreset;
        await this.setPreset(preset);
      });
    });
  }

  /**
   * Render settings view
   */
  private async renderSettingsView(): Promise<void> {
    const content = this.container.querySelector('.adaptive-quality-content');
    if (!content) return;

    const config = adaptiveQualityEngine.getConfig();

    content.innerHTML = `
      <div class="settings-panel">
        <h3>Adaptive Quality Settings</h3>

        <div class="form-group">
          <label>
            <input type="checkbox" id="enabled" ${config.enabled ? 'checked' : ''}>
            Enable Adaptive Quality
          </label>
          <p class="help-text">Automatically adjust stream quality based on network conditions</p>
        </div>

        <div class="form-group">
          <label for="strategy">Adaptation Strategy:</label>
          <select id="strategy">
            <option value="conservative" ${config.strategy === 'conservative' ? 'selected' : ''}>Conservative (fewer changes)</option>
            <option value="balanced" ${config.strategy === 'balanced' ? 'selected' : ''}>Balanced (default)</option>
            <option value="aggressive" ${config.strategy === 'aggressive' ? 'selected' : ''}>Aggressive (faster response)</option>
          </select>
          <p class="help-text">How quickly to respond to network changes</p>
        </div>

        <div class="form-group">
          <label for="startingPreset">Starting Preset:</label>
          <select id="startingPreset">
            ${Object.entries(DEFAULT_QUALITY_PRESETS).map(
              ([preset, presetConfig]) => `
              <option value="${preset}" ${config.startingPreset === preset ? 'selected' : ''}>
                ${presetConfig.name}
              </option>
            `
            ).join('')}
          </select>
          <p class="help-text">Quality preset to use when starting stream</p>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="autoRecovery" ${config.autoRecovery ? 'checked' : ''}>
            Enable Auto-Recovery
          </label>
          <p class="help-text">Automatically increase quality when network conditions improve</p>
        </div>

        <div class="form-group">
          <label for="monitoringInterval">Monitoring Interval:</label>
          <input type="number" id="monitoringInterval" value="${config.monitoringIntervalMs / 1000}" min="1" max="60" step="1">
          <span class="unit">seconds</span>
          <p class="help-text">How often to check network conditions</p>
        </div>

        <div class="form-group">
          <label for="minAdjustmentInterval">Minimum Adjustment Interval:</label>
          <input type="number" id="minAdjustmentInterval" value="${config.minAdjustmentIntervalMs / 1000}" min="10" max="300" step="5">
          <span class="unit">seconds</span>
          <p class="help-text">Minimum time between quality changes</p>
        </div>

        <h4>Network Thresholds</h4>

        <div class="form-group">
          <label for="excellentBandwidth">Excellent Bandwidth:</label>
          <input type="number" id="excellentBandwidth" value="${config.thresholds.excellentBandwidthKbps}" min="1000" max="10000" step="100">
          <span class="unit">Kbps</span>
        </div>

        <div class="form-group">
          <label for="goodBandwidth">Good Bandwidth:</label>
          <input type="number" id="goodBandwidth" value="${config.thresholds.goodBandwidthKbps}" min="500" max="10000" step="100">
          <span class="unit">Kbps</span>
        </div>

        <div class="form-group">
          <label for="fairBandwidth">Fair Bandwidth:</label>
          <input type="number" id="fairBandwidth" value="${config.thresholds.fairBandwidthKbps}" min="500" max="5000" step="100">
          <span class="unit">Kbps</span>
        </div>

        <div class="form-group">
          <label for="maxLatency">Max Latency:</label>
          <input type="number" id="maxLatency" value="${config.thresholds.maxLatencyMs}" min="50" max="500" step="10">
          <span class="unit">ms</span>
        </div>

        <div class="form-group">
          <label for="maxPacketLoss">Max Packet Loss:</label>
          <input type="number" id="maxPacketLoss" value="${config.thresholds.maxPacketLoss}" min="0" max="10" step="0.1">
          <span class="unit">%</span>
        </div>

        <div class="settings-actions">
          <button class="btn-save-settings">Save Settings</button>
          <button class="btn-reset-settings">Reset to Defaults</button>
        </div>
      </div>
    `;

    // Attach event listeners
    const saveBtn = content.querySelector('.btn-save-settings');
    saveBtn?.addEventListener('click', () => this.saveSettings());

    const resetBtn = content.querySelector('.btn-reset-settings');
    resetBtn?.addEventListener('click', () => this.resetSettings());
  }

  /**
   * Render history view
   */
  private async renderHistoryView(): Promise<void> {
    const content = this.container.querySelector('.adaptive-quality-content');
    if (!content) return;

    try {
      const analytics = await calculateAnalytics(24);

      content.innerHTML = `
        <div class="history-panel">
          <h3>Quality Adjustment History</h3>

          <!-- Analytics Summary -->
          <div class="analytics-summary">
            <div class="summary-card">
              <div class="summary-value">${analytics.totalAdjustments}</div>
              <div class="summary-label">Total Adjustments</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${analytics.successfulAdjustments}</div>
              <div class="summary-label">Successful</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${analytics.failedAdjustments}</div>
              <div class="summary-label">Failed</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${analytics.network.avgBandwidthKbps.toFixed(0)} Kbps</div>
              <div class="summary-label">Avg Bandwidth</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${analytics.network.avgLatencyMs.toFixed(0)} ms</div>
              <div class="summary-label">Avg Latency</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${analytics.stability.optimalTimePercentage.toFixed(1)}%</div>
              <div class="summary-label">Optimal Time</div>
            </div>
          </div>

          <!-- Recent Adjustments -->
          <h4>Recent Adjustments</h4>
          <div class="adjustments-list">
            ${
              analytics.recentAdjustments.length > 0
                ? analytics.recentAdjustments
                    .map(
                      (adj) => `
                <div class="adjustment-row ${adj.success ? 'success' : 'failed'}">
                  <div class="adjustment-time">${this.timeAgo(adj.timestamp)}</div>
                  <div class="adjustment-change">
                    ${getAdjustmentDirectionEmoji(adj.direction)}
                    <span class="preset-badge preset-${adj.fromPreset}">${adj.fromPreset}</span>
                    →
                    <span class="preset-badge preset-${adj.toPreset}">${adj.toPreset}</span>
                  </div>
                  <div class="adjustment-reason">${adj.reason.replace(/-/g, ' ')}</div>
                  <div class="adjustment-metrics">
                    ${formatBandwidth(adj.networkMetrics.bandwidthKbps)} | ${formatLatency(adj.networkMetrics.latencyMs)} | ${adj.networkMetrics.packetLoss.toFixed(1)}% loss
                  </div>
                  ${adj.error ? `<div class="adjustment-error">Error: ${adj.error}</div>` : ''}
                </div>
              `
                    )
                    .join('')
                : '<div class="empty-state">No adjustment history available</div>'
            }
          </div>
        </div>
      `;
    } catch (error) {
      content.innerHTML = '<div class="error-state">Failed to load analytics</div>';
      console.error('Error loading analytics:', error);
    }
  }

  /**
   * Toggle monitoring
   */
  private toggleMonitoring(): void {
    const isMonitoring = adaptiveQualityEngine.isMonitoring();

    if (isMonitoring) {
      adaptiveQualityEngine.stop();
      this.showNotification('Monitoring stopped', 'info');
    } else {
      adaptiveQualityEngine.start();
      this.showNotification('Monitoring started', 'success');
    }

    this.renderStatusView();
  }

  /**
   * Set quality preset manually
   */
  private async setPreset(preset: QualityPreset): Promise<void> {
    try {
      const success = await adaptiveQualityEngine.setPreset(preset);
      if (success) {
        this.showNotification(`Switched to ${DEFAULT_QUALITY_PRESETS[preset].name} quality`, 'success');
        this.renderStatusView();
      } else {
        this.showNotification('Failed to change quality preset', 'error');
      }
    } catch (error) {
      this.showNotification('Error changing quality preset', 'error');
      console.error('Error setting preset:', error);
    }
  }

  /**
   * Save settings
   */
  private async saveSettings(): Promise<void> {
    const content = this.container.querySelector('.adaptive-quality-content');
    if (!content) return;

    try {
      const config: Partial<AdaptiveQualityConfig> = {
        enabled: (content.querySelector('#enabled') as HTMLInputElement).checked,
        strategy: (content.querySelector('#strategy') as HTMLSelectElement).value as any,
        startingPreset: (content.querySelector('#startingPreset') as HTMLSelectElement).value as QualityPreset,
        autoRecovery: (content.querySelector('#autoRecovery') as HTMLInputElement).checked,
        monitoringIntervalMs: parseInt((content.querySelector('#monitoringInterval') as HTMLInputElement).value) * 1000,
        minAdjustmentIntervalMs: parseInt((content.querySelector('#minAdjustmentInterval') as HTMLInputElement).value) * 1000,
        thresholds: {
          excellentBandwidthKbps: parseInt((content.querySelector('#excellentBandwidth') as HTMLInputElement).value),
          goodBandwidthKbps: parseInt((content.querySelector('#goodBandwidth') as HTMLInputElement).value),
          fairBandwidthKbps: parseInt((content.querySelector('#fairBandwidth') as HTMLInputElement).value),
          maxLatencyMs: parseInt((content.querySelector('#maxLatency') as HTMLInputElement).value),
          maxPacketLoss: parseFloat((content.querySelector('#maxPacketLoss') as HTMLInputElement).value),
        },
      };

      await adaptiveQualityEngine.updateConfig(config);
      this.showNotification('Settings saved successfully', 'success');
      this.switchView('status');
    } catch (error) {
      this.showNotification('Failed to save settings', 'error');
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  private async resetSettings(): Promise<void> {
    if (confirm('Reset all settings to defaults?')) {
      await this.renderSettingsView();
      this.showNotification('Settings reset to defaults (not saved)', 'info');
    }
  }

  /**
   * Time ago helper
   */
  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
    }
    if (this.adjustmentUnsubscribe) {
      this.adjustmentUnsubscribe();
    }
  }
}
