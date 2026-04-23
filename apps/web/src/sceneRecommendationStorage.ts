/**
 * Scene Recommendation Storage - IndexedDB persistence for scene switch history
 */

import type {
  SceneSwitchRecord,
  SceneAnalytics,
  RecommendationConfig,
} from './sceneRecommendationTypes.js';
import { DEFAULT_RECOMMENDATION_CONFIG } from './sceneRecommendationTypes.js';

const DB_NAME = 'SceneRecommendationDB';
const DB_VERSION = 1;
const STORE_NAME = 'sceneSwitches';
const CONFIG_STORE = 'config';

/**
 * Initialize database
 */
async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Scene switches store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('sceneName', 'sceneName', { unique: false });
        store.createIndex('hour', 'hour', { unique: false });
        store.createIndex('dayOfWeek', 'dayOfWeek', { unique: false });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Add scene switch record
 */
export async function addSceneSwitchRecord(
  record: Omit<SceneSwitchRecord, 'id' | 'timestamp' | 'dayOfWeek' | 'hour' | 'minute'>
): Promise<string> {
  const db = await initDatabase();
  const now = new Date();
  
  const fullRecord: SceneSwitchRecord = {
    id: `${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: now,
    dayOfWeek: now.getDay(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    ...record,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(fullRecord);

    request.onsuccess = () => resolve(fullRecord.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all scene switch records within time window
 */
export async function getSceneSwitchHistory(
  timeWindowMs?: number
): Promise<SceneSwitchRecord[]> {
  const db = await initDatabase();
  const cutoffTime = timeWindowMs
    ? new Date(Date.now() - timeWindowMs)
    : new Date(0);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.lowerBound(cutoffTime);
    const request = index.getAll(range);

    request.onsuccess = () => {
      const records = request.result.map((record) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get scene switches by scene name
 */
export async function getSceneSwitchesByName(
  sceneName: string,
  timeWindowMs?: number
): Promise<SceneSwitchRecord[]> {
  const allRecords = await getSceneSwitchHistory(timeWindowMs);
  return allRecords.filter((record) => record.sceneName === sceneName);
}

/**
 * Get scene switches by session ID
 */
export async function getSceneSwitchesBySession(
  sessionId: string
): Promise<SceneSwitchRecord[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onsuccess = () => {
      const records = request.result.map((record) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete old records beyond retention period
 */
export async function pruneOldRecords(retentionMs: number): Promise<number> {
  const db = await initDatabase();
  const cutoffTime = new Date(Date.now() - retentionMs);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get configuration
 */
export async function getConfig(): Promise<RecommendationConfig> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get('recommendation-config');

    request.onsuccess = () => {
      resolve(request.result?.value || DEFAULT_RECOMMENDATION_CONFIG);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save configuration
 */
export async function saveConfig(config: RecommendationConfig): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.put({ key: 'recommendation-config', value: config });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Calculate analytics from stored data
 */
export async function calculateAnalytics(
  timeWindowMs?: number
): Promise<SceneAnalytics> {
  const records = await getSceneSwitchHistory(timeWindowMs);

  if (records.length === 0) {
    return {
      totalSwitches: 0,
      uniqueScenes: 0,
      mostUsedScene: '',
      averageSessionDuration: 0,
      patternCount: 0,
      lastAnalyzed: new Date(),
      timeOfDayDistribution: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        'late-night': 0,
      },
      dayTypeDistribution: {
        weekday: 0,
        weekend: 0,
      },
    };
  }

  // Calculate scene frequency
  const sceneFrequency = new Map<string, number>();
  records.forEach((record) => {
    sceneFrequency.set(
      record.sceneName,
      (sceneFrequency.get(record.sceneName) || 0) + 1
    );
  });

  const mostUsedScene = Array.from(sceneFrequency.entries()).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  // Time of day distribution
  const timeOfDayDist = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    'late-night': 0,
  };
  records.forEach((record) => {
    const hour = record.hour;
    if (hour >= 5 && hour < 12) timeOfDayDist.morning++;
    else if (hour >= 12 && hour < 17) timeOfDayDist.afternoon++;
    else if (hour >= 17 && hour < 22) timeOfDayDist.evening++;
    else timeOfDayDist['late-night']++;
  });

  // Day type distribution
  const dayTypeDist = {
    weekday: 0,
    weekend: 0,
  };
  records.forEach((record) => {
    if (record.dayOfWeek === 0 || record.dayOfWeek === 6) {
      dayTypeDist.weekend++;
    } else {
      dayTypeDist.weekday++;
    }
  });

  // Average session duration (if we have session data)
  const sessionsWithDuration = records.filter((r) => r.duration);
  const averageSessionDuration =
    sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) /
        sessionsWithDuration.length
      : 0;

  return {
    totalSwitches: records.length,
    uniqueScenes: sceneFrequency.size,
    mostUsedScene,
    averageSessionDuration,
    patternCount: 0, // Will be calculated by pattern detection engine
    lastAnalyzed: new Date(),
    timeOfDayDistribution: timeOfDayDist,
    dayTypeDistribution: dayTypeDist,
  };
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
