/**
 * Scheduled Workflows UI Component
 * Interface for creating, editing, and monitoring scheduled workflows
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  ScheduledWorkflow,
  WorkflowAction,
  WorkflowFilter,
  WorkflowExecution,
  RecurrenceType,
  DayOfWeek,
} from './scheduledWorkflowTypes.js';
import {
  generateWorkflowId,
  DEFAULT_WORKFLOW_FILTER,
  DEFAULT_WORKFLOW_SCHEDULE,
  WORKFLOW_COLORS,
  getScheduleDescription,
  validateWorkflow,
  formatDuration,
} from './scheduledWorkflowTypes.js';
import {
  getAllWorkflows,
  saveWorkflow,
  deleteWorkflow,
} from './scheduledWorkflowStorage.js';
import { workflowScheduler } from './scheduledWorkflowEngine.js';

export class ScheduledWorkflowUI {
  private containerId: string;
  private obsController: OBSController | null = null;
  private workflows: ScheduledWorkflow[] = [];
  private filter: WorkflowFilter = { ...DEFAULT_WORKFLOW_FILTER };
  private selectedWorkflowId: string | null = null;
  private isEditing = false;
  private isCreating = false;
  private showHistory = false;
  private executionHistory: WorkflowExecution[] = [];

  constructor(containerId: string) {
    this.containerId = containerId;
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadWorkflows();
    this.render();
    this.attachEventListeners();

    // Subscribe to execution events
    workflowScheduler.onExecution((execution) => {
      this.handleExecutionEvent(execution);
    });

    // Refresh UI every 30 seconds to update countdown timers
    setInterval(() => {
      this.render();
    }, 30000);
  }

  setOBSController(obs: OBSController): void {
    this.obsController = obs;
    workflowScheduler.setOBSController(obs);
  }

  private async loadWorkflows(): Promise<void> {
    this.workflows = await getAllWorkflows();
  }

  private async handleExecutionEvent(execution: WorkflowExecution): Promise<void> {
    // Show notification
    this.showNotification(
      execution.success
        ? `Workflow executed: ${execution.workflowName}`
        : `Workflow failed: ${execution.workflowName} - ${execution.error}`,
      execution.success ? 'success' : 'error',
    );

    // Reload workflows to get updated execution counts
    await this.loadWorkflows();
    this.render();
  }

  private render(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const filteredWorkflows = this.filterAndSortWorkflows();

    container.innerHTML = `
      <div class="scheduled-workflows">
        <div class="workflows-header">
          <h2>⏰ Scheduled Workflows</h2>
          <div class="header-actions">
            <button class="btn-scheduler-toggle ${workflowScheduler.isSchedulerRunning() ? 'active' : ''}">
              ${workflowScheduler.isSchedulerRunning() ? '⏸ Pause Scheduler' : '▶ Start Scheduler'}
            </button>
            <button class="btn-show-history">📊 ${this.showHistory ? 'Show Workflows' : 'Show History'}</button>
            <button class="btn-create-workflow">➕ New Workflow</button>
          </div>
        </div>

        ${this.showHistory ? this.renderHistory() : this.renderWorkflowList(filteredWorkflows)}
      </div>

      ${this.isCreating || this.isEditing ? this.renderWorkflowModal() : ''}
    `;
  }

  private renderWorkflowList(workflows: ScheduledWorkflow[]): string {
    if (workflows.length === 0) {
      return `
        <div class="empty-state">
          <p>No scheduled workflows yet</p>
          <p class="hint">Create a workflow to automate scene switching and actions</p>
        </div>
      `;
    }

    return `
      <div class="workflow-list">
        ${workflows.map((w) => this.renderWorkflowCard(w)).join('')}
      </div>
    `;
  }

  private renderWorkflowCard(workflow: ScheduledWorkflow): string {
    const nextExecText = workflow.nextExecution
      ? this.formatTimeUntil(workflow.nextExecution)
      : 'No upcoming execution';

    return `
      <div class="workflow-card" data-workflow-id="${workflow.id}">
        <div class="workflow-card-header" style="border-left-color: ${workflow.color || '#3B82F6'}">
          <div class="workflow-info">
            <h3>${workflow.name}</h3>
            <p class="workflow-description">${workflow.description}</p>
          </div>
          <div class="workflow-toggle">
            <label class="toggle-switch">
              <input type="checkbox" ${workflow.enabled ? 'checked' : ''} data-action="toggle" data-workflow-id="${workflow.id}">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="workflow-details">
          <div class="detail-item">
            <span class="detail-label">Schedule:</span>
            <span class="detail-value">${getScheduleDescription(workflow.schedule)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Actions:</span>
            <span class="detail-value">${workflow.actions.length} action(s)</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Next Run:</span>
            <span class="detail-value ${workflow.enabled ? 'highlight' : ''}">${nextExecText}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Executions:</span>
            <span class="detail-value">${workflow.executionCount}</span>
          </div>
        </div>

        <div class="workflow-actions">
          <button class="btn-workflow-action btn-edit" data-action="edit" data-workflow-id="${workflow.id}">✏️ Edit</button>
          <button class="btn-workflow-action btn-trigger" data-action="trigger" data-workflow-id="${workflow.id}" ${!this.obsController ? 'disabled' : ''}>▶ Run Now</button>
          <button class="btn-workflow-action btn-delete" data-action="delete" data-workflow-id="${workflow.id}">🗑️ Delete</button>
        </div>
      </div>
    `;
  }

  private renderHistory(): string {
    return `
      <div class="workflow-history">
        <h3>Execution History</h3>
        <div class="history-list">
          ${this.executionHistory.length === 0 ? '<p class="empty-state">No execution history yet</p>' : this.executionHistory.map((e) => this.renderExecutionRow(e)).join('')}
        </div>
      </div>
    `;
  }

  private renderExecutionRow(execution: WorkflowExecution): string {
    return `
      <div class="execution-row ${execution.success ? 'success' : 'failed'}">
        <span class="execution-time">${execution.executedAt.toLocaleString()}</span>
        <span class="execution-workflow">${execution.workflowName}</span>
        <span class="execution-status">${execution.success ? '✅ Success' : '❌ Failed'}</span>
        <span class="execution-duration">${formatDuration(execution.duration)}</span>
        ${execution.error ? `<span class="execution-error">${execution.error}</span>` : ''}
      </div>
    `;
  }

  private renderWorkflowModal(): string {
    const workflow = this.selectedWorkflowId
      ? this.workflows.find((w) => w.id === this.selectedWorkflowId)
      : null;

    const formData = workflow || {
      name: '',
      description: '',
      enabled: true,
      schedule: { ...DEFAULT_WORKFLOW_SCHEDULE },
      actions: [],
      color: WORKFLOW_COLORS[0],
      tags: [],
    };

    return `
      <div class="workflow-modal-backdrop">
        <div class="workflow-modal">
          <div class="modal-header">
            <h2>${this.isCreating ? 'Create Workflow' : 'Edit Workflow'}</h2>
            <button class="btn-close-modal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>Workflow Name</label>
              <input type="text" id="workflow-name" value="${formData.name}" placeholder="e.g., Switch to BRB every 15 minutes">
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea id="workflow-description" placeholder="What does this workflow do?">${formData.description}</textarea>
            </div>

            <div class="form-group">
              <label>Schedule Type</label>
              <select id="schedule-type">
                <option value="once" ${formData.schedule.type === 'once' ? 'selected' : ''}>One-time</option>
                <option value="daily" ${formData.schedule.type === 'daily' ? 'selected' : ''}>Daily</option>
                <option value="weekly" ${formData.schedule.type === 'weekly' ? 'selected' : ''}>Weekly</option>
                <option value="interval" ${formData.schedule.type === 'interval' ? 'selected' : ''}>Interval</option>
              </select>
            </div>

            <div id="schedule-config">
              ${this.renderScheduleConfig(formData.schedule)}
            </div>

            <div class="form-group">
              <label>Color</label>
              <div class="color-picker">
                ${WORKFLOW_COLORS.map(
                  (color) => `
                  <div class="color-option ${formData.color === color ? 'selected' : ''}" data-color="${color}" style="background-color: ${color}"></div>
                `,
                ).join('')}
              </div>
            </div>

            <div class="form-group">
              <label>Actions</label>
              <div id="workflow-actions">
                ${formData.actions.map((action, idx) => this.renderActionRow(action, idx)).join('')}
              </div>
              <button class="btn-add-action">➕ Add Action</button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-save-workflow">Save Workflow</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderScheduleConfig(schedule: {
    type: RecurrenceType;
    date?: string;
    time?: string;
    daysOfWeek?: DayOfWeek[];
    intervalMinutes?: number;
  }): string {
    switch (schedule.type) {
      case 'once':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="schedule-date" value="${schedule.date || ''}">
            </div>
            <div class="form-group">
              <label>Time</label>
              <input type="time" id="schedule-time" value="${schedule.time || '12:00'}">
            </div>
          </div>
        `;

      case 'daily':
        return `
          <div class="form-group">
            <label>Time</label>
            <input type="time" id="schedule-time" value="${schedule.time || '12:00'}">
          </div>
        `;

      case 'weekly':
        return `
          <div class="form-group">
            <label>Days of Week</label>
            <div class="day-picker">
              ${(
                [
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                  'sunday',
                ] as DayOfWeek[]
              )
                .map(
                  (day) => `
                  <label class="day-option">
                    <input type="checkbox" value="${day}" ${schedule.daysOfWeek?.includes(day) ? 'checked' : ''}>
                    ${day.charAt(0).toUpperCase()}
                  </label>
                `,
                )
                .join('')}
            </div>
          </div>
          <div class="form-group">
            <label>Time</label>
            <input type="time" id="schedule-time" value="${schedule.time || '12:00'}">
          </div>
        `;

      case 'interval':
        return `
          <div class="form-group">
            <label>Interval (minutes)</label>
            <input type="number" id="schedule-interval" min="1" value="${schedule.intervalMinutes || 15}">
          </div>
        `;

      default:
        return '';
    }
  }

  private renderActionRow(action: WorkflowAction, index: number): string {
    return `
      <div class="action-row" data-action-index="${index}">
        <select class="action-type">
          <option value="switch-scene" ${action.type === 'switch-scene' ? 'selected' : ''}>Switch Scene</option>
          <option value="start-recording" ${action.type === 'start-recording' ? 'selected' : ''}>Start Recording</option>
          <option value="stop-recording" ${action.type === 'stop-recording' ? 'selected' : ''}>Stop Recording</option>
          <option value="start-streaming" ${action.type === 'start-streaming' ? 'selected' : ''}>Start Streaming</option>
          <option value="stop-streaming" ${action.type === 'stop-streaming' ? 'selected' : ''}>Stop Streaming</option>
        </select>

        ${
          action.type === 'switch-scene'
            ? `
          <input type="text" class="action-scene" placeholder="Scene name" value="${action.sceneName || ''}">
        `
            : ''
        }

        <input type="number" class="action-delay" placeholder="Delay (ms)" value="${action.delay || 0}" min="0">

        <button class="btn-remove-action" data-action-index="${index}">🗑️</button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Scheduler toggle
      if (target.classList.contains('btn-scheduler-toggle')) {
        if (workflowScheduler.isSchedulerRunning()) {
          workflowScheduler.stop();
        } else {
          workflowScheduler.start();
        }
        this.render();
        return;
      }

      // Show history toggle
      if (target.classList.contains('btn-show-history')) {
        this.showHistory = !this.showHistory;
        if (this.showHistory) {
          this.executionHistory = await getAllExecutions();
        }
        this.render();
        return;
      }

      // Create workflow
      if (target.classList.contains('btn-create-workflow')) {
        this.isCreating = true;
        this.selectedWorkflowId = null;
        this.render();
        return;
      }

      // Workflow actions
      const action = target.dataset.action;
      const workflowId = target.dataset.workflowId;

      if (action && workflowId) {
        await this.handleWorkflowAction(action, workflowId);
      }

      // Modal close
      if (target.classList.contains('btn-close-modal') || target.classList.contains('btn-cancel')) {
        this.isCreating = false;
        this.isEditing = false;
        this.selectedWorkflowId = null;
        this.render();
        return;
      }

      // Save workflow
      if (target.classList.contains('btn-save-workflow')) {
        await this.saveWorkflowFromForm();
        return;
      }

      // Add action
      if (target.classList.contains('btn-add-action')) {
        // Handle dynamically in modal
        return;
      }
    });
  }

  private async handleWorkflowAction(action: string, workflowId: string): Promise<void> {
    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    switch (action) {
      case 'toggle':
        workflow.enabled = !workflow.enabled;
        await saveWorkflow(workflow);
        this.render();
        this.showNotification(`Workflow ${workflow.enabled ? 'enabled' : 'disabled'}`, 'info');
        break;

      case 'edit':
        this.isEditing = true;
        this.selectedWorkflowId = workflowId;
        this.render();
        break;

      case 'trigger':
        if (!this.obsController) {
          this.showNotification('OBS not connected', 'error');
          return;
        }
        await workflowScheduler.triggerWorkflow(workflow);
        break;

      case 'delete':
        if (confirm(`Delete workflow "${workflow.name}"?`)) {
          await deleteWorkflow(workflowId);
          await this.loadWorkflows();
          this.render();
          this.showNotification('Workflow deleted', 'info');
        }
        break;
    }
  }

  private async saveWorkflowFromForm(): Promise<void> {
    // Extract form data
    const name = (document.getElementById('workflow-name') as HTMLInputElement)?.value || '';
    const description =
      (document.getElementById('workflow-description') as HTMLTextAreaElement)?.value || '';
    const scheduleType = (document.getElementById('schedule-type') as HTMLSelectElement)
      ?.value as RecurrenceType;

    // Build workflow object
    const workflow: Partial<ScheduledWorkflow> = {
      id: this.selectedWorkflowId || generateWorkflowId(),
      name,
      description,
      enabled: true,
      schedule: {
        type: scheduleType,
        time: (document.getElementById('schedule-time') as HTMLInputElement)?.value,
        date: (document.getElementById('schedule-date') as HTMLInputElement)?.value,
        intervalMinutes: parseInt(
          (document.getElementById('schedule-interval') as HTMLInputElement)?.value || '15',
          10,
        ),
        daysOfWeek: Array.from(document.querySelectorAll('.day-picker input:checked')).map(
          (el) => (el as HTMLInputElement).value as DayOfWeek,
        ),
      },
      actions: [],
      createdAt: new Date(),
      lastModified: new Date(),
      executionCount: 0,
      tags: [],
      color:
        document.querySelector('.color-option.selected')?.getAttribute('data-color') ||
        WORKFLOW_COLORS[0],
    };

    // Validate
    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      this.showNotification(`Validation failed: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    // Save
    await saveWorkflow(workflow as ScheduledWorkflow);
    await this.loadWorkflows();

    this.isCreating = false;
    this.isEditing = false;
    this.selectedWorkflowId = null;
    this.render();

    this.showNotification('Workflow saved', 'success');
  }

  private filterAndSortWorkflows(): ScheduledWorkflow[] {
    let filtered = [...this.workflows];

    // Filter by search query
    if (this.filter.searchQuery) {
      const query = this.filter.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) => w.name.toLowerCase().includes(query) || w.description.toLowerCase().includes(query),
      );
    }

    // Filter by enabled status
    if (this.filter.enabled !== undefined) {
      filtered = filtered.filter((w) => w.enabled === this.filter.enabled);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.filter.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'nextExecution':
          if (!a.nextExecution) return 1;
          if (!b.nextExecution) return -1;
          return a.nextExecution.getTime() - b.nextExecution.getTime();
        case 'lastExecuted':
          if (!a.lastExecuted) return 1;
          if (!b.lastExecuted) return -1;
          return b.lastExecuted.getTime() - a.lastExecuted.getTime();
        case 'executionCount':
          return b.executionCount - a.executionCount;
        default:
          return 0;
      }
    });

    return filtered;
  }

  private formatTimeUntil(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `In ${days} day(s)`;
    if (hours > 0) return `In ${hours} hour(s)`;
    if (minutes > 0) return `In ${minutes} minute(s)`;
    return 'Any moment now';
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Helper to get all executions (temp export for UI)
async function getAllExecutions(): Promise<WorkflowExecution[]> {
  const { getAllExecutions } = await import('./scheduledWorkflowStorage.js');
  return getAllExecutions();
}
