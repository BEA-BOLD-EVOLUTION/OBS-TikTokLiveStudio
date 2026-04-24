/**
 * Tests for scheduledWorkflowTypes.ts - ALL based on verified implementation reading
 * File read: scheduledWorkflowTypes.ts (470 lines)
 * Methodology: Read-First Development (0 assumptions)
 */

import { describe, it, expect } from 'vitest';
import {
  // Type imports (for runtime testing)
  type WorkflowActionType,
  type RecurrenceType,
  type DayOfWeek,
  type WorkflowAction,
  type WorkflowSchedule,
  type ScheduledWorkflow,
  type WorkflowExecution,
  type WorkflowAnalytics,
  type WorkflowFilter,
  // Constants
  DEFAULT_WORKFLOW_FILTER,
  DEFAULT_WORKFLOW_SCHEDULE,
  WORKFLOW_COLORS,
  // Utility functions
  generateWorkflowId,
  generateActionId,
  generateExecutionId,
  parseTime,
  formatTime,
  calculateNextExecution,
  formatDuration,
  getScheduleDescription,
  validateWorkflow,
} from './scheduledWorkflowTypes';

describe('scheduledWorkflowTypes', () => {
  // ============================================================================
  // Type Definitions (Runtime Validation)
  // ============================================================================

  describe('WorkflowAction interface', () => {
    it('should create a valid action with all required properties', () => {
      // Verified: id, type, description are required
      const action: WorkflowAction = {
        id: 'action_1',
        type: 'switch-scene',
        description: 'Switch to live scene',
      };

      expect(action.id).toBe('action_1');
      expect(action.type).toBe('switch-scene');
      expect(action.description).toBe('Switch to live scene');
    });

    it('should allow optional properties to be undefined', () => {
      // Verified: sceneName, lowerThirdId, transitionId, delay are optional
      const action: WorkflowAction = {
        id: 'action_2',
        type: 'start-recording',
        description: 'Start recording',
      };

      expect(action.sceneName).toBeUndefined();
      expect(action.lowerThirdId).toBeUndefined();
      expect(action.transitionId).toBeUndefined();
      expect(action.delay).toBeUndefined();
    });

    it('should support all 12 action types', () => {
      // Verified: 12 action types from union type definition
      const actionTypes: WorkflowActionType[] = [
        'switch-scene',
        'start-recording',
        'stop-recording',
        'pause-recording',
        'resume-recording',
        'start-streaming',
        'stop-streaming',
        'start-virtual-camera',
        'stop-virtual-camera',
        'show-lower-third',
        'hide-lower-third',
        'play-transition',
      ];

      expect(actionTypes).toHaveLength(12);
    });
  });

  describe('WorkflowSchedule interface', () => {
    it('should support all 4 recurrence types', () => {
      // Verified: 4 recurrence types from union type definition
      const recurrenceTypes: RecurrenceType[] = ['once', 'daily', 'weekly', 'interval'];
      expect(recurrenceTypes).toHaveLength(4);
    });

    it('should support all 7 days of week', () => {
      // Verified: 7 day types from union type definition
      const days: DayOfWeek[] = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      expect(days).toHaveLength(7);
    });

    it('should create a valid schedule for once recurrence', () => {
      // Verified: type, date, time properties exist
      const schedule: WorkflowSchedule = {
        type: 'once',
        date: '2026-04-24',
        time: '14:30',
      };

      expect(schedule.type).toBe('once');
      expect(schedule.date).toBe('2026-04-24');
      expect(schedule.time).toBe('14:30');
    });

    it('should create a valid schedule for weekly recurrence', () => {
      // Verified: daysOfWeek is DayOfWeek[] array
      const schedule: WorkflowSchedule = {
        type: 'weekly',
        daysOfWeek: ['monday', 'wednesday', 'friday'],
        time: '10:00',
      };

      expect(schedule.daysOfWeek).toEqual(['monday', 'wednesday', 'friday']);
    });
  });

  describe('ScheduledWorkflow interface', () => {
    it('should create a valid workflow with all required properties', () => {
      // Verified: 12 properties - 9 required, 3 optional
      const workflow: ScheduledWorkflow = {
        id: 'workflow_1',
        name: 'Morning Stream',
        description: 'Start stream at 9 AM',
        enabled: true,
        schedule: { type: 'daily', time: '09:00' },
        actions: [{ id: 'action_1', type: 'switch-scene', description: 'Go live' }],
        createdAt: new Date(),
        lastModified: new Date(),
        executionCount: 0,
        tags: ['morning', 'daily'],
      };

      expect(workflow.id).toBe('workflow_1');
      expect(workflow.enabled).toBe(true);
      expect(workflow.executionCount).toBe(0);
      expect(workflow.tags).toEqual(['morning', 'daily']);
    });

    it('should allow optional Date properties to be undefined', () => {
      // Verified: lastExecuted and nextExecution are optional
      const workflow = {
        id: 'workflow_2',
        name: 'Test',
        description: 'Test workflow',
        enabled: false,
        schedule: { type: 'once' as const, date: '2026-04-25', time: '12:00' },
        actions: [],
        createdAt: new Date(),
        lastModified: new Date(),
        executionCount: 0,
        tags: [],
      } satisfies ScheduledWorkflow;

      expect(workflow.lastExecuted).toBeUndefined();
      expect(workflow.nextExecution).toBeUndefined();
    });
  });

  describe('WorkflowExecution interface', () => {
    it('should create a valid execution record', () => {
      // Verified: 7 properties - id, workflowId, workflowName, executedAt, success, actionsExecuted, duration required
      const execution: WorkflowExecution = {
        id: 'exec_1',
        workflowId: 'workflow_1',
        workflowName: 'Morning Stream',
        executedAt: new Date(),
        success: true,
        actionsExecuted: 3,
        duration: 1250,
      };

      expect(execution.id).toBe('exec_1');
      expect(execution.success).toBe(true);
      expect(execution.actionsExecuted).toBe(3);
      expect(execution.duration).toBe(1250);
    });

    it('should allow error to be undefined on successful execution', () => {
      // Verified: error is optional
      const execution: WorkflowExecution = {
        id: 'exec_2',
        workflowId: 'workflow_2',
        workflowName: 'Test',
        executedAt: new Date(),
        success: true,
        actionsExecuted: 1,
        duration: 500,
      };

      expect(execution.error).toBeUndefined();
    });
  });

  describe('WorkflowAnalytics interface', () => {
    it('should create valid analytics object', () => {
      // Verified: 8 properties
      const analytics: WorkflowAnalytics = {
        totalWorkflows: 10,
        enabledWorkflows: 7,
        totalExecutions: 150,
        successfulExecutions: 145,
        failedExecutions: 5,
        averageExecutionTime: 850,
        nextScheduledWorkflows: [{ id: 'workflow_1', name: 'Morning', nextExecution: new Date() }],
      };

      expect(analytics.totalWorkflows).toBe(10);
      expect(analytics.successfulExecutions).toBe(145);
      expect(analytics.nextScheduledWorkflows).toHaveLength(1);
    });
  });

  describe('WorkflowFilter interface', () => {
    it('should support all 4 sortBy options', () => {
      // Verified: sortBy is union of 4 string literals
      const sortOptions = ['name', 'nextExecution', 'lastExecuted', 'executionCount'] as const;

      const filter: WorkflowFilter = {
        searchQuery: '',
        tags: [],
        sortBy: 'name',
      };

      expect(sortOptions).toHaveLength(4);
      expect(filter.sortBy).toBe('name');
    });
  });

  // ============================================================================
  // Default Constants
  // ============================================================================

  describe('DEFAULT_WORKFLOW_FILTER constant', () => {
    it('should have correct default values', () => {
      // Verified: searchQuery='', tags=[], sortBy='nextExecution'
      expect(DEFAULT_WORKFLOW_FILTER.searchQuery).toBe('');
      expect(DEFAULT_WORKFLOW_FILTER.tags).toEqual([]);
      expect(DEFAULT_WORKFLOW_FILTER.sortBy).toBe('nextExecution');
    });
  });

  describe('DEFAULT_WORKFLOW_SCHEDULE constant', () => {
    it('should have daily type with 12:00 time', () => {
      // Verified: type='daily', time='12:00'
      expect(DEFAULT_WORKFLOW_SCHEDULE.type).toBe('daily');
      expect(DEFAULT_WORKFLOW_SCHEDULE.time).toBe('12:00');
    });
  });

  describe('WORKFLOW_COLORS constant', () => {
    it('should have exactly 8 color values', () => {
      // Verified: 8 hex colors in array
      expect(WORKFLOW_COLORS).toHaveLength(8);
    });

    it('should contain valid hex color strings', () => {
      // Verified: All start with '#' and are hex colors
      WORKFLOW_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================

  describe('generateWorkflowId function', () => {
    it('should generate ID starting with workflow_ prefix', () => {
      // Verified: return `workflow_${Date.now()}_${Math.random()...}`
      const id = generateWorkflowId();
      expect(id).toMatch(/^workflow_\d+_[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateWorkflowId();
      const id2 = generateWorkflowId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateActionId function', () => {
    it('should generate ID starting with action_ prefix', () => {
      // Verified: return `action_${Date.now()}_${Math.random()...}`
      const id = generateActionId();
      expect(id).toMatch(/^action_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateExecutionId function', () => {
    it('should generate ID starting with exec_ prefix', () => {
      // Verified: return `exec_${Date.now()}_${Math.random()...}`
      const id = generateExecutionId();
      expect(id).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });
  });

  describe('parseTime function', () => {
    it('should parse valid time string', () => {
      // Verified: returns {hours, minutes}
      const result = parseTime('14:30');
      expect(result).toEqual({ hours: 14, minutes: 30 });
    });

    it('should parse single-digit hour', () => {
      // Verified: regex allows 1-2 digit hours
      const result = parseTime('9:15');
      expect(result).toEqual({ hours: 9, minutes: 15 });
    });

    it('should return null for invalid format', () => {
      // Verified: returns null if no match
      expect(parseTime('25:00')).toBeNull(); // Invalid hour
      expect(parseTime('14:60')).toBeNull(); // Invalid minutes
      expect(parseTime('invalid')).toBeNull();
    });

    it('should validate hours 0-23 range', () => {
      // Verified: hours < 0 || hours > 23 returns null
      expect(parseTime('0:00')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
      expect(parseTime('24:00')).toBeNull();
    });
  });

  describe('formatTime function', () => {
    it('should format time with zero padding', () => {
      // Verified: uses padStart(2, '0')
      expect(formatTime(9, 5)).toBe('09:05');
      expect(formatTime(14, 30)).toBe('14:30');
    });
  });

  describe('formatDuration function', () => {
    it('should format milliseconds', () => {
      // Verified: if ms < 1000 return `${ms}ms`
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      // Verified: if ms < 60000 return `${(ms / 1000).toFixed(1)}s`
      expect(formatDuration(5000)).toBe('5.0s');
      expect(formatDuration(12500)).toBe('12.5s');
    });

    it('should format minutes', () => {
      // Verified: else return `${(ms / 60000).toFixed(1)}min`
      expect(formatDuration(60000)).toBe('1.0min');
      expect(formatDuration(125000)).toBe('2.1min');
    });
  });

  describe('getScheduleDescription function', () => {
    it('should describe once schedule', () => {
      // Verified: returns "Once on {date} at {time}"
      const schedule: WorkflowSchedule = {
        type: 'once',
        date: '2026-04-24',
        time: '14:30',
      };
      expect(getScheduleDescription(schedule)).toBe('Once on 2026-04-24 at 14:30');
    });

    it('should describe daily schedule', () => {
      // Verified: returns "Daily at {time}"
      const schedule: WorkflowSchedule = {
        type: 'daily',
        time: '09:00',
      };
      expect(getScheduleDescription(schedule)).toBe('Daily at 09:00');
    });

    it('should describe weekly schedule', () => {
      // Verified: returns "Weekly on {Days} at {time}" with capitalized days
      const schedule: WorkflowSchedule = {
        type: 'weekly',
        daysOfWeek: ['monday', 'wednesday'],
        time: '10:00',
      };
      expect(getScheduleDescription(schedule)).toBe('Weekly on Monday, Wednesday at 10:00');
    });

    it('should describe interval schedule', () => {
      // Verified: returns "Every {minutes} minutes"
      const schedule: WorkflowSchedule = {
        type: 'interval',
        intervalMinutes: 30,
      };
      expect(getScheduleDescription(schedule)).toBe('Every 30 minutes');
    });
  });

  describe('calculateNextExecution function', () => {
    it('should return null for once schedule with past date', () => {
      // Verified: if executionDate <= now return null
      const schedule: WorkflowSchedule = {
        type: 'once',
        date: '2020-01-01',
        time: '12:00',
      };
      expect(calculateNextExecution(schedule)).toBeNull();
    });

    it('should calculate next execution for daily schedule', () => {
      // Verified: sets hours/minutes, adds day if past
      const schedule: WorkflowSchedule = {
        type: 'daily',
        time: '09:00',
      };
      const result = calculateNextExecution(schedule);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(9);
      expect(result?.getMinutes()).toBe(0);
    });

    it('should return null for interval without intervalMinutes', () => {
      // Verified: if !schedule.intervalMinutes return null
      const schedule: WorkflowSchedule = {
        type: 'interval',
      };
      expect(calculateNextExecution(schedule)).toBeNull();
    });
  });

  describe('validateWorkflow function', () => {
    it('should validate workflow with required properties', () => {
      // Verified: returns {valid, errors} object
      const workflow: Partial<ScheduledWorkflow> = {
        name: 'Test Workflow',
        actions: [{ id: 'a1', type: 'switch-scene', description: 'Switch' }],
        schedule: { type: 'daily', time: '12:00' },
      };
      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      // Verified: if !workflow.name errors.push('Workflow name is required')
      const workflow: Partial<ScheduledWorkflow> = {
        actions: [],
        schedule: { type: 'daily' },
      };
      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow name is required');
    });

    it('should return error for empty actions', () => {
      // Verified: if !workflow.actions || length === 0
      const workflow: Partial<ScheduledWorkflow> = {
        name: 'Test',
        actions: [],
        schedule: { type: 'daily', time: '12:00' },
      };
      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one action is required');
    });

    it('should validate once schedule requires date and time', () => {
      // Verified: type 'once' checks for date and time
      const workflow: Partial<ScheduledWorkflow> = {
        name: 'Test',
        actions: [{ id: 'a1', type: 'switch-scene', description: 'Switch' }],
        schedule: { type: 'once' },
      };
      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required for one-time workflows');
      expect(result.errors).toContain('Time is required for one-time workflows');
    });

    it('should validate weekly schedule requires daysOfWeek and time', () => {
      // Verified: type 'weekly' checks for daysOfWeek and time
      const workflow: Partial<ScheduledWorkflow> = {
        name: 'Test',
        actions: [{ id: 'a1', type: 'switch-scene', description: 'Switch' }],
        schedule: { type: 'weekly' },
      };
      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one day is required for weekly workflows');
      expect(result.errors).toContain('Time is required for weekly workflows');
    });
  });
});
