/**
 * Lower Thirds UI - Interface for managing text overlays
 */

import { lowerThirdsManager } from './lowerThirdsManager';
import {
  type LowerThird,
  type LowerThirdTemplate,
  type LowerThirdsState,
  DEFAULT_TEMPLATES,
} from './lowerThirdsTypes';

export class LowerThirdsUI {
  private container: HTMLElement;
  private manager = lowerThirdsManager;
  private unsubscribe: (() => void) | null = null;

  // Stored items
  private savedItems: LowerThird[] = [];
  private templates: LowerThirdTemplate[] = [...DEFAULT_TEMPLATES];
  private selectedTemplateId: string = DEFAULT_TEMPLATES[0].id;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
    this.initialize();
  }

  /**
   * Initialize UI
   */
  private initialize(): void {
    // Subscribe to state changes
    this.unsubscribe = this.manager.onStateChange((state) => {
      this.render(state);
    });

    // Initial render
    this.render(this.manager.getState());
  }

  /**
   * Main render
   */
  private render(state: LowerThirdsState): void {
    this.container.innerHTML = `
      <div class="lower-thirds-panel">
        <div class="lower-thirds-header">
          <h3>📝 Lower Thirds</h3>
          <button class="btn-toggle-queue" title="Toggle queue panel">
            ${state.queue.length > 0 ? `Queue (${state.queue.length})` : 'Queue'}
          </button>
        </div>

        <!-- Quick Add Form -->
        <div class="lower-thirds-quick-add">
          <div class="form-group">
            <label>Primary Text</label>
            <input 
              type="text" 
              id="lt-primary-text" 
              placeholder="Name or main text..."
              class="input-text"
            />
          </div>
          <div class="form-group">
            <label>Secondary Text (optional)</label>
            <input 
              type="text" 
              id="lt-secondary-text" 
              placeholder="@social handle..."
              class="input-text"
            />
          </div>
          <div class="form-group">
            <label>Template</label>
            <select id="lt-template-select" class="select-template">
              ${this.templates.map(t => `
                <option value="${t.id}" ${t.id === this.selectedTemplateId ? 'selected' : ''}>
                  ${t.name}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Auto-hide (seconds)</label>
            <input 
              type="number" 
              id="lt-auto-hide" 
              value="8" 
              min="0" 
              max="60" 
              class="input-number"
            />
            <small>0 = manual hide</small>
          </div>
          <div class="quick-actions">
            <button class="btn-show" id="btn-show-now">
              Show Now
            </button>
            <button class="btn-add-queue" id="btn-add-queue">
              Add to Queue
            </button>
            <button class="btn-save" id="btn-save-item">
              💾 Save
            </button>
          </div>
        </div>

        <!-- Current Display Status -->
        ${this.renderCurrentStatus(state)}

        <!-- Queue Panel -->
        ${this.renderQueue(state)}

        <!-- Saved Items -->
        ${this.renderSavedItems()}
      </div>
    `;

    this.attachEventListeners(state);
  }

  /**
   * Render current display status
   */
  private renderCurrentStatus(state: LowerThirdsState): string {
    if (!state.isShowing || !state.activeItem) {
      return `
        <div class="current-status status-hidden">
          <span class="status-indicator">○</span>
          <span>No lower third showing</span>
        </div>
      `;
    }

    const { lowerThird, template } = state.activeItem;
    return `
      <div class="current-status status-showing">
        <span class="status-indicator status-active">●</span>
        <div class="status-content">
          <div class="status-text">
            <strong>${lowerThird.primaryText}</strong>
            ${lowerThird.secondaryText ? `<span>${lowerThird.secondaryText}</span>` : ''}
          </div>
          <div class="status-meta">
            <span class="template-badge">${template.name}</span>
          </div>
        </div>
        <button class="btn-hide" id="btn-hide-current">
          Hide
        </button>
      </div>
    `;
  }

  /**
   * Render queue panel
   */
  private renderQueue(state: LowerThirdsState): string {
    if (state.queue.length === 0) {
      return `
        <div class="queue-panel queue-empty">
          <div class="queue-header">
            <h4>Queue</h4>
          </div>
          <p class="empty-message">No items in queue. Add items to enable auto-rotation.</p>
        </div>
      `;
    }

    return `
      <div class="queue-panel">
        <div class="queue-header">
          <h4>Queue (${state.queue.length})</h4>
          <div class="queue-controls">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="auto-rotate-toggle" 
                ${state.autoRotateEnabled ? 'checked' : ''}
              />
              Auto-rotate
            </label>
            <button class="btn-clear-queue" id="btn-clear-queue">Clear</button>
          </div>
        </div>
        <div class="queue-items">
          ${state.queue.map((item, index) => `
            <div class="queue-item">
              <div class="queue-item-content">
                <div class="queue-item-text">
                  <strong>${item.lowerThird.primaryText}</strong>
                  ${item.lowerThird.secondaryText ? `<span>${item.lowerThird.secondaryText}</span>` : ''}
                </div>
                <span class="queue-item-duration">${(item.showDuration / 1000).toFixed(0)}s</span>
              </div>
              <button class="btn-remove" data-queue-index="${index}">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render saved items
   */
  private renderSavedItems(): string {
    if (this.savedItems.length === 0) {
      return '';
    }

    return `
      <div class="saved-items">
        <h4>Saved Items</h4>
        <div class="saved-items-list">
          ${this.savedItems.map((item, index) => `
            <div class="saved-item">
              <div class="saved-item-content">
                <strong>${item.primaryText}</strong>
                ${item.secondaryText ? `<span>${item.secondaryText}</span>` : ''}
              </div>
              <div class="saved-item-actions">
                <button class="btn-load" data-saved-index="${index}">Load</button>
                <button class="btn-delete" data-saved-index="${index}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(state: LowerThirdsState): void {
    // Show Now button
    const btnShowNow = document.getElementById('btn-show-now');
    btnShowNow?.addEventListener('click', () => this.handleShowNow());

    // Add to Queue button
    const btnAddQueue = document.getElementById('btn-add-queue');
    btnAddQueue?.addEventListener('click', () => this.handleAddToQueue());

    // Save button
    const btnSave = document.getElementById('btn-save-item');
    btnSave?.addEventListener('click', () => this.handleSave());

    // Hide current button
    const btnHide = document.getElementById('btn-hide-current');
    btnHide?.addEventListener('click', () => this.handleHide());

    // Template select
    const templateSelect = document.getElementById('lt-template-select') as HTMLSelectElement;
    templateSelect?.addEventListener('change', (e) => {
      this.selectedTemplateId = (e.target as HTMLSelectElement).value;
    });

    // Auto-rotate toggle
    const autoRotateToggle = document.getElementById('auto-rotate-toggle') as HTMLInputElement;
    autoRotateToggle?.addEventListener('change', (e) => {
      if ((e.target as HTMLInputElement).checked) {
        this.manager.enableAutoRotate();
      } else {
        this.manager.disableAutoRotate();
      }
    });

    // Clear queue button
    const btnClearQueue = document.getElementById('btn-clear-queue');
    btnClearQueue?.addEventListener('click', () => this.handleClearQueue());

    // Remove from queue buttons
    document.querySelectorAll('[data-queue-index]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.queueIndex || '0');
        this.manager.removeFromQueue(index);
      });
    });

    // Load saved item buttons
    document.querySelectorAll('[data-saved-index]').forEach((btn) => {
      const action = (btn as HTMLElement).classList.contains('btn-load') ? 'load' : 'delete';
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.savedIndex || '0');
        if (action === 'load') {
          this.handleLoadSaved(index);
        } else {
          this.handleDeleteSaved(index);
        }
      });
    });
  }

  /**
   * Handle Show Now
   */
  private async handleShowNow(): Promise<void> {
    const lowerThird = this.buildLowerThirdFromForm();
    if (!lowerThird) return;

    const template = this.templates.find(t => t.id === this.selectedTemplateId);
    if (!template) return;

    try {
      await this.manager.show(lowerThird, template);
      this.showNotification('Lower third shown', 'success');
    } catch (error) {
      this.showNotification('Failed to show lower third: ' + (error as Error).message, 'error');
    }
  }

  /**
   * Handle Add to Queue
   */
  private handleAddToQueue(): void {
    const lowerThird = this.buildLowerThirdFromForm();
    if (!lowerThird) return;

    const template = this.templates.find(t => t.id === this.selectedTemplateId);
    if (!template) return;

    this.manager.addToQueue(lowerThird, template, lowerThird.autoHideDuration);
    this.showNotification('Added to queue', 'success');
  }

  /**
   * Handle Save
   */
  private handleSave(): void {
    const lowerThird = this.buildLowerThirdFromForm();
    if (!lowerThird) return;

    this.savedItems.push(lowerThird);
    this.showNotification('Saved', 'success');
    this.render(this.manager.getState());
  }

  /**
   * Handle Hide
   */
  private async handleHide(): Promise<void> {
    try {
      await this.manager.hide();
    } catch (error) {
      this.showNotification('Failed to hide: ' + (error as Error).message, 'error');
    }
  }

  /**
   * Handle Clear Queue
   */
  private handleClearQueue(): void {
    this.manager.clearQueue();
    this.showNotification('Queue cleared', 'info');
  }

  /**
   * Handle Load Saved
   */
  private handleLoadSaved(index: number): void {
    const item = this.savedItems[index];
    if (!item) return;

    // Populate form
    const primaryInput = document.getElementById('lt-primary-text') as HTMLInputElement;
    const secondaryInput = document.getElementById('lt-secondary-text') as HTMLInputElement;
    const autoHideInput = document.getElementById('lt-auto-hide') as HTMLInputElement;

    if (primaryInput) primaryInput.value = item.primaryText;
    if (secondaryInput) secondaryInput.value = item.secondaryText || '';
    if (autoHideInput) autoHideInput.value = ((item.autoHideDuration || 0) / 1000).toString();

    this.selectedTemplateId = item.templateId;
    this.render(this.manager.getState());
  }

  /**
   * Handle Delete Saved
   */
  private handleDeleteSaved(index: number): void {
    this.savedItems.splice(index, 1);
    this.showNotification('Deleted', 'info');
    this.render(this.manager.getState());
  }

  /**
   * Build LowerThird from form inputs
   */
  private buildLowerThirdFromForm(): LowerThird | null {
    const primaryInput = document.getElementById('lt-primary-text') as HTMLInputElement;
    const secondaryInput = document.getElementById('lt-secondary-text') as HTMLInputElement;
    const autoHideInput = document.getElementById('lt-auto-hide') as HTMLInputElement;

    const primaryText = primaryInput?.value.trim();
    if (!primaryText) {
      this.showNotification('Primary text is required', 'error');
      return null;
    }

    const secondaryText = secondaryInput?.value.trim() || undefined;
    const autoHideSeconds = parseInt(autoHideInput?.value || '0');
    const autoHideDuration = autoHideSeconds > 0 ? autoHideSeconds * 1000 : undefined;

    return {
      id: `lt-${Date.now()}`,
      templateId: this.selectedTemplateId,
      primaryText,
      secondaryText,
      autoHideDuration,
      createdAt: new Date(),
    };
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
