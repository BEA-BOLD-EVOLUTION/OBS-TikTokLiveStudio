/**
 * IndexedDB storage for Scheduled Workflows
 * Handles persistence of workflow rules and execution history
 */

import type {
  ScheduledWorkflow,
  WorkflowExecution,
  WorkflowAnalytics,
  WorkflowSchedule,
} from './scheduledWorkflowTypes.js';
import { calculateNextExecution } from './scheduledWorkflowTypes.js';

const DB_NAME = 'ScheduledWorkflowDB';
const DB_VERSION = 1;
const WORKFLOWS_STORE = 'workflows';
const EXECUTIONS_STORE = 'executions';

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create workflows store
      if (!db.objectStoreNames.contains(WORKFLOWS_STORE)) {
        const workflowStore = db.createObjectStore(WORKFLOWS_STORE, { keyPath: 'id' });
        workflowStore.createIndex('enabled', 'enabled', { unique: false });
        workflowStore.createIndex('nextExecution', 'nextExecution', { unique: false });
        workflowStore.createIndex('lastExecuted', 'lastExecuted', { unique: false });
        workflowStore.createIndex('executionCount', 'executionCount', { unique: false });
      }

      // Create executions store
      if (!db.objectStoreNames.contains(EXECUTIONS_STORE)) {
        const executionStore = db.createObjectStore(EXECUTIONS_STORE, { keyPath: 'id' });
        executionStore.createIndex('workflowId', 'workflowId', { unique: false });
        executionStore.createIndex('executedAt', 'executedAt', { unique: false });
        executionStore.createIndex('success', 'success', { unique: false });
      }
    };
  });
}

/**
 * Add or update workflow
 */
export async function saveWorkflow(workflow: ScheduledWorkflow): Promise<void> {
  const db = await initDatabase();

  // Calculate next execution time
  const nextExecution = calculateNextExecution(workflow.schedule);
  const workflowWithNext = { ...workflow, nextExecution };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKFLOWS_STORE);

    // Convert dates to ISO strings for storage
    const storageWorkflow = {
      ...workflowWithNext,
      createdAt: workflowWithNext.createdAt.toISOString(),
      lastModified: new Date().toISOString(),
      lastExecuted: workflowWithNext.lastExecuted?.toISOString(),
      nextExecution: workflowWithNext.nextExecution?.toISOString(),
    };

    const request = store.put(storageWorkflow);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save workflow'));
  });
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(id: string): Promise<ScheduledWorkflow | null> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
    const store = transaction.objectStore(WORKFLOWS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
        return;
      }

      // Convert ISO strings back to Date objects
      const workflow = {
        ...request.result,
        createdAt: new Date(request.result.createdAt),
        lastModified: new Date(request.result.lastModified),
        lastExecuted: request.result.lastExecuted
          ? new Date(request.result.lastExecuted)
          : undefined,
        nextExecution: request.result.nextExecution
          ? new Date(request.result.nextExecution)
          : undefined,
      };

      resolve(workflow);
    };

    request.onerror = () => reject(new Error('Failed to get workflow'));
  });
}

/**
 * Get all workflows
 */
export async function getAllWorkflows(): Promise<ScheduledWorkflow[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
    const store = transaction.objectStore(WORKFLOWS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const workflows = request.result.map(
        (
          w: Omit<
            ScheduledWorkflow,
            'createdAt' | 'lastModified' | 'lastExecuted' | 'nextExecution'
          > & {
            createdAt: string;
            lastModified: string;
            lastExecuted?: string;
            nextExecution?: string;
          },
        ) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          lastModified: new Date(w.lastModified),
          lastExecuted: w.lastExecuted ? new Date(w.lastExecuted) : undefined,
          nextExecution: w.nextExecution ? new Date(w.nextExecution) : undefined,
        }),
      );

      resolve(workflows);
    };

    request.onerror = () => reject(new Error('Failed to get workflows'));
  });
}

/**
 * Get enabled workflows sorted by next execution time
 */
export async function getEnabledWorkflows(): Promise<ScheduledWorkflow[]> {
  const allWorkflows = await getAllWorkflows();
  return allWorkflows
    .filter((w) => w.enabled)
    .sort((a, b) => {
      if (!a.nextExecution) return 1;
      if (!b.nextExecution) return -1;
      return a.nextExecution.getTime() - b.nextExecution.getTime();
    });
}

/**
 * Delete workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKFLOWS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete workflow'));
  });
}

/**
 * Update workflow's next execution time
 */
export async function updateNextExecution(id: string, schedule: WorkflowSchedule): Promise<void> {
  const workflow = await getWorkflow(id);
  if (!workflow) return;

  const nextExecution = calculateNextExecution(schedule);
  workflow.nextExecution = nextExecution ?? undefined;

  await saveWorkflow(workflow);
}

/**
 * Record workflow execution
 */
