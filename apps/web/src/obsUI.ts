import { OBSController, type OBSStatus } from '@obs-tiktok/obs-controller';

/**
 * OBS UI integration - manages connection status display and controls
 */
export class OBSUIController {
  private obs: OBSController;
  private statusElement: HTMLElement | null = null;
  private sceneListElement: HTMLElement | null = null;

  constructor() {
    this.obs = new OBSController({
      host: import.meta.env.OBS_HOST || 'localhost',
      port: Number(import.meta.env.OBS_PORT) || 4455,
      password: import.meta.env.OBS_PASSWORD || undefined,
    });

    this.setupStatusListener();
  }

  /**
   * Initialize UI elements and connect to OBS
   */
  async initialize(container: HTMLElement): Promise<void> {
    this.renderUI(container);
    await this.connect();
  }

  /**
   * Get the OBS controller instance for external use
   */
  getController(): OBSController {
    return this.obs;
  }

  /**
   * Connect to OBS
   */
  async connect(): Promise<void> {
    try {
      await this.obs.connect();
      await this.refreshScenes();
    } catch (error) {
      console.error('Failed to connect to OBS:', error);
    }
  }

  /**
   * Disconnect from OBS
   */
  async disconnect(): Promise<void> {
    await this.obs.disconnect();
  }

  /**
   * Render OBS status dashboard UI
   */
  private renderUI(container: HTMLElement): void {
    const obsSection = document.createElement('div');
    obsSection.className = 'obs-dashboard';
    obsSection.innerHTML = `
      <div class="obs-status-header">
        <h2>🎥 OBS Control Room</h2>
        <div id="obs-connection-status" class="connection-status">
          <span class="status-dot"></span>
          <span class="status-text">Disconnected</span>
        </div>
      </div>

      <div class="obs-controls">
        <div class="control-section">
          <h3>Quick Actions</h3>
          <div class="button-group">
            <button id="toggle-virtual-camera" class="obs-btn" disabled>
              📹 Virtual Camera
            </button>
            <button id="start-recording" class="obs-btn" disabled>
              ⏺️ Start Recording
            </button>
            <button id="stop-recording" class="obs-btn" disabled>
              ⏹️ Stop Recording
            </button>
          </div>
        </div>

        <div class="control-section">
          <h3>Scenes</h3>
          <div id="obs-scenes" class="scene-list">
            <p class="muted">Connect to OBS to see scenes...</p>
          </div>
        </div>

        <div class="control-section">
          <h3>Current Status</h3>
          <div class="status-grid">
            <div class="status-item">
              <span>Active Scene:</span>
              <strong id="active-scene">—</strong>
            </div>
            <div class="status-item">
              <span>Recording:</span>
              <strong id="recording-status">Inactive</strong>
            </div>
            <div class="status-item">
              <span>Virtual Camera:</span>
              <strong id="vcam-status">Inactive</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(obsSection);

    // Cache DOM references
    this.statusElement = document.getElementById('obs-connection-status');
    this.sceneListElement = document.getElementById('obs-scenes');

    // Attach event handlers
    this.attachEventHandlers();
  }

  /**
   * Attach button event handlers
   */
  private attachEventHandlers(): void {
    document
      .getElementById('toggle-virtual-camera')
      ?.addEventListener('click', () => this.toggleVirtualCamera());

    document
      .getElementById('start-recording')
      ?.addEventListener('click', () => this.startRecording());

    document
      .getElementById('stop-recording')
      ?.addEventListener('click', () => this.stopRecording());
  }

  /**
   * Setup status change listener
   */
  private setupStatusListener(): void {
    this.obs.onStatusChange((status) => {
      this.updateStatusDisplay(status);
    });

    this.obs.onError((error) => {
      console.error('OBS error:', error);
      this.showNotification(error.message, 'error');
    });
  }

  /**
   * Update status display based on OBS state
   */
  private updateStatusDisplay(status: OBSStatus): void {
    // Connection status
    if (this.statusElement) {
      const dot = this.statusElement.querySelector('.status-dot');
      const text = this.statusElement.querySelector('.status-text');

      if (dot && text) {
        dot.className = `status-dot ${status.status}`;
        text.textContent = status.status.charAt(0).toUpperCase() + status.status.slice(1);
      }
    }

    // Active scene
    const activeSceneEl = document.getElementById('active-scene');
    if (activeSceneEl) {
      activeSceneEl.textContent = status.activeScene || '—';
    }

    // Recording status
    const recordingEl = document.getElementById('recording-status');
    if (recordingEl) {
      recordingEl.textContent = status.isRecording ? '⏺️ Active' : 'Inactive';
    }

    // Virtual camera status
    const vcamEl = document.getElementById('vcam-status');
    if (vcamEl) {
      vcamEl.textContent = status.virtualCameraActive ? '📹 Active' : 'Inactive';
    }

    // Enable/disable buttons based on connection
    const buttons = document.querySelectorAll('.obs-btn');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = status.status !== 'connected';
    });
  }

  /**
   * Refresh scene list from OBS
   */
  private async refreshScenes(): Promise<void> {
    if (!this.sceneListElement) return;

    try {
      const scenes = await this.obs.scenes.getScenes();
      const currentScene = await this.obs.scenes.getCurrentScene();

      this.sceneListElement.innerHTML = scenes
        .map(
          (scene) => `
          <button 
            class="scene-btn ${scene.name === currentScene ? 'active' : ''}" 
            data-scene="${scene.name}"
          >
            ${scene.name}
          </button>
        `,
        )
        .join('');

      // Attach scene button handlers
      this.sceneListElement.querySelectorAll('.scene-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sceneName = btn.getAttribute('data-scene');
          if (sceneName) {
            this.switchScene(sceneName);
          }
        });
      });
    } catch (error) {
      console.error('Failed to refresh scenes:', error);
    }
  }

  /**
   * Switch to a different scene
   */
  private async switchScene(sceneName: string): Promise<void> {
    try {
      await this.obs.scenes.switchScene(sceneName);
      this.showNotification(`Switched to ${sceneName}`, 'success');
      await this.refreshScenes();
    } catch (error) {
      console.error('Failed to switch scene:', error);
      this.showNotification('Failed to switch scene', 'error');
    }
  }

  /**
   * Toggle virtual camera on/off
   */
  private async toggleVirtualCamera(): Promise<void> {
    try {
      const newState = await this.obs.virtualCamera.toggle();
      this.showNotification(`Virtual camera ${newState ? 'started' : 'stopped'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle virtual camera:', error);
      this.showNotification('Failed to toggle virtual camera', 'error');
    }
  }

  /**
   * Start recording
   */
  private async startRecording(): Promise<void> {
    try {
      await this.obs.recording.startRecording();
      this.showNotification('Recording started', 'success');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.showNotification('Failed to start recording', 'error');
    }
  }

  /**
   * Stop recording
   */
  private async stopRecording(): Promise<void> {
    try {
      await this.obs.recording.stopRecording();
      this.showNotification('Recording stopped', 'success');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.showNotification('Failed to stop recording', 'error');
    }
  }

  /**
   * Show toast notification
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(
      () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      },
      type === 'error' ? 5000 : 3000,
    );
  }
}
