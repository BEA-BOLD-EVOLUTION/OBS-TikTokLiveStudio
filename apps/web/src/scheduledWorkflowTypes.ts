/**
 * Type definitions for Scheduled Workflows feature
 * Automated scene switching and actions based on time rules
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Type of action to perform in a workflow
 */
export type WorkflowActionType =
  | 'switch-scene'
  | 'start-recording'
  | 'stop-recording'
  | 'pause-recording'
  | 'resume-recording'
  | 'start-streaming'
  | 'stop-streaming'
  | 'start-virtual-camera'
  | 'stop-virtual-camera'
  | 'show-lower-third'
  | 'hide-lower-third'
  | 'play-transition';

/**
 * Single action within a workflow
 */
export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  sceneName?: string; // For switch-scene
  lowerThirdId?: string; // For show-lower-third
  transitionId?: string; // For play-transition
  delay?: number; // Delay in milliseconds before executing this action
  description: string; // Human-readable description
}

/**
 * Recurrence pattern for scheduled workflows
 */
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'interval';

/**
 * Days of week for weekly recurrence
 */
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/**
 * Schedule configuration for when workflow should run
 */
export interface WorkflowSchedule {
  type: RecurrenceType;
  
  // For 'once' and 'daily'
  time?: string; // HH:mm format (e.g., "14:30")
  
  // For 'once' only
  date?: string; // YYYY-MM-DD format
  
  // For 'weekly'
  daysOfWeek?: DayOfWeek[]; // Which days to run
  
  // For 'interval'
  intervalMinutes?: number; // Run every N minutes
  
  // Optional time window (only run during these hours)
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
}

/**
 * Complete scheduled workflow rule
 */
export interface ScheduledWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  schedule: WorkflowSchedule;
  actions: WorkflowAction[];
  
  // Metadata
  createdAt: Date;
  lastModified: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  
  // Color coding for visual organization
  color?: string; // Hex color
  
  // Tags for filtering
  tags: string[];
}

/**
 * Execution history record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  executedAt: Date;
  success: boolean;
  error?: string;
  actionsExecuted: number;
  duration: number; // Milliseconds
}

/**
 * Analytics for workflow usage
 */
export interface WorkflowAnalytics {
  totalWorkflows: number;
  enabledWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  mostExecutedWorkflow?: string;
  averageExecutionTime: number;
  nextScheduledWorkflows: Array<{
    id: string;
    name: string;
    nextExecution: Date;
  }>;
}

/**
 * Filter options for workflow list
 */
export interface WorkflowFilter {
  searchQuery: string;
  enabled?: boolean; // Show only enabled or disabled
  recurrenceType?: RecurrenceType;
  tags: string[];
  sortBy: 'name' | 'nextExecution' | 'lastExecuted' | 'executionCount';
}

/**
 * UI state for workflow management
 */
