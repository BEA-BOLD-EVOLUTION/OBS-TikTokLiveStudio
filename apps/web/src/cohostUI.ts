/**
 * Cohost Tracking UI - Complete interface for username capture, OCR, history management
 */

import type { CohostRecord, CohostUIState } from './cohostTypes.js';
import {
  DEFAULT_QUICK_NOTES,
  formatCohostDisplay,
  timeAgo,
  isValidUsername,
  normalizeUsername,
} from './cohostTypes.js';
import {
  addCohostRecord,
  getAllCohosts,
  updateCohostRecord,
  deleteCohostRecord,
  exportToCSV,
} from './cohostHistory.js';
import { processImageOCR, extractUsernameFromOCR } from './cohostOCR.js';
import { lowerThirdsManager } from './lowerThirdsManager.js';
import { DEFAULT_TEMPLATES } from './lowerThirdsTypes.js';

export class CohostUI {
  private container: HTMLElement;
  private state: CohostUIState;
  private cohostRecords: CohostRecord[] = [];
  private cropRegion: { x: number; y: number; width: number; height: number } | null = null;
  private imagePreviewUrl: string | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    this.container = element;

    // Initialize state
    this.state = {
      isProcessing: false,
      showHistory: false,
      filter: {
        searchQuery: '',
        showBlocked: false,
      },
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadCohostHistory();
    this.render();
    this.attachEventListeners();
  }

