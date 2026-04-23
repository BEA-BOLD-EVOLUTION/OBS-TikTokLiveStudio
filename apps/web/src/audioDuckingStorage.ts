/**
 * Audio Ducking Storage
 *
 * IndexedDB persistence layer for ducking events, audio source configurations, and analytics.
 */

import type {
  DuckingEvent,
  OBSAudioSource,
  VADConfig,
  DuckingConfig,
  DuckingAnalytics,
} from './audioDuckingTypes.js';
import {
  DEFAULT_VAD_CONFIG,
  DEFAULT_DUCKING_CONFIG,
  getTimeOfDay,
  calculateEffectiveness,
} from './audioDuckingTypes.js';

// Serialized types for IndexedDB storage
type SerializedDuckingEvent = Omit<DuckingEvent, 'timestamp'> & {
  timestamp: string;
};

type SerializedOBSAudioSource = Omit<OBSAudioSource, 'lastDucked'> & {
  lastDucked: string | null;
};

const DB_NAME = 'AudioDuckingDB';
const DB_VERSION = 1;

const EVENTS_STORE = 'duckingEvents';
const SOURCES_STORE = 'audioSources';
const CONFIG_STORE = 'config';

/**
 * Initialize IndexedDB
 */
async function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create ducking events store
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventsStore.createIndex('type', 'type', { unique: false });
        eventsStore.createIndex('success', 'success', { unique: false });
      }

      // Create audio sources store
      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        const sourcesStore = db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
        sourcesStore.createIndex('sourceName', 'sourceName', { unique: false });
        sourcesStore.createIndex('enabled', 'enabled', { unique: false });
      }

      // Create config store
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Convert date to ISO string for storage
 */
function serializeEvent(event: DuckingEvent): SerializedDuckingEvent {
  return {
    ...event,
    timestamp: event.timestamp.toISOString(),
  };
}

/**
 * Convert ISO string back to Date
 */
function deserializeEvent(data: SerializedDuckingEvent): DuckingEvent {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

/**
 * Serialize audio source
 */
function serializeSource(source: OBSAudioSource): SerializedOBSAudioSource {
  return {
    ...source,
    lastDucked: source.lastDucked ? source.lastDucked.toISOString() : null,
  };
}

/**
 * Deserialize audio source
 */
function deserializeSource(data: SerializedOBSAudioSource): OBSAudioSource {
  return {
    ...data,
    lastDucked: data.lastDucked ? new Date(data.lastDucked) : null,
  };
}

// ============================================================================
// Ducking Events Storage
// ============================================================================

/**
 * Record a ducking event
 */
export async function recordDuckingEvent(event: DuckingEvent): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction(EVENTS_STORE, 'readwrite');
  const store = tx.objectStore(EVENTS_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.add(serializeEvent(event));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Get all ducking events
 */
export async function getAllEvents(): Promise<DuckingEvent[]> {
  const db = await initDatabase();
  const tx = db.transaction(EVENTS_STORE, 'readonly');
  const store = tx.objectStore(EVENTS_STORE);

  const events = await new Promise<Array<DuckingEvent & { timestamp: string }>>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return events.map(deserializeEvent);
}

/**
 * Get events within time range
 */
export async function getEventsByTimeRange(
  startTime: Date,
  endTime: Date,
): Promise<DuckingEvent[]> {
  const allEvents = await getAllEvents();
  return allEvents.filter((event) => event.timestamp >= startTime && event.timestamp <= endTime);
}

/**
 * Get recent ducking events
 */
export async function getRecentEvents(count: number = 20): Promise<DuckingEvent[]> {
  const allEvents = await getAllEvents();
  return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, count);
}

/**
 * Prune old ducking events
 */
export async function pruneOldEvents(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const db = await initDatabase();
  const tx = db.transaction(EVENTS_STORE, 'readwrite');
  const store = tx.objectStore(EVENTS_STORE);
  const index = store.index('timestamp');

  let deletedCount = 0;

  await new Promise<void>((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate.toISOString()));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });

  db.close();
  return deletedCount;
}

// ============================================================================
// Audio Sources Storage
// ============================================================================

/**
 * Save audio source
 */