export async function recordExecution(execution: WorkflowExecution): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXECUTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(EXECUTIONS_STORE);

    const storageExecution = {
      ...execution,
      executedAt: execution.executedAt.toISOString(),
    };

    const request = store.add(storageExecution);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to record execution'));
  });
}

/**
 * Update workflow after execution
 */
export async function updateWorkflowAfterExecution(id: string): Promise<void> {
  // success and error parameters removed as they're not used in current implementation
  const workflow = await getWorkflow(id);
  if (!workflow) return;

  workflow.lastExecuted = new Date();
  workflow.executionCount++;

  // Calculate next execution for recurring workflows
  if (workflow.schedule.type !== 'once') {
    workflow.nextExecution = calculateNextExecution(workflow.schedule) ?? undefined;
  } else {
    // One-time workflows get disabled after execution
    workflow.enabled = false;
    workflow.nextExecution = undefined;
  }

  await saveWorkflow(workflow);
}

/**
 * Get execution history for a workflow
 */
export async function getWorkflowExecutions(
  workflowId: string,
  limit = 50,
): Promise<WorkflowExecution[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXECUTIONS_STORE], 'readonly');
    const store = transaction.objectStore(EXECUTIONS_STORE);
    const index = store.index('workflowId');
    const request = index.getAll(workflowId);

    request.onsuccess = () => {
      const executions = request.result
        .map((e: Omit<WorkflowExecution, 'executedAt'> & { executedAt: string }) => ({
          ...e,
          executedAt: new Date(e.executedAt),
        }))
        .sort(
          (a: WorkflowExecution, b: WorkflowExecution) =>
            b.executedAt.getTime() - a.executedAt.getTime(),
        )
        .slice(0, limit);

      resolve(executions);
    };

    request.onerror = () => reject(new Error('Failed to get executions'));
  });
}

/**
 * Get all executions across all workflows
 */
export async function getAllExecutions(limit = 100): Promise<WorkflowExecution[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXECUTIONS_STORE], 'readonly');
    const store = transaction.objectStore(EXECUTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const executions = request.result
        .map((e: Omit<WorkflowExecution, 'executedAt'> & { executedAt: string }) => ({
          ...e,
          executedAt: new Date(e.executedAt),
        }))
        .sort(
          (a: WorkflowExecution, b: WorkflowExecution) =>
            b.executedAt.getTime() - a.executedAt.getTime(),
        )
        .slice(0, limit);

      resolve(executions);
    };

    request.onerror = () => reject(new Error('Failed to get all executions'));
  });
}

/**
 * Calculate analytics for workflows
 */
export async function calculateWorkflowAnalytics(): Promise<WorkflowAnalytics> {
  const workflows = await getAllWorkflows();
  const executions = await getAllExecutions();

  const totalWorkflows = workflows.length;
  const enabledWorkflows = workflows.filter((w) => w.enabled).length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.success).length;
  const failedExecutions = executions.filter((e) => !e.success).length;

  // Find most executed workflow
  const executionCounts = new Map<string, number>();
  executions.forEach((e) => {
    executionCounts.set(e.workflowId, (executionCounts.get(e.workflowId) || 0) + 1);
  });

  let mostExecutedWorkflow: string | undefined;
  let maxCount = 0;
  executionCounts.forEach((count, workflowId) => {
    if (count > maxCount) {
      maxCount = count;
      const workflow = workflows.find((w) => w.id === workflowId);
      mostExecutedWorkflow = workflow?.name;
    }
  });

  // Calculate average execution time
  const totalDuration = executions.reduce((sum, e) => sum + e.duration, 0);
  const averageExecutionTime = executions.length > 0 ? totalDuration / executions.length : 0;

  // Get next scheduled workflows (up to 5)
  const nextScheduledWorkflows = workflows
    .filter((w) => w.enabled && w.nextExecution)
    .sort((a, b) => {
      if (!a.nextExecution) return 1;
      if (!b.nextExecution) return -1;
      return a.nextExecution.getTime() - b.nextExecution.getTime();
    })
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      name: w.name,
      nextExecution: w.nextExecution!,
    }));

  return {
    totalWorkflows,
    enabledWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    mostExecutedWorkflow,
    averageExecutionTime,
    nextScheduledWorkflows,
  };
}

/**
 * Prune old execution records
 */
export async function pruneOldExecutions(retentionDays = 30): Promise<number> {
  const db = await initDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EXECUTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(EXECUTIONS_STORE);
    const index = store.index('executedAt');
    const request = index.openCursor();

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const execution = cursor.value;
        const executedAt = new Date(execution.executedAt);

        if (executedAt < cutoffDate) {
          cursor.delete();
          deletedCount++;
        }

        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(new Error('Failed to prune executions'));
  });
}

/**
 * Clear all workflows and executions (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKFLOWS_STORE, EXECUTIONS_STORE], 'readwrite');

    transaction.objectStore(WORKFLOWS_STORE).clear();
    transaction.objectStore(EXECUTIONS_STORE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to clear data'));
  });
}