  private async loadCohostHistory(): Promise<void> {
    try {
      this.cohostRecords = await getAllCohosts(this.state.filter);
    } catch (error) {
      console.error('Failed to load cohost history:', error);
      this.cohostRecords = [];
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="cohost-panel">
        <div class="cohost-header">
          <h2>🎭 TikTok Cohost Tracking</h2>
          <button class="btn-toggle-history" type="button">
            ${this.state.showHistory ? '📸 Show Capture' : '📋 Show History'}
          </button>
        </div>

        ${this.state.showHistory ? this.renderHistory() : this.renderCapture()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderCapture(): string {
    return `
      <div class="capture-area">
        <div class="upload-section">
          <h3>Step 1: Upload Screenshot</h3>
          <p class="instruction">Take a screenshot of TikTok Live Studio showing the cohost username (Win+Shift+S on Windows)</p>
          
          <div class="drop-zone ${this.state.imageFile ? 'has-image' : ''}" id="drop-zone">
            ${
              this.imagePreviewUrl
                ? `<img src="${this.imagePreviewUrl}" alt="Screenshot preview" class="preview-image" />`
                : `
              <div class="drop-zone-content">
                <div class="upload-icon">📷</div>
                <p>Drop screenshot here or click to browse</p>
                <p class="file-info">Supports: PNG, JPG, JPEG</p>
              </div>
            `
            }
            <input type="file" id="image-upload" accept="image/png,image/jpeg,image/jpg" style="display: none;" />
          </div>
        </div>

        ${
          this.state.imageFile
            ? `
        <div class="crop-section">
          <h3>Step 2: Select Username Region (Optional)</h3>
          <p class="instruction">Draw a box around the username for better accuracy, or skip to use full image</p>
          <div class="canvas-container">
            <canvas id="crop-canvas"></canvas>
          </div>
          <div class="crop-controls">
            <button class="btn-reset-crop" type="button">Reset Selection</button>
            <button class="btn-skip-crop" type="button">Skip (Use Full Image)</button>
          </div>
        </div>

        <div class="ocr-section">
          <h3>Step 3: Extract Username</h3>
          <button class="btn-run-ocr" type="button" ${this.state.isProcessing ? 'disabled' : ''}>
            ${this.state.isProcessing ? '⏳ Processing...' : '🔍 Run OCR'}
          </button>
          ${this.state.ocrText ? `<div class="ocr-result">Found: <strong>@${this.state.ocrText}</strong> (${this.state.ocrConfidence}% confidence)</div>` : ''}
        </div>
        `
            : ''
        }

        ${
          this.state.currentUsername
            ? `
        ${this.renderReturningCohostAlert()}
        <div class="notes-section">
          <h3>Quick Notes</h3>
          <div class="quick-notes-grid">
            ${DEFAULT_QUICK_NOTES.map(
              (preset) => `
              <button class="btn-quick-note" data-note-id="${preset.id}" type="button">
                ${preset.emoji} ${preset.label}
              </button>
            `,
            ).join('')}
          </div>
          <div class="custom-note-input">
            <label for="custom-note">Custom Note (Optional)</label>
            <textarea id="custom-note" placeholder="Add your own notes..." rows="3"></textarea>
          </div>
          <div class="save-actions">
            <button class="btn-save-cohost" type="button">💾 Save Cohost Record</button>
            <button class="btn-populate-lower-third" type="button">📝 Add to Lower Third</button>
          </div>
        </div>
        `
            : ''
        }
      </div>
    `;
  }

  private renderReturningCohostAlert(): string {
    const existingRecord = this.cohostRecords.find(
      (r) => r.username === normalizeUsername(this.state.currentUsername!),
    );

    if (!existingRecord) {
      return `<div class="alert alert-new">✨ New cohost!</div>`;
    }

    const { display, badge } = formatCohostDisplay(existingRecord);

    if (existingRecord.blocked) {
      return `
        <div class="alert alert-blocked">
          🔴 <strong>WARNING:</strong> You've blocked ${display} previously!
          <p>Stream count: ${existingRecord.streamCount} | Last seen: ${timeAgo(existingRecord.lastSeen)}</p>
          <p>Reason: ${existingRecord.notes.join(', ')}</p>
        </div>
      `;
    }

    return `
      <div class="alert alert-returning">
        ${badge} <strong>Returning cohost!</strong> You've streamed with ${display} before.
        <p>Stream count: ${existingRecord.streamCount} | Last seen: ${timeAgo(existingRecord.lastSeen)}</p>
        ${existingRecord.notes.length > 0 ? `<p>Previous notes: ${existingRecord.notes.join(', ')}</p>` : ''}
      </div>
    `;
  }

  private renderHistory(): string {
    return `
      <div class="history-area">
        <div class="history-controls">
          <input type="text" id="search-history" placeholder="Search by username..." value="${this.state.filter.searchQuery}" />
          <label class="checkbox-label">
            <input type="checkbox" id="show-blocked" ${this.state.filter.showBlocked ? 'checked' : ''} />
            Show blocked cohosts
          </label>
          <button class="btn-export-csv" type="button">📊 Export to CSV</button>
        </div>

        ${this.renderHistoryStats()}

        <div class="history-list">
          ${
            this.cohostRecords.length === 0
              ? '<p class="empty-state">No cohost records yet. Capture a username to get started!</p>'
              : this.cohostRecords.map((record) => this.renderHistoryItem(record)).join('')
          }
        </div>
      </div>
    `;
  }

  private renderHistoryStats(): string {
    const stats = this.calculateStats();
    return `
      <div class="history-stats">
        <div class="stat-item">
          <div class="stat-value">${stats.totalCohosts}</div>
          <div class="stat-label">Total Cohosts</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.uniqueCohosts}</div>
          <div class="stat-label">Unique Users</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.blockedCount}</div>
          <div class="stat-label">Blocked</div>
        </div>
      </div>
    `;
  }

  private calculateStats() {
    const uniqueUsernames = new Set(this.cohostRecords.map((r) => r.username));
    const blockedCount = this.cohostRecords.filter((r) => r.blocked).length;
    return {
      totalCohosts: this.cohostRecords.length,
      uniqueCohosts: uniqueUsernames.size,
      blockedCount,
    };
  }

  private renderHistoryItem(record: CohostRecord): string {
    const { display, badge } = formatCohostDisplay(record);
    return `
      <div class="history-item ${record.blocked ? 'blocked' : ''}" data-record-id="${record.id}">
        <div class="history-item-header">
          <span class="username">${badge} ${display}</span>
          <span class="stream-count">${record.streamCount} ${record.streamCount === 1 ? 'stream' : 'streams'}</span>
        </div>
        <div class="history-item-meta">
          <span class="last-seen">Last seen: ${timeAgo(record.lastSeen)}</span>
          ${record.notes.length > 0 ? `<span class="notes-tags">${record.notes.join(', ')}</span>` : ''}
        </div>
        ${record.customNote ? `<div class="custom-note-display">"${record.customNote}"</div>` : ''}
        <div class="history-item-actions">
          <button class="btn-toggle-block" data-record-id="${record.id}" type="button">
            ${record.blocked ? '✅ Unblock' : '🚫 Block'}
          </button>
          <button class="btn-delete-record" data-record-id="${record.id}" type="button">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Toggle history/capture view
    const toggleButton = this.container.querySelector('.btn-toggle-history');
    toggleButton?.addEventListener('click', () => {
      this.state.showHistory = !this.state.showHistory;
      this.render();
    });

    if (!this.state.showHistory) {
      // Capture area event listeners
      this.attachCaptureListeners();
    } else {
      // History area event listeners
      this.attachHistoryListeners();
    }
  }

  private attachCaptureListeners(): void {
    // File upload via click
    const dropZone = this.container.querySelector('#drop-zone');
    const fileInput = this.container.querySelector('#image-upload') as HTMLInputElement;

    dropZone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleImageUpload(file);
      }
    });

    // Drag-and-drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleImageUpload(file);
      }
    });

    // Crop canvas interactions (if image uploaded)
    if (this.state.imageFile) {
      this.initializeCropCanvas();

      const resetButton = this.container.querySelector('.btn-reset-crop');
      resetButton?.addEventListener('click', () => {
        this.cropRegion = null;
        this.initializeCropCanvas();
      });

      const skipButton = this.container.querySelector('.btn-skip-crop');
      skipButton?.addEventListener('click', () => {
        this.cropRegion = null; // Skip cropping, use full image
      });
    }

    // Run OCR button
    const ocrButton = this.container.querySelector('.btn-run-ocr');
    ocrButton?.addEventListener('click', () => this.handleRunOCR());

    // Quick notes buttons
    const noteButtons = this.container.querySelectorAll('.btn-quick-note');
    noteButtons.forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('selected');
      });
    });

    // Save cohost button
    const saveButton = this.container.querySelector('.btn-save-cohost');
    saveButton?.addEventListener('click', () => this.handleSaveCohost());

    // Populate lower third button
    const lowerThirdButton = this.container.querySelector('.btn-populate-lower-third');
    lowerThirdButton?.addEventListener('click', () => this.handlePopulateLowerThird());
  }

  private attachHistoryListeners(): void {
    // Search input
    const searchInput = this.container.querySelector('#search-history') as HTMLInputElement;
    searchInput?.addEventListener('input', async (e) => {
      this.state.filter.searchQuery = (e.target as HTMLInputElement).value;
      await this.loadCohostHistory();
      this.render();
    });

    // Show blocked checkbox
    const showBlockedCheckbox = this.container.querySelector('#show-blocked') as HTMLInputElement;
    showBlockedCheckbox?.addEventListener('change', async (e) => {
      this.state.filter.showBlocked = (e.target as HTMLInputElement).checked;
      await this.loadCohostHistory();
      this.render();
    });

    // Export CSV button
    const exportButton = this.container.querySelector('.btn-export-csv');
    exportButton?.addEventListener('click', () => this.handleExportCSV());

    // Block/unblock buttons
    const blockButtons = this.container.querySelectorAll('.btn-toggle-block');
    blockButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        const recordId = (e.target as HTMLElement).dataset.recordId!;
        await this.handleToggleBlock(recordId);
      });
    });

    // Delete buttons
    const deleteButtons = this.container.querySelectorAll('.btn-delete-record');
    deleteButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        const recordId = (e.target as HTMLElement).dataset.recordId!;
        await this.handleDeleteRecord(recordId);
      });
    });
  }

  private async handleImageUpload(file: File): Promise<void> {
    this.state.imageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.state.ocrText = undefined;
    this.state.currentUsername = undefined;
    this.cropRegion = null;
    this.render();
  }

  private initializeCropCanvas(): void {
    const canvas = this.container.querySelector('#crop-canvas') as HTMLCanvasElement;
    if (!canvas || !this.imagePreviewUrl) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Simple click-and-drag to draw rectangle
      let isDrawing = false;
      let startX = 0;
      let startY = 0;

      canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
      });

      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      });

      canvas.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        this.cropRegion = {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
        };
      });
    };
    img.src = this.imagePreviewUrl;
  }

  private async handleRunOCR(): Promise<void> {
    if (!this.state.imageFile) {
      return;
    }

    this.state.isProcessing = true;
    this.render();

    try {
      const ocrResult = await processImageOCR(this.state.imageFile, this.cropRegion || undefined);
      const username = extractUsernameFromOCR(ocrResult);

      if (!isValidUsername(username)) {
        this.showNotification(
          'OCR failed to find valid username. Try adjusting the crop region.',
          'error',
        );
        this.state.isProcessing = false;
        this.render();
        return;
      }

      this.state.ocrText = username;
      this.state.ocrConfidence = ocrResult.confidence;
      this.state.currentUsername = username;
      this.state.isProcessing = false;

      // Check if returning cohost
      await this.loadCohostHistory();

      this.render();
      this.showNotification(`Username extracted: @${username}`, 'success');
    } catch (error) {
      console.error('OCR processing error:', error);
      this.showNotification(error instanceof Error ? error.message : 'OCR failed', 'error');
      this.state.isProcessing = false;
      this.render();
    }
  }

  private async handleSaveCohost(): Promise<void> {
    if (!this.state.currentUsername) {
      return;
    }

    const selectedNotes = Array.from(
      this.container.querySelectorAll('.btn-quick-note.selected'),
    ).map((button) => (button as HTMLElement).textContent?.trim() || '');

    const customNoteInput = this.container.querySelector('#custom-note') as HTMLTextAreaElement;
    const customNote = customNoteInput?.value.trim();

    try {
      await addCohostRecord(
        this.state.currentUsername,
        selectedNotes,
        customNote,
        this.state.ocrConfidence,
        this.state.croppedImageUrl,
      );

      this.showNotification(`Cohost @${this.state.currentUsername} saved!`, 'success');

      // Reset capture state
      this.state.imageFile = undefined;
      this.state.currentUsername = undefined;
      this.state.ocrText = undefined;
      this.cropRegion = null;
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
        this.imagePreviewUrl = null;
      }

      await this.loadCohostHistory();
      this.render();
    } catch (error) {
      console.error('Failed to save cohost:', error);
      this.showNotification('Failed to save cohost record', 'error');
    }
  }

  private handlePopulateLowerThird(): void {
    if (!this.state.currentUsername) {
      return;
    }

    const template = DEFAULT_TEMPLATES[0]; // Use first template (modern)
    lowerThirdsManager.show(
      {
        id: crypto.randomUUID(),
        templateId: template.id,
        primaryText: `@${this.state.currentUsername}`,
        secondaryText: 'Cohost',
        autoHideDuration: 10,
        createdAt: new Date(),
        lastShown: new Date(),
      },
      template,
    );

    this.showNotification(`Lower third created for @${this.state.currentUsername}`, 'success');
  }

  private async handleToggleBlock(recordId: string): Promise<void> {
    const record = this.cohostRecords.find((r) => r.id === recordId);
    if (!record) {
      return;
    }

    try {
      await updateCohostRecord(recordId, { blocked: !record.blocked });
      this.showNotification(
        `@${record.username} ${record.blocked ? 'unblocked' : 'blocked'}`,
        'success',
      );
      await this.loadCohostHistory();
      this.render();
    } catch (error) {
      console.error('Failed to toggle block:', error);
      this.showNotification('Failed to update record', 'error');
    }
  }

  private async handleDeleteRecord(recordId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this cohost record?')) {
      return;
    }

    try {
      await deleteCohostRecord(recordId);
      this.showNotification('Cohost record deleted', 'success');
      await this.loadCohostHistory();
      this.render();
    } catch (error) {
      console.error('Failed to delete record:', error);
      this.showNotification('Failed to delete record', 'error');
    }
  }

  private async handleExportCSV(): Promise<void> {
    try {
      const csv = await exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohost-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.showNotification('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      this.showNotification('Failed to export CSV', 'error');
    }
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type} show`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
