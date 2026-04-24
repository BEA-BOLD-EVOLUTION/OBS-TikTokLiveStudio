/**
 * Tests for GoLiveUI - Go Live workflow UI component
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoLiveUI } from './goLiveUI';
import type { GoLiveState } from './goLiveTypes';

// Mock GoLiveWorkflow
const mockWorkflow = {
  start: vi.fn(),
  cancel: vi.fn(),
  confirmChecklist: vi.fn(),
  updateChecklistItem: vi.fn(),
  getState: vi.fn(),
  onStateChange: vi.fn(),
};

describe('GoLiveUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    // Default state
    mockWorkflow.getState.mockReturnValue({
      currentStep: 'idle',
      preflightChecks: [],
      userChecklist: [],
      isLive: false,
      error: null,
    } satisfies GoLiveState);

    // Default onStateChange subscription (calls callback immediately)
    mockWorkflow.onStateChange.mockImplementation((callback: (state: GoLiveState) => void) => {
      callback(mockWorkflow.getState());
      return vi.fn(); // Return unsubscribe function
    });
  });

  describe('constructor', () => {
    it('should throw error if container not found', () => {
      expect(() => new GoLiveUI('nonexistent-container', mockWorkflow as never)).toThrow(
        'Container element #nonexistent-container not found',
      );
    });

    it('should initialize successfully with valid container', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      const ui = new GoLiveUI('go-live-container', mockWorkflow as never);

      expect(ui).toBeInstanceOf(GoLiveUI);
      expect(mockWorkflow.onStateChange).toHaveBeenCalledOnce();
    });
  });

  describe('idle state', () => {
    it('should render Go Live button', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const button = container.querySelector('.btn-go-live');
      expect(button).toBeTruthy();
      expect(button?.textContent).toContain('Go Live');
    });

    it('should call workflow.start() when button clicked', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const button = container.querySelector<HTMLButtonElement>('.btn-go-live');
      button?.click();

      expect(mockWorkflow.start).toHaveBeenCalledOnce();
    });
  });

  describe('preflight state', () => {
    it('should render pre-flight checks modal', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'preflight',
        preflightChecks: [
          {
            id: 'obs-connected',
            label: 'OBS Connected',
            status: 'passed',
            description: 'Connected to OBS WebSocket',
            errorMessage: null,
          },
          {
            id: 'scenes-exist',
            label: 'Scenes Exist',
            status: 'running',
            description: 'Checking required scenes...',
            errorMessage: null,
          },
        ],
        userChecklist: [],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const modal = container.querySelector('.go-live-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Pre-Flight Checks');

      const checks = container.querySelectorAll('.preflight-check');
      expect(checks).toHaveLength(2);
      expect(checks[0].textContent).toContain('OBS Connected');
      expect(checks[1].textContent).toContain('Scenes Exist');
    });
  });

  describe('starting state', () => {
    it('should render starting modal with progress steps', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'starting',
        preflightChecks: [],
        userChecklist: [],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const modal = container.querySelector('.go-live-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Starting...');
      expect(modal?.textContent).toContain('Pre-flight checks passed');
      expect(modal?.textContent).toContain('Switching to starting scene');
    });
  });

  describe('checklist state', () => {
    it('should render user checklist modal', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [
          {
            id: 'tiktok-ready',
            label: 'TikTok Live Studio ready',
            description: 'Live Studio is open and ready to accept virtual camera',
            checked: false,
            required: true,
          },
          {
            id: 'audio-levels',
            label: 'Audio levels checked',
            description: 'Microphone and music levels are balanced',
            checked: false,
            required: false,
          },
        ],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const modal = container.querySelector('.go-live-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Ready to Go Live?');

      const checkboxes = container.querySelectorAll<HTMLInputElement>(
        '.checklist-item input[type="checkbox"]',
      );
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0].required).toBe(true);
      expect(checkboxes[1].required).toBe(false);
    });

    it('should disable confirm button if required items not checked', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [
          {
            id: 'tiktok-ready',
            label: 'TikTok Live Studio ready',
            checked: false,
            required: true,
          },
        ],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const confirmButton = container.querySelector<HTMLButtonElement>('.btn-confirm');
      expect(confirmButton?.disabled).toBe(true);
    });

    it('should enable confirm button if all required items checked', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [
          {
            id: 'tiktok-ready',
            label: 'TikTok Live Studio ready',
            checked: true,
            required: true,
          },
        ],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const confirmButton = container.querySelector<HTMLButtonElement>('.btn-confirm');
      expect(confirmButton?.disabled).toBe(false);
    });

    it('should call workflow.updateChecklistItem() when checkbox changed', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [
          {
            id: 'tiktok-ready',
            label: 'TikTok Live Studio ready',
            checked: false,
            required: true,
          },
        ],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const checkbox = container.querySelector<HTMLInputElement>(
        'input[data-item-id="tiktok-ready"]',
      );
      checkbox!.checked = true;
      checkbox?.dispatchEvent(new Event('change'));

      expect(mockWorkflow.updateChecklistItem).toHaveBeenCalledWith('tiktok-ready', true);
    });

    it('should call workflow.cancel() when cancel button clicked', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const cancelButton = container.querySelector<HTMLButtonElement>('.btn-cancel');
      cancelButton?.click();

      expect(mockWorkflow.cancel).toHaveBeenCalledOnce();
    });

    it('should call workflow.confirmChecklist() when confirm button clicked', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'checklist',
        preflightChecks: [],
        userChecklist: [
          {
            id: 'tiktok-ready',
            label: 'TikTok Live Studio ready',
            checked: true,
            required: true,
          },
        ],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const confirmButton = container.querySelector<HTMLButtonElement>('.btn-confirm');
      confirmButton?.click();

      expect(mockWorkflow.confirmChecklist).toHaveBeenCalledOnce();
    });
  });

  describe('going-live state', () => {
    it('should render going live modal', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'going-live',
        preflightChecks: [],
        userChecklist: [],
        isLive: false,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const modal = container.querySelector('.go-live-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Going Live!');
    });
  });

  describe('live state', () => {
    it('should render live state indicator', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'live',
        preflightChecks: [],
        userChecklist: [],
        isLive: true,
        error: null,
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const liveContainer = container.querySelector('.go-live-container');
      expect(liveContainer).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('should render error modal with error message', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'error',
        preflightChecks: [],
        userChecklist: [],
        isLive: false,
        error: 'Failed to connect to OBS',
      } satisfies GoLiveState);

      new GoLiveUI('go-live-container', mockWorkflow as never);

      const modal = container.querySelector('.go-live-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Failed to connect to OBS');
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from workflow state changes', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      const unsubscribe = vi.fn();
      mockWorkflow.onStateChange.mockReturnValue(unsubscribe);

      const ui = new GoLiveUI('go-live-container', mockWorkflow as never);
      ui.destroy();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('should handle destroy when already destroyed', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      const ui = new GoLiveUI('go-live-container', mockWorkflow as never);
      ui.destroy();
      ui.destroy(); // Should not throw

      expect(() => ui.destroy()).not.toThrow();
    });
  });

  describe('state changes', () => {
    it('should re-render when state changes', () => {
      const container = document.createElement('div');
      container.id = 'go-live-container';
      document.body.appendChild(container);

      let stateChangeCallback: ((state: GoLiveState) => void) | null = null;
      mockWorkflow.onStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        callback(mockWorkflow.getState());
        return vi.fn();
      });

      mockWorkflow.getState.mockReturnValue({
        currentStep: 'idle',
        preflightChecks: [],
        userChecklist: [],
        isLive: false,
        error: null,
      });

      new GoLiveUI('go-live-container', mockWorkflow as never);

      expect(container.querySelector('.btn-go-live')).toBeTruthy();

      // Simulate state change to preflight
      mockWorkflow.getState.mockReturnValue({
        currentStep: 'preflight',
        preflightChecks: [
          {
            id: 'obs-connected',
            label: 'OBS Connected',
            status: 'passed',
            description: null,
            errorMessage: null,
          },
        ],
        userChecklist: [],
        isLive: false,
        error: null,
      });

      stateChangeCallback!({
        currentStep: 'preflight',
        preflightChecks: [
          {
            id: 'obs-connected',
            label: 'OBS Connected',
            status: 'passed',
            description: null,
            errorMessage: null,
          },
        ],
        userChecklist: [],
        isLive: false,
        error: null,
      });

      expect(container.querySelector('.go-live-modal')).toBeTruthy();
      expect(container.querySelector('.btn-go-live')).toBeNull();
    });
  });
});
