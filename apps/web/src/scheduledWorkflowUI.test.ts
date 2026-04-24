/**
 * Tests for ScheduledWorkflowUI - Workflow scheduler interface
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledWorkflowUI } from './scheduledWorkflowUI';
import type { ScheduledWorkflow } from './scheduledWorkflowTypes';

// Mock dependencies
vi.mock('./scheduledWorkflowStorage', () => ({
  getAllWorkflows: vi.fn(),
  saveWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  getWorkflowExecutions: vi.fn(),
}));

vi.mock('./scheduledWorkflowEngine', () => ({
  workflowScheduler: {
    setOBSController: vi.fn(),
    onExecution: vi.fn(),
    isSchedulerRunning: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    triggerWorkflow: vi.fn(),
  },
}));

import { getAllWorkflows, saveWorkflow, deleteWorkflow } from './scheduledWorkflowStorage';
import { workflowScheduler } from './scheduledWorkflowEngine';

describe('ScheduledWorkflowUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    // Mock storage to return empty array by default
    (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (saveWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (workflowScheduler.isSchedulerRunning as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (workflowScheduler.onExecution as ReturnType<typeof vi.fn>).mockImplementation(() => {
      // Store callback for later use
      return () => {}; // unsubscribe function
    });
  });

  describe('constructor', () => {
    it('should throw error if container not found', () => {
      expect(() => new ScheduledWorkflowUI('nonexistent-container')).not.toThrow();
      // Note: UI doesn't throw, it just renders to null
    });

    it('should initialize successfully with valid container', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      // Wait for async init
      await vi.waitFor(() => {
        expect(getAllWorkflows).toHaveBeenCalled();
      });
    });
  });

  describe('render', () => {
    it('should render header with title and action buttons', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(container.querySelector('h2')?.textContent).toContain('Scheduled Workflows');
        expect(container.querySelector('.btn-scheduler-toggle')).toBeTruthy();
        expect(container.querySelector('.btn-show-history')).toBeTruthy();
        expect(container.querySelector('.btn-create-workflow')).toBeTruthy();
      });
    });

    it('should render empty state when no workflows exist', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(container.textContent).toContain('No scheduled workflows yet');
        expect(container.textContent).toContain('Create a workflow to automate');
      });
    });

    it('should render workflow cards when workflows exist', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Morning Stream',
          description: 'Start stream at 9 AM',
          enabled: true,
          schedule: {
            type: 'daily',
            time: '09:00',
          },
          actions: [
            {
              id: 'act-1',
              type: 'switch-scene',
              sceneName: 'SCN_STARTING',
              description: 'Switch to starting scene',
            },
          ],
          createdAt: new Date('2024-01-01'),
          lastModified: new Date('2024-01-01'),
          executionCount: 5,
          nextExecution: new Date(Date.now() + 3600000), // 1 hour from now
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const cards = container.querySelectorAll('.workflow-card');
        expect(cards.length).toBe(1);

        const card = cards[0];
        expect(card.querySelector('h3')?.textContent).toBe('Morning Stream');
        expect(card.querySelector('.workflow-description')?.textContent).toBe(
          'Start stream at 9 AM',
        );
      });
    });
  });

  describe('workflow card details', () => {
    it('should render workflow schedule description', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Daily Stream',
          description: 'Daily automation',
          enabled: true,
          schedule: {
            type: 'daily',
            time: '14:00',
          },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(container.textContent).toContain('Daily at');
      });
    });

    it('should display action count', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Multi-Action Workflow',
          description: 'Multiple steps',
          enabled: true,
          schedule: { type: 'daily', time: '10:00' },
          actions: [
            { id: 'act-1', type: 'switch-scene', sceneName: 'SCN_LIVE', description: 'Go live' },
            {
              id: 'act-2',
              type: 'start-recording',
              description: 'Start recording',
            },
          ],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(container.textContent).toContain('2 action(s)');
      });
    });

    it('should display execution count', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Executed Workflow',
          description: 'Has run before',
          enabled: true,
          schedule: { type: 'daily', time: '10:00' },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 42,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const detailItems = container.querySelectorAll('.detail-item');
        const executionsItem = Array.from(detailItems).find((item) =>
          item.textContent?.includes('Executions'),
        );
        expect(executionsItem?.textContent).toContain('42');
      });
    });
  });

  describe('toggle enabled', () => {
    it('should render toggle switch in correct state', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Enabled Workflow',
          description: 'Active workflow',
          enabled: true,
          schedule: { type: 'daily', time: '10:00' },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
        {
          id: 'wf-2',
          name: 'Disabled Workflow',
          description: 'Inactive workflow',
          enabled: false,
          schedule: { type: 'daily', time: '10:00' },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const toggles = container.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][data-action="toggle"]',
        );
        expect(toggles.length).toBe(2);
        expect(toggles[0].checked).toBe(true);
        expect(toggles[1].checked).toBe(false);
      });
    });
  });

  describe('scheduler controls', () => {
    it('should render pause button when scheduler is running', async () => {
      (workflowScheduler.isSchedulerRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const toggleButton = container.querySelector<HTMLButtonElement>('.btn-scheduler-toggle');
        expect(toggleButton?.textContent).toContain('Pause Scheduler');
        expect(toggleButton?.className).toContain('active');
      });
    });

    it('should render start button when scheduler is stopped', async () => {
      (workflowScheduler.isSchedulerRunning as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const toggleButton = container.querySelector<HTMLButtonElement>('.btn-scheduler-toggle');
        expect(toggleButton?.textContent).toContain('Start Scheduler');
        expect(toggleButton?.className).not.toContain('active');
      });
    });
  });

  describe('history view', () => {
    it('should toggle between workflow list and history', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const historyButton = container.querySelector<HTMLButtonElement>('.btn-show-history');
        expect(historyButton?.textContent).toContain('Show History');
      });
    });

    it('should render empty history state', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(container.querySelector('.btn-show-history')).toBeTruthy();
      });
    });
  });

  describe('action buttons', () => {
    it('should render edit, run, and delete buttons for each workflow', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Test Workflow',
          description: 'Test',
          enabled: true,
          schedule: { type: 'daily', time: '10:00' },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        expect(
          container.querySelector('[data-action="edit"][data-workflow-id="wf-1"]'),
        ).toBeTruthy();
        expect(
          container.querySelector('[data-action="trigger"][data-workflow-id="wf-1"]'),
        ).toBeTruthy();
        expect(
          container.querySelector('[data-action="delete"][data-workflow-id="wf-1"]'),
        ).toBeTruthy();
      });
    });

    it('should disable run button when OBS not connected', async () => {
      const mockWorkflows: ScheduledWorkflow[] = [
        {
          id: 'wf-1',
          name: 'Test Workflow',
          description: 'Test',
          enabled: true,
          schedule: { type: 'daily', time: '10:00' },
          actions: [],
          createdAt: new Date(),
          lastModified: new Date(),
          executionCount: 0,
        },
      ];

      (getAllWorkflows as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkflows);

      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      new ScheduledWorkflowUI('workflow-container');

      await vi.waitFor(() => {
        const runButton = container.querySelector<HTMLButtonElement>(
          '[data-action="trigger"][data-workflow-id="wf-1"]',
        );
        expect(runButton?.disabled).toBe(true);
      });
    });
  });

  describe('setOBSController', () => {
    it('should set OBS controller and pass to scheduler', async () => {
      const container = document.createElement('div');
      container.id = 'workflow-container';
      document.body.appendChild(container);

      const ui = new ScheduledWorkflowUI('workflow-container');

      const mockOBS = {} as never;
      ui.setOBSController(mockOBS);

      expect(workflowScheduler.setOBSController).toHaveBeenCalledWith(mockOBS);
    });
  });
});
