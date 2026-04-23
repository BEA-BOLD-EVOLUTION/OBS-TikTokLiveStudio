/**
 * Go Live Sequence - UI component for automated stream start workflow
 */

import { GoLiveWorkflow } from './goLiveWorkflow';
import type { GoLiveState } from './goLiveTypes';

/**
 * Go Live UI Component
 */
export class GoLiveUI {
  private container: HTMLElement;
  private workflow: GoLiveWorkflow;
  private unsubscribe: (() => void) | null = null;

  constructor(containerId: string, workflow: GoLiveWorkflow) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = element;
    this.workflow = workflow;
    this.initialize();
  }

  /**
   * Initialize UI and subscribe to workflow state changes
   */
  private initialize(): void {
    this.unsubscribe = this.workflow.onStateChange((state) => this.render(state));
    this.render(this.workflow.getState());
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Render the UI based on current state
   */
  private render(state: GoLiveState): void {
    const step = state.currentStep;

    if (step === 'idle') {
      this.renderIdleState();
    } else if (step === 'preflight') {
      this.renderPreflightModal(state);
    } else if (step === 'starting') {
      this.renderStartingModal();
    } else if (step === 'checklist') {
      this.renderChecklistModal(state);
    } else if (step === 'going-live') {
      this.renderGoingLiveModal();
    } else if (step === 'live') {
      this.renderLiveState(state);
    } else if (step === 'error') {
      this.renderErrorModal(state);
    }
  }

  /**
   * Render idle state - just the Go Live button
   */
  private renderIdleState(): void {
    this.container.innerHTML = `
      <div class="go-live-container">
        <button class="btn-go-live" title="Start automated Go Live sequence">
          <span class="icon">🎬</span>
          <span class="label">Go Live</span>
        </button>
      </div>
    `;

    const button = this.container.querySelector('.btn-go-live');
    button?.addEventListener('click', () => this.workflow.start());
  }

  /**
   * Render pre-flight checks modal
   */
  private renderPreflightModal(state: GoLiveState): void {
    const checksHTML = state.preflightChecks
      .map(
        (check) => `
      <div class="preflight-check ${check.status}">
        <div class="check-status">
          ${this.getCheckStatusIcon(check.status)}
        </div>
        <div class="check-content">
          <div class="check-label">${check.label}</div>
          ${check.description ? `<div class="check-description">${check.description}</div>` : ''}
          ${check.errorMessage ? `<div class="check-error">${check.errorMessage}</div>` : ''}
        </div>
      </div>
    `,
      )
      .join('');

    this.container.innerHTML = `
      <div class="go-live-modal-backdrop">
        <div class="go-live-modal">
          <div class="modal-header">
            <h2>Pre-Flight Checks</h2>
            <p class="modal-subtitle">Verifying setup before going live...</p>
          </div>
          <div class="modal-body">
            <div class="preflight-checks">
              ${checksHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render starting modal (switching to starting scene, starting virtual camera)
   */
  private renderStartingModal(): void {
    this.container.innerHTML = `
      <div class="go-live-modal-backdrop">
        <div class="go-live-modal">
          <div class="modal-header">
            <h2>Starting...</h2>
            <p class="modal-subtitle">Preparing your stream</p>
          </div>
          <div class="modal-body">
            <div class="progress-steps">
              <div class="progress-step completed">
                <div class="step-icon">✓</div>
                <div class="step-label">Pre-flight checks passed</div>
              </div>
              <div class="progress-step active">
                <div class="step-icon spinner">⟳</div>
                <div class="step-label">Switching to starting scene...</div>
              </div>
              <div class="progress-step">
                <div class="step-icon">○</div>
                <div class="step-label">Starting virtual camera...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render user checklist modal
   */
  private renderChecklistModal(state: GoLiveState): void {
    const checklistHTML = state.userChecklist
      .map(
        (item) => `
      <label class="checklist-item ${item.checked ? 'checked' : ''}">
        <input 
          type="checkbox" 
          data-item-id="${item.id}" 
          ${item.checked ? 'checked' : ''}
          ${item.required ? 'required' : ''}
        />
        <div class="checkbox-custom"></div>
        <div class="item-content">
          <div class="item-label">
            ${item.label}
            ${item.required ? '<span class="required-badge">Required</span>' : ''}
          </div>
          ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
        </div>
      </label>
    `,
      )
      .join('');

    const allRequiredChecked = state.userChecklist
      .filter((item) => item.required)
      .every((item) => item.checked);

    this.container.innerHTML = `
      <div class="go-live-modal-backdrop">
        <div class="go-live-modal">
          <div class="modal-header">
            <h2>Ready to Go Live? ✨</h2>
            <p class="modal-subtitle">Confirm everything is set up correctly</p>
          </div>
          <div class="modal-body">
            <div class="user-checklist">
              ${checklistHTML}
            </div>
            ${state.error ? `<div class="error-message">${state.error}</div>` : ''}
          </div>
          <div class="modal-footer">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm" ${!allRequiredChecked ? 'disabled' : ''}>
              🚀 Go Live!
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    const checkboxes = this.container.querySelectorAll<HTMLInputElement>(
      '.checklist-item input[type="checkbox"]',
    );
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const itemId = checkbox.dataset.itemId;
        if (itemId) {
          this.workflow.updateChecklistItem(itemId, checkbox.checked);
        }
      });
    });

    this.container.querySelector('.btn-cancel')?.addEventListener('click', () => {
      this.workflow.cancel();
    });

    this.container.querySelector('.btn-confirm')?.addEventListener('click', () => {
      if (allRequiredChecked) {
        this.workflow.confirmChecklist();
      }
    });
  }

  /**
   * Render going live modal (switching to live scene, starting recording)
   */
  private renderGoingLiveModal(): void {
    this.container.innerHTML = `
      <div class="go-live-modal-backdrop">
        <div class="go-live-modal">
          <div class="modal-header">
            <h2>Going Live! 🎉</h2>
            <p class="modal-subtitle">Switching to live scene and starting recording...</p>
          </div>
          <div class="modal-body">
            <div class="progress-steps">
              <div class="progress-step completed">
                <div class="step-icon">✓</div>
                <div class="step-label">Ready to go</div>
              </div>
              <div class="progress-step active">
                <div class="step-icon spinner">⟳</div>
                <div class="step-label">Switching to live scene...</div>
              </div>
              <div class="progress-step">
                <div class="step-icon">○</div>
                <div class="step-label">Starting recording backup...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render live state - show compact status widget
   */
  private renderLiveState(state: GoLiveState): void {
    const duration = state.startTime
      ? this.formatDuration(Date.now() - state.startTime.getTime())
      : '00:00:00';

    this.container.innerHTML = `
      <div class="go-live-container live">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span class="live-label">LIVE</span>
        </div>
        <div class="live-duration">${duration}</div>
        ${state.isRecording ? '<div class="recording-indicator">● REC</div>' : ''}
        <button class="btn-end-stream" title="End stream and return to idle">
          End Stream
        </button>
      </div>
    `;

    // Update duration every second
    const intervalId = setInterval(() => {
      if (this.workflow.getState().currentStep !== 'live') {
        clearInterval(intervalId);
        return;
      }
      const newDuration = state.startTime
        ? this.formatDuration(Date.now() - state.startTime.getTime())
        : '00:00:00';
      const durationElement = this.container.querySelector('.live-duration');
      if (durationElement) {
        durationElement.textContent = newDuration;
      }
    }, 1000);

    this.container.querySelector('.btn-end-stream')?.addEventListener('click', () => {
      clearInterval(intervalId);
      this.workflow.reset();
      this.showNotification('Stream ended', 'info');
    });

    // Show success notification
    this.showNotification("You're live! Recording backup started.", 'success');
  }

  /**
   * Render error modal
   */
  private renderErrorModal(state: GoLiveState): void {
    this.container.innerHTML = `
      <div class="go-live-modal-backdrop">
        <div class="go-live-modal error">
          <div class="modal-header">
            <h2>Error ⚠️</h2>
            <p class="modal-subtitle">Failed to start Go Live sequence</p>
          </div>
          <div class="modal-body">
            <div class="error-message">${state.error || 'Unknown error occurred'}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-close">Close</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('.btn-close')?.addEventListener('click', () => {
      this.workflow.reset();
    });
  }

  /**
   * Get icon for check status
   */
  private getCheckStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return '○';
      case 'checking':
        return '<span class="spinner">⟳</span>';
      case 'passed':
        return '<span class="check-passed">✓</span>';
      case 'failed':
        return '<span class="check-failed">✗</span>';
      default:
        return '○';
    }
  }

  /**
   * Format duration in HH:MM:SS
   */
  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
  }

  /**
   * Show notification toast
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