export async function saveAudioSource(source: OBSAudioSource): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction(SOURCES_STORE, 'readwrite');
  const store = tx.objectStore(SOURCES_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put(serializeSource(source));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Get audio source by ID
 */
export async function getAudioSource(id: string): Promise<OBSAudioSource | null> {
  const db = await initDatabase();
  const tx = db.transaction(SOURCES_STORE, 'readonly');
  const store = tx.objectStore(SOURCES_STORE);

  const data = await new Promise<OBSAudioSource & { lastDucked: string | null } | undefined>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return data ? deserializeSource(data) : null;
}

/**
 * Get all audio sources
 */
export async function getAllAudioSources(): Promise<OBSAudioSource[]> {
  const db = await initDatabase();
  const tx = db.transaction(SOURCES_STORE, 'readonly');
  const store = tx.objectStore(SOURCES_STORE);

  const sources = await new Promise<Array<OBSAudioSource & { lastDucked: string | null }>>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return sources.map(deserializeSource);
}

/**
 * Get enabled audio sources
 */
export async function getEnabledAudioSources(): Promise<OBSAudioSource[]> {
  const db = await initDatabase();
  const tx = db.transaction(SOURCES_STORE, 'readonly');
  const store = tx.objectStore(SOURCES_STORE);
  const index = store.index('enabled');

  const sources = await new Promise<SerializedOBSAudioSource[]>((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(true));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return sources.map(deserializeSource);
}

/**
 * Delete audio source
 */
export async function deleteAudioSource(id: string): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction(SOURCES_STORE, 'readwrite');
  const store = tx.objectStore(SOURCES_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

// ============================================================================
// Configuration Storage
// ============================================================================

/**
 * Save VAD configuration
 */
export async function saveVADConfig(config: VADConfig): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction(CONFIG_STORE, 'readwrite');
  const store = tx.objectStore(CONFIG_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put({ key: 'vadConfig', value: config });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Get VAD configuration
 */
export async function getVADConfig(): Promise<VADConfig> {
  const db = await initDatabase();
  const tx = db.transaction(CONFIG_STORE, 'readonly');
  const store = tx.objectStore(CONFIG_STORE);

  const data = await new Promise<{ key: string; value: VADConfig } | undefined>((resolve, reject) => {
    const request = store.get('vadConfig');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return data?.value || DEFAULT_VAD_CONFIG;
}

/**
 * Save ducking configuration
 */
export async function saveDuckingConfig(config: DuckingConfig): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction(CONFIG_STORE, 'readwrite');
  const store = tx.objectStore(CONFIG_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put({ key: 'duckingConfig', value: config });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

/**
 * Get ducking configuration
 */
export async function getDuckingConfig(): Promise<DuckingConfig> {
  const db = await initDatabase();
  const tx = db.transaction(CONFIG_STORE, 'readonly');
  const store = tx.objectStore(CONFIG_STORE);

  const data = await new Promise<{ key: string; value: DuckingConfig } | undefined>((resolve, reject) => {
    const request = store.get('duckingConfig');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return data?.value || DEFAULT_DUCKING_CONFIG;
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Calculate ducking analytics
 */
export async function calculateAnalytics(timeWindowHours: number = 24): Promise<DuckingAnalytics> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - timeWindowHours * 60 * 60 * 1000);

  const events = await getEventsByTimeRange(startTime, endTime);
  const sources = await getAllAudioSources();

  // Count events
  const totalEvents = events.length;
  const successfulDucks = events.filter((e) => e.success).length;
  const failedDucks = events.filter((e) => !e.success).length;

  // Calculate voice and duck times
  let totalVoiceTime = 0;
  let totalDuckedTime = 0;
  const voiceDurations: number[] = [];
  const duckDurations: number[] = [];

  // Track duck start/end times
  const duckSessions: Array<{ start: Date; end: Date | null }> = [];
  let currentDuckStart: Date | null = null;

  for (const event of events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
    if (event.type === 'voice-detected' && event.voiceActivity.voiceDuration) {
      totalVoiceTime += event.voiceActivity.voiceDuration;
      voiceDurations.push(event.voiceActivity.voiceDuration);
    }

    if (event.type === 'duck-started') {
      currentDuckStart = event.timestamp;
    } else if (event.type === 'duck-released' && currentDuckStart) {
      const duckDuration = event.timestamp.getTime() - currentDuckStart.getTime();
      totalDuckedTime += duckDuration;
      duckDurations.push(duckDuration);
      duckSessions.push({ start: currentDuckStart, end: event.timestamp });
      currentDuckStart = null;
    }
  }

  // Calculate averages
  const avgVoiceDuration =
    voiceDurations.length > 0
      ? voiceDurations.reduce((sum, d) => sum + d, 0) / voiceDurations.length
      : 0;

  const avgDuckDuration =
    duckDurations.length > 0
      ? duckDurations.reduce((sum, d) => sum + d, 0) / duckDurations.length
      : 0;

  // Find most ducked source
  const sourceEventCounts = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'source-ducked') {
      for (const sourceId of event.affectedSources) {
        sourceEventCounts.set(sourceId, (sourceEventCounts.get(sourceId) || 0) + 1);
      }
    }
  }

  let mostDuckedSource: DuckingAnalytics['mostDuckedSource'] = null;
  let maxCount = 0;
  for (const [sourceId, count] of sourceEventCounts.entries()) {
    if (count > maxCount) {
      const source = sources.find((s) => s.id === sourceId);
      if (source) {
        mostDuckedSource = {
          sourceId,
          sourceName: source.displayName,
          duckCount: count,
        };
        maxCount = count;
      }
    }
  }

  // Calculate effectiveness
  const effectiveness = calculateEffectiveness(totalVoiceTime, totalDuckedTime);

  // Estimate accuracy based on successful vs failed events
  const accuracy = totalEvents > 0 ? Math.round((successfulDucks / totalEvents) * 100) : 0;

  // Time-of-day distribution
  const timeOfDayDistribution = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    lateNight: 0,
  };

  for (const event of events) {
    if (event.type === 'duck-started') {
      const timeOfDay = getTimeOfDay(event.timestamp);
      timeOfDayDistribution[timeOfDay]++;
    }
  }

  return {
    totalEvents,
    successfulDucks,
    failedDucks,
    totalVoiceTime,
    totalDuckedTime,
    avgVoiceDuration,
    avgDuckDuration,
    mostDuckedSource,
    effectiveness,
    accuracy,
    timeOfDayDistribution,
  };
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  const db = await initDatabase();
  const tx = db.transaction([EVENTS_STORE, SOURCES_STORE, CONFIG_STORE], 'readwrite');

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const request = tx.objectStore(EVENTS_STORE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
    new Promise<void>((resolve, reject) => {
      const request = tx.objectStore(SOURCES_STORE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
    new Promise<void>((resolve, reject) => {
      const request = tx.objectStore(CONFIG_STORE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
  ]);

  db.close();
}
