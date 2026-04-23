/**
 * Scene Recommendation UI - Display recommendations and analytics
 */

import type {
  SceneRecommendation,
  RecommendationUIState,
  SceneAnalytics,
} from './sceneRecommendationTypes.js';
import { formatDuration } from './sceneRecommendationTypes.js';
import { recommendationEngine } from './sceneRecommendationEngine.js';
import { calculateAnalytics, getConfig, saveConfig } from './sceneRecommendationStorage.js';
import type { OBSController } from '@obs-tiktok/obs-controller';

export class SceneRecommendationUI {
  private container: HTMLElement;
  private obsController: OBSController | null = null;
  private currentScene: string = '';
  private state: RecommendationUIState = {
    showRecommendations: true,
    showAnalytics: false,
    currentRecommendations: [],
    analytics: null,
    isAnalyzing: false,
  };

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = container;
    this.initialize();
  }

  /**
   * Set OBS controller
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
    
    // Subscribe to scene changes
    if (obs.connection.on) {
      obs.connection.on('CurrentProgramSceneChanged', (data: { sceneName: string }) => {
        this.currentScene = data.sceneName;
        this.updateRecommendations();
      });
    }
  }

  /**
   * Initialize UI
   */
  private async initialize(): Promise<void> {
    await this.loadConfig();
    await this.updateRecommendations();
    await this.loadAnalytics();
    this.render();
  }

  /**
   * Load configuration
   */
  private async loadConfig(): Promise<void> {
    const config = await getConfig();
    recommendationEngine.setConfig(config);
  }

  /**
   * Update recommendations
   */
  private async updateRecommendations(): Promise<void> {
    if (this.state.isAnalyzing) return;

    this.state.isAnalyzing = true;
    this.render();

    try {
      const recommendations = await recommendationEngine.getRecommendations(
        this.currentScene
      );
      this.state.currentRecommendations = recommendations;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      this.state.isAnalyzing = false;
      this.render();
    }
  }

  /**
   * Load analytics
   */
  private async loadAnalytics(): Promise<void> {
    try {
      const analytics = await calculateAnalytics();
      this.state.analytics = analytics;
      this.render();
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  /**
   * Render UI
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="scene-recommendations">
        <div class="recommendations-header">
          <h3>🎯 Scene Suggestions</h3>
          <div class="header-controls">
            <button class="btn-icon ${this.state.showAnalytics ? 'active' : ''}" id="toggle-analytics" title="Analytics">
              📊
            </button>
            <button class="btn-icon" id="refresh-recommendations" title="Refresh">
              🔄
            </button>
          </div>
        </div>

        ${this.state.showAnalytics ? this.renderAnalytics() : this.renderRecommendations()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render recommendations view
   */
  private renderRecommendations(): string {
    if (this.state.isAnalyzing) {
      return '<div class="loading-state">🔄 Analyzing patterns...</div>';
    }

    if (this.state.currentRecommendations.length === 0) {
      return `
        <div class="empty-state">
          <p>📊 No recommendations yet</p>
          <p class="empty-state-hint">Use OBS for a while to build scene usage patterns</p>
        </div>
      `;
    }

    const currentSceneHtml = this.currentScene
      ? `<div class="current-scene">Current: <strong>${this.currentScene}</strong></div>`
      : '';

    return `
      ${currentSceneHtml}
      <div class="recommendations-list">
        ${this.state.currentRecommendations
          .map(
            (rec) => `
          <div class="recommendation-card" data-scene="${rec.sceneName}">
            <div class="recommendation-icon">${rec.icon || '🎬'}</div>
            <div class="recommendation-content">
              <div class="recommendation-scene">${rec.sceneName}</div>
              <div class="recommendation-reason">${rec.reason}</div>
            </div>
            <div class="recommendation-confidence">
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${rec.confidence}%"></div>
              </div>
              <span class="confidence-value">${Math.round(rec.confidence)}%</span>
            </div>
            <button class="btn-switch" data-scene="${rec.sceneName}">Switch</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render analytics view
   */
  private renderAnalytics(): string {
    if (!this.state.analytics) {
      return '<div class="loading-state">Loading analytics...</div>';
    }

    const analytics = this.state.analytics;

    return `
      <div class="analytics-view">
        <div class="analytics-summary">
          <div class="stat-card">
            <div class="stat-value">${analytics.totalSwitches}</div>
            <div class="stat-label">Total Switches</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.uniqueScenes}</div>
            <div class="stat-label">Unique Scenes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.mostUsedScene || 'N/A'}</div>
            <div class="stat-label">Most Used</div>
          </div>
        </div>

        <div class="analytics-section">
          <h4>⏰ Time of Day Distribution</h4>
          <div class="distribution-bars">
            ${Object.entries(analytics.timeOfDayDistribution)
              .map(([time, count]) => {
                const total = analytics.totalSwitches;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return `
                  <div class="distribution-item">
                    <div class="distribution-label">${time}</div>
                    <div class="distribution-bar">
                      <div class="distribution-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">${count}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="analytics-section">
          <h4>📅 Day Type Distribution</h4>
          <div class="distribution-bars">
            ${Object.entries(analytics.dayTypeDistribution)
              .map(([type, count]) => {
                const total = analytics.totalSwitches;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return `
                  <div class="distribution-item">
                    <div class="distribution-label">${type}</div>
                    <div class="distribution-bar">
                      <div class="distribution-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="distribution-value">${count}</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        ${
          analytics.averageSessionDuration > 0
            ? `
          <div class="analytics-section">
            <h4>⏱️ Average Session Duration</h4>
            <div class="stat-large">${formatDuration(analytics.averageSessionDuration)}</div>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Toggle analytics view
    const toggleAnalytics = document.getElementById('toggle-analytics');
    if (toggleAnalytics) {
      toggleAnalytics.addEventListener('click', () => {
        this.state.showAnalytics = !this.state.showAnalytics;
        this.render();
      });
    }

    // Refresh recommendations
    const refreshBtn = document.getElementById('refresh-recommendations');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.updateRecommendations();
        await this.loadAnalytics();
      });
    }

    // Switch scene buttons
    const switchButtons = this.container.querySelectorAll('.btn-switch');
    switchButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const sceneName = (e.target as HTMLElement).dataset.scene;
        if (sceneName && this.obsController) {
          try {
            await this.obsController.scenes.switchScene(sceneName);
            this.showNotification(`Switched to ${sceneName}`, 'success');
          } catch (error) {
            this.showNotification(`Failed to switch scene: ${error}`, 'error');
          }
        }
      });
    });
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-fadeout');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