export interface WorkflowUIState {
  selectedWorkflowId: string | null;
  isEditing: boolean;
  isCreating: boolean;
  filter: WorkflowFilter;
  showExecutionHistory: boolean;
  currentTime: Date;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_WORKFLOW_FILTER: WorkflowFilter = {
  searchQuery: '',
  tags: [],
  sortBy: 'nextExecution',
};

export const DEFAULT_WORKFLOW_SCHEDULE: WorkflowSchedule = {
  type: 'daily',
  time: '12:00',
};

export const WORKFLOW_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique workflow ID
 */
export function generateWorkflowId(): string {
  return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique action ID
 */
export function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique execution ID
 */
export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse time string (HH:mm) into hours and minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  return { hours, minutes };
}

/**
 * Format time components into HH:mm string
 */
export function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate next execution time for a workflow
 */
export function calculateNextExecution(schedule: WorkflowSchedule, fromDate: Date = new Date()): Date | null {
  const now = new Date(fromDate);
  
  switch (schedule.type) {
    case 'once': {
      if (!schedule.date || !schedule.time) return null;
      
      const [year, month, day] = schedule.date.split('-').map(Number);
      const time = parseTime(schedule.time);
      if (!time) return null;
      
      const executionDate = new Date(year, month - 1, day, time.hours, time.minutes, 0, 0);
      
      // If execution time has passed, return null (won't execute again)
      if (executionDate <= now) return null;
      
      return executionDate;
    }
    
    case 'daily': {
      if (!schedule.time) return null;
      const time = parseTime(schedule.time);
      if (!time) return null;
      
      const nextExec = new Date(now);
      nextExec.setHours(time.hours, time.minutes, 0, 0);
      
      // If today's execution time has passed, schedule for tomorrow
      if (nextExec <= now) {
        nextExec.setDate(nextExec.getDate() + 1);
      }
      
      // Check time window if specified
      if (schedule.startTime && schedule.endTime) {
        const start = parseTime(schedule.startTime);
        const end = parseTime(schedule.endTime);
        if (start && end) {
          const execHour = nextExec.getHours();
          const execMinute = nextExec.getMinutes();
          const execTime = execHour * 60 + execMinute;
          const startMinutes = start.hours * 60 + start.minutes;
          const endMinutes = end.hours * 60 + end.minutes;
          
          if (execTime < startMinutes || execTime > endMinutes) {
            return null; // Outside time window
          }
        }
      }
      
      return nextExec;
    }
    
    case 'weekly': {
      if (!schedule.time || !schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
        return null;
      }
      
      const time = parseTime(schedule.time);
      if (!time) return null;
      
      const dayMap: Record<DayOfWeek, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      
      const targetDays = schedule.daysOfWeek.map(d => dayMap[d]).sort((a, b) => a - b);
      const currentDay = now.getDay();
      
      // Find next matching day
      let daysUntilNext = 0;
      let foundDay = false;
      
      for (const targetDay of targetDays) {
        let diff = targetDay - currentDay;
        if (diff < 0) diff += 7;
        
        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + diff);
        candidateDate.setHours(time.hours, time.minutes, 0, 0);
        
        if (candidateDate > now) {
          daysUntilNext = diff;
          foundDay = true;
          break;
        }
      }
      
      // If no valid day found this week, take first day next week
      if (!foundDay) {
        daysUntilNext = 7 - currentDay + targetDays[0];
      }
      
      const nextExec = new Date(now);
      nextExec.setDate(nextExec.getDate() + daysUntilNext);
      nextExec.setHours(time.hours, time.minutes, 0, 0);
      
      return nextExec;
    }
    
    case 'interval': {
      if (!schedule.intervalMinutes) return null;
      
      const nextExec = new Date(now);
      nextExec.setMinutes(nextExec.getMinutes() + schedule.intervalMinutes);
      
      // Check time window if specified
      if (schedule.startTime && schedule.endTime) {
        const start = parseTime(schedule.startTime);
        const end = parseTime(schedule.endTime);
        if (start && end) {
          const execHour = nextExec.getHours();
          const execMinute = nextExec.getMinutes();
          const execTime = execHour * 60 + execMinute;
          const startMinutes = start.hours * 60 + start.minutes;
          const endMinutes = end.hours * 60 + end.minutes;
          
          if (execTime < startMinutes || execTime > endMinutes) {
            // Move to start of next time window
            const tomorrow = new Date(nextExec);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(start.hours, start.minutes, 0, 0);
            return tomorrow;
          }
        }
      }
      
      return nextExec;
    }
    
    default:
      return null;
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * Get human-readable description of schedule
 */
export function getScheduleDescription(schedule: WorkflowSchedule): string {
  switch (schedule.type) {
    case 'once':
      if (schedule.date && schedule.time) {
        return `Once on ${schedule.date} at ${schedule.time}`;
      }
      return 'Once (not configured)';
    
    case 'daily':
      if (schedule.time) {
        return `Daily at ${schedule.time}`;
      }
      return 'Daily (not configured)';
    
    case 'weekly':
      if (schedule.daysOfWeek && schedule.time) {
        const days = schedule.daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
        return `Weekly on ${days} at ${schedule.time}`;
      }
      return 'Weekly (not configured)';
    
    case 'interval':
      if (schedule.intervalMinutes) {
        return `Every ${schedule.intervalMinutes} minutes`;
      }
      return 'Interval (not configured)';
    
    default:
      return 'Unknown schedule';
  }
}

/**
 * Validate workflow configuration
 */
export function validateWorkflow(workflow: Partial<ScheduledWorkflow>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!workflow.name || workflow.name.trim() === '') {
    errors.push('Workflow name is required');
  }
  
  if (!workflow.actions || workflow.actions.length === 0) {
    errors.push('At least one action is required');
  }
  
  if (!workflow.schedule) {
    errors.push('Schedule configuration is required');
  } else {
    // Validate schedule based on type
    switch (workflow.schedule.type) {
      case 'once':
        if (!workflow.schedule.date) errors.push('Date is required for one-time workflows');
        if (!workflow.schedule.time) errors.push('Time is required for one-time workflows');
        break;
      
      case 'daily':
        if (!workflow.schedule.time) errors.push('Time is required for daily workflows');
        break;
      
      case 'weekly':
        if (!workflow.schedule.daysOfWeek || workflow.schedule.daysOfWeek.length === 0) {
          errors.push('At least one day is required for weekly workflows');
        }
        if (!workflow.schedule.time) errors.push('Time is required for weekly workflows');
        break;
      
      case 'interval':
        if (!workflow.schedule.intervalMinutes || workflow.schedule.intervalMinutes <= 0) {
          errors.push('Valid interval minutes required for interval workflows');
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
