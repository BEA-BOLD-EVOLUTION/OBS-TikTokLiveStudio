/**
 * Workflow Scheduler Engine
 * Monitors and executes scheduled workflows at appropriate times
 */

import type { OBSController } from '@obs-tiktok/obs-controller';
import type {
  ScheduledWorkflow,
  WorkflowAction,
  WorkflowExecution,
} from './scheduledWorkflowTypes.js';
import { generateExecutionId } from './scheduledWorkflowTypes.js';
import {
  getEnabledWorkflows,
  recordExecution,
  updateWorkflowAfterExecution,
  updateNextExecution,
} from './scheduledWorkflowStorage.js';

/**
 * Callback function for workflow execution events
 */
export type WorkflowExecutionCallback = (execution: WorkflowExecution) => void;

/**
 * Unsubscribe function type
 */
type UnsubscribeFunction = () => void;

/**
 * Workflow Scheduler Engine
 * Singleton that manages scheduled workflow execution
 */
class WorkflowScheduler {
  private obsController: OBSController | null = null;
  private checkInterval: number | null = null;
  private readonly CHECK_FREQUENCY_MS = 10000; // Check every 10 seconds
  private executionCallbacks: Set<WorkflowExecutionCallback> = new Set();
  private isRunning = false;

  /**
   * Set OBS controller for executing workflow actions
   */
  setOBSController(obs: OBSController): void {
    this.obsController = obs;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Workflow scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting workflow scheduler...');

    // Start periodic check
    this.checkInterval = window.setInterval(() => {
      this.checkAndExecuteWorkflows();
    }, this.CHECK_FREQUENCY_MS);

    // Run initial check
    this.checkAndExecuteWorkflows();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('Workflow scheduler stopped');
  }

  /**
   * Check for workflows that need execution
   */
  private async checkAndExecuteWorkflows(): Promise<void> {
    if (!this.obsController) {
      console.warn('OBS controller not set, skipping workflow check');
      return;
    }

    try {
      const workflows = await getEnabledWorkflows();
      const now = new Date();

      for (const workflow of workflows) {
        // Check if workflow should execute now
        if (workflow.nextExecution && workflow.nextExecution <= now) {
          console.log(`Executing workflow: ${workflow.name}`);
          await this.executeWorkflow(workflow);
        }
      }
    } catch (error) {
      console.error('Error checking workflows:', error);
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow: ScheduledWorkflow): Promise<void> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let actionsExecuted = 0;

    try {
      // Execute each action in sequence
      for (const action of workflow.actions) {
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay);
        }

        await this.executeAction(action);
        actionsExecuted++;
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Workflow execution failed: ${workflow.name}`, error);
    }

    const duration = Date.now() - startTime;

    // Record execution
    const execution: WorkflowExecution = {
      id: generateExecutionId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      executedAt: new Date(),
      success,
      error: errorMessage,
      actionsExecuted,
      duration,
    };

    await recordExecution(execution);
    await updateWorkflowAfterExecution(workflow.id);

    // Notify callbacks
    this.notifyExecutionCallbacks(execution);

    console.log(
      `Workflow ${success ? 'completed' : 'failed'}: ${workflow.name} (${actionsExecuted}/${workflow.actions.length} actions, ${duration}ms)`,
    );
  }

  /**
   * Execute a single workflow action
   */
  private async executeAction(action: WorkflowAction): Promise<void> {
    if (!this.obsController) {
      throw new Error('OBS controller not available');
    }

    const obs = this.obsController;

    switch (action.type) {
      case 'switch-scene':
        if (!action.sceneName) {
          throw new Error('Scene name required for switch-scene action');
        }
        await obs.scenes.switchScene(action.sceneName);
        console.log(`Switched to scene: ${action.sceneName}`);
        break;

      case 'start-recording':
        await obs.recording.startRecording();
        console.log('Started recording');
        break;

      case 'stop-recording':
        await obs.recording.stopRecording();
        console.log('Stopped recording');
        break;

      case 'pause-recording':
        await obs.recording.pauseRecording();
        console.log('Paused recording');
        break;

      case 'resume-recording':
        await obs.recording.resumeRecording();
        console.log('Resumed recording');
        break;

      case 'start-streaming':
        await obs.recording.startStreaming();
        console.log('Started streaming');
        break;

      case 'stop-streaming':
        await obs.recording.stopStreaming();
        console.log('Stopped streaming');
        break;

      case 'start-virtual-camera':
        await obs.virtualCamera.start();
        console.log('Started virtual camera');
        break;

      case 'stop-virtual-camera':
        await obs.virtualCamera.stop();
        console.log('Stopped virtual camera');
        break;

      case 'show-lower-third':
        // This would integrate with lowerThirdsManager
        // For now, just log
        console.log(`Show lower third: ${action.lowerThirdId}`);
        break;

      case 'hide-lower-third':
        console.log(`Hide lower third: ${action.lowerThirdId}`);
        break;

      case 'play-transition':
        // This would integrate with transitionPlayer
        // For now, just log
        console.log(`Play transition: ${action.transitionId}`);
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register callback for workflow execution events
   */
  onExecution(callback: WorkflowExecutionCallback): UnsubscribeFunction {
    this.executionCallbacks.add(callback);

    // Return unsubscribe function
    const unsubscribe: UnsubscribeFunction = () => {
      this.executionCallbacks.delete(callback);
    };
    return unsubscribe;
  }

  /**
   * Notify all execution callbacks
   */
  private notifyExecutionCallbacks(execution: WorkflowExecution): void {
    this.executionCallbacks.forEach((callback) => {
      try {
        callback(execution);
      } catch (error) {
        console.error('Error in execution callback:', error);
      }
    });
  }

  /**
   * Get scheduler running status
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manually trigger a workflow (bypass schedule)
   */
  async triggerWorkflow(workflow: ScheduledWorkflow): Promise<void> {
    if (!this.obsController) {
      throw new Error('OBS controller not connected');
    }

    console.log(`Manually triggering workflow: ${workflow.name}`);
    await this.executeWorkflow(workflow);
  }

  /**
   * Refresh next execution times for all workflows
   */
  async refreshAllExecutionTimes(): Promise<void> {
    try {
      const workflows = await getEnabledWorkflows();

      for (const workflow of workflows) {
        await updateNextExecution(workflow.id, workflow.schedule);
      }

      console.log('Refreshed all workflow execution times');
    } catch (error) {
      console.error('Error refreshing execution times:', error);
    }
  }
}

// Export singleton instance
export const workflowScheduler = new WorkflowScheduler();
