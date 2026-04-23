/**
 * IndexedDB storage layer for Auto-Backup Recordings system
 * Stores recording sessions, backup locations, upload queue, and analytics
 */

import type {
  BackupConfig,
  BackupLocation,
  BackupRecord,
  UploadQueueEntry,
  BackupAnalytics,
  StorageByLocation,
  LocationStatus,
} from './autoBackupTypes.js';
import { DEFAULT_BACKUP_CONFIG } from './autoBackupTypes.js';

// Serialized types for IndexedDB storage
type SerializedLocationStatus = Omit<LocationStatus, 'uploadedAt'> & {
  uploadedAt?: string;
};

type SerializedRecord = Omit<BackupRecord, 'startTime' | 'endTime' | 'createdAt' | 'locations'> & {
  startTime: string;
  endTime?: string;
  createdAt: string;
  locations: SerializedLocationStatus[];
};

type SerializedCloudAuth = {
  provider: BackupLocation['cloudAuth'] extends { provider: infer P } ? P : never;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope?: string;
};

type SerializedLocation = Omit<BackupLocation, 'createdAt' | 'lastTestedAt' | 'cloudAuth'> & {
  createdAt: string;
  lastTestedAt?: string;
  cloudAuth?: SerializedCloudAuth;
};

const DB_NAME = 'AutoBackupDB';
const DB_VERSION = 1;

// Object store names
const BACKUP_RECORDS_STORE = 'backupRecords';
const BACKUP_LOCATIONS_STORE = 'backupLocations';
const UPLOAD_QUEUE_STORE = 'uploadQueue';
const CONFIG_STORE = 'config';

// Config keys
const CONFIG_KEY_BACKUP = 'backupConfig';

/**
 * Initialize IndexedDB database with required object stores
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Backup records store
      if (!db.objectStoreNames.contains(BACKUP_RECORDS_STORE)) {
        const recordStore = db.createObjectStore(BACKUP_RECORDS_STORE, {
          keyPath: 'id',
        });
        recordStore.createIndex('startTime', 'startTime', { unique: false });
        recordStore.createIndex('endTime', 'endTime', { unique: false });
        recordStore.createIndex('overallStatus', 'overallStatus', {
          unique: false,
        });
        recordStore.createIndex('sceneName', 'sceneName', { unique: false });
        recordStore.createIndex('isSplit', 'isSplit', { unique: false });
      }

      // Backup locations store
      if (!db.objectStoreNames.contains(BACKUP_LOCATIONS_STORE)) {
        const locationStore = db.createObjectStore(BACKUP_LOCATIONS_STORE, {
          keyPath: 'id',
        });
        locationStore.createIndex('enabled', 'enabled', { unique: false });
        locationStore.createIndex('priority', 'priority', { unique: false });
        locationStore.createIndex('type', 'type', { unique: false });
      }

      // Upload queue store
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const queueStore = db.createObjectStore(UPLOAD_QUEUE_STORE, {
          keyPath: 'recordId',
        });
        queueStore.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
        queueStore.createIndex('retryCount', 'retryCount', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Serialize dates to ISO strings for storage
 */
function serializeRecord(record: BackupRecord): SerializedRecord {
  return {
    ...record,
    startTime: record.startTime.toISOString(),
    endTime: record.endTime?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    locations: record.locations.map((loc) => ({
      ...loc,
      uploadedAt: loc.uploadedAt?.toISOString(),
    })),
  };
}

/**
 * Deserialize ISO strings back to Date objects
 */
function deserializeRecord(data: SerializedRecord): BackupRecord {
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    createdAt: new Date(data.createdAt),
    locations: data.locations.map((loc) => ({
      ...loc,
      uploadedAt: loc.uploadedAt ? new Date(loc.uploadedAt) : undefined,
    })),
  };
}

/**
 * Serialize location dates to ISO strings
 */
function serializeLocation(location: BackupLocation): SerializedLocation {
  return {
    ...location,
    createdAt: location.createdAt.toISOString(),
    lastTestedAt: location.lastTestedAt?.toISOString(),
    cloudAuth: location.cloudAuth
      ? {
          provider: location.cloudAuth.provider,
          accessToken: location.cloudAuth.accessToken,
          refreshToken: location.cloudAuth.refreshToken,
          expiresAt: location.cloudAuth.expiresAt.toISOString(),
          scope: location.cloudAuth.scope,
        }
      : undefined,
  };
}

/**
 * Deserialize location ISO strings back to Date objects
 */
function deserializeLocation(data: SerializedLocation): BackupLocation {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    lastTestedAt: data.lastTestedAt ? new Date(data.lastTestedAt) : undefined,
    cloudAuth: data.cloudAuth
      ? {
          ...data.cloudAuth,
          expiresAt: new Date(data.cloudAuth.expiresAt),
        }
      : undefined,
  };
}

/**
 * Serialize queue entry dates to ISO strings
 */
function serializeQueueEntry(entry: UploadQueueEntry): Omit<UploadQueueEntry, 'nextRetryAt' | 'addedAt'> & {
  nextRetryAt: string;
  addedAt: string;
} {
  return {
    ...entry,
    nextRetryAt: entry.nextRetryAt.toISOString(),
    addedAt: entry.addedAt.toISOString(),
  };
}

/**
 * Deserialize queue entry ISO strings back to Date objects
 */
function deserializeQueueEntry(data: Omit<UploadQueueEntry, 'nextRetryAt' | 'addedAt'> & {
  nextRetryAt: string;
  addedAt: string;
}): UploadQueueEntry {
  return {
    ...data,
    nextRetryAt: new Date(data.nextRetryAt),
    addedAt: new Date(data.addedAt),
  };
}

// ============================================================================
// BACKUP RECORDS CRUD
// ============================================================================

/**
 * Save or update a backup record
 */
export async function saveBackupRecord(record: BackupRecord): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_RECORDS_STORE, 'readwrite');
  const store = transaction.objectStore(BACKUP_RECORDS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put(serializeRecord(record));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a backup record by ID
 */
export async function getBackupRecord(id: string): Promise<BackupRecord | null> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_RECORDS_STORE, 'readonly');
  const store = transaction.objectStore(BACKUP_RECORDS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const data = request.result;
      resolve(data ? deserializeRecord(data) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all backup records
 */
export async function getAllBackupRecords(): Promise<BackupRecord[]> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_RECORDS_STORE, 'readonly');
  const store = transaction.objectStore(BACKUP_RECORDS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const records = request.result.map(deserializeRecord);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get backup records within a time range
 */
export async function getBackupRecordsByTimeRange(
  startTime: Date,
  endTime: Date,
): Promise<BackupRecord[]> {
  const allRecords = await getAllBackupRecords();
  return allRecords.filter(
    (record) => record.startTime >= startTime && record.startTime <= endTime,
  );
}

/**
 * Get recent backup records
 */
export async function getRecentBackupRecords(count: number = 20): Promise<BackupRecord[]> {
  const allRecords = await getAllBackupRecords();
  return allRecords.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()).slice(0, count);
}

/**
 * Delete a backup record
 */
export async function deleteBackupRecord(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_RECORDS_STORE, 'readwrite');
  const store = transaction.objectStore(BACKUP_RECORDS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Prune old backup records (older than retention days)
 */
export async function pruneOldBackupRecords(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const allRecords = await getAllBackupRecords();
  const oldRecords = allRecords.filter((record) => record.startTime < cutoffDate);

  for (const record of oldRecords) {
    await deleteBackupRecord(record.id);
  }

  return oldRecords.length;
}

// ============================================================================
// BACKUP LOCATIONS CRUD
// ============================================================================

/**
 * Save or update a backup location
 */
export async function saveBackupLocation(location: BackupLocation): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_LOCATIONS_STORE, 'readwrite');
  const store = transaction.objectStore(BACKUP_LOCATIONS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put(serializeLocation(location));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a backup location by ID
 */
export async function getBackupLocation(id: string): Promise<BackupLocation | null> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_LOCATIONS_STORE, 'readonly');
  const store = transaction.objectStore(BACKUP_LOCATIONS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const data = request.result;
      resolve(data ? deserializeLocation(data) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all backup locations
 */
export async function getAllBackupLocations(): Promise<BackupLocation[]> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_LOCATIONS_STORE, 'readonly');
  const store = transaction.objectStore(BACKUP_LOCATIONS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const locations = request.result.map(deserializeLocation);
      resolve(locations);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get enabled backup locations sorted by priority
 */
export async function getEnabledBackupLocations(): Promise<BackupLocation[]> {
  const allLocations = await getAllBackupLocations();
  return allLocations.filter((loc) => loc.enabled).sort((a, b) => b.priority - a.priority); // Higher priority first
}

/**
 * Delete a backup location
 */
export async function deleteBackupLocation(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(BACKUP_LOCATIONS_STORE, 'readwrite');
  const store = transaction.objectStore(BACKUP_LOCATIONS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// UPLOAD QUEUE CRUD
// ============================================================================

/**
 * Add an entry to the upload queue
 */
export async function addToUploadQueue(entry: UploadQueueEntry): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(UPLOAD_QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put(serializeQueueEntry(entry));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a queue entry by record ID
 */
export async function getQueueEntry(recordId: string): Promise<UploadQueueEntry | null> {
  const db = await openDatabase();
  const transaction = db.transaction(UPLOAD_QUEUE_STORE, 'readonly');
  const store = transaction.objectStore(UPLOAD_QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(recordId);
    request.onsuccess = () => {
      const data = request.result;
      resolve(data ? deserializeQueueEntry(data) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all queue entries ready for retry (nextRetryAt <= now)
 */
export async function getReadyQueueEntries(): Promise<UploadQueueEntry[]> {
  const db = await openDatabase();
  const transaction = db.transaction(UPLOAD_QUEUE_STORE, 'readonly');
  const store = transaction.objectStore(UPLOAD_QUEUE_STORE);
  const index = store.index('nextRetryAt');

  const now = new Date();

  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => {
      const entries = request.result
        .map(deserializeQueueEntry)
        .filter((entry) => entry.nextRetryAt <= now);
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove an entry from the upload queue
 */
export async function removeFromUploadQueue(recordId: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(UPLOAD_QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(recordId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Save backup configuration
 */
export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(CONFIG_STORE, 'readwrite');
  const store = transaction.objectStore(CONFIG_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put({ key: CONFIG_KEY_BACKUP, value: config });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get backup configuration (returns default if not found)
 */
export async function getBackupConfig(): Promise<BackupConfig> {
  const db = await openDatabase();
  const transaction = db.transaction(CONFIG_STORE, 'readonly');
  const store = transaction.objectStore(CONFIG_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(CONFIG_KEY_BACKUP);
    request.onsuccess = () => {
      const data = request.result;
      resolve(data?.value || { ...DEFAULT_BACKUP_CONFIG });
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Calculate backup analytics from stored data
 */
export async function calculateBackupAnalytics(
  timeWindowHours: number = 24 * 30, // 30 days default
): Promise<BackupAnalytics> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - timeWindowHours);

  const allRecords = await getAllBackupRecords();
  const recentRecords = allRecords.filter((record) => record.startTime >= cutoffDate);

  const totalRecordings = recentRecords.length;
  const totalSize = recentRecords.reduce((sum, record) => sum + (record.fileSize || 0), 0);
  const totalDuration = recentRecords.reduce((sum, record) => sum + (record.duration || 0), 0);

  // Count upload statuses across all locations
  let successfulUploads = 0;
  let failedUploads = 0;
  let pendingUploads = 0;

  recentRecords.forEach((record) => {
    record.locations.forEach((loc) => {
      if (loc.status === 'completed') successfulUploads++;
      else if (loc.status === 'failed') failedUploads++;
      else if (loc.status === 'pending' || loc.status === 'uploading') pendingUploads++;
    });
  });

  // Calculate storage by location
  const allLocations = await getAllBackupLocations();
  const storageByLocation: StorageByLocation[] = await Promise.all(
    allLocations.map(async (location) => {
      const recordsForLocation = recentRecords.filter((record) =>
        record.locations.some((loc) => loc.locationId === location.id),
      );

      const recordingCount = recordsForLocation.length;
      const totalSizeForLocation = recordsForLocation.reduce(
        (sum, record) => sum + (record.fileSize || 0),
        0,
      );

      const successCount = recordsForLocation.reduce(
        (count, record) =>
          count +
          (record.locations.some(
            (loc) => loc.locationId === location.id && loc.status === 'completed',
          )
            ? 1
            : 0),
        0,
      );

      const successRate = recordingCount > 0 ? (successCount / recordingCount) * 100 : 0;

      return {
        locationId: location.id,
        locationDisplayName: location.displayName,
        recordingCount,
        totalSize: totalSizeForLocation,
        successRate,
      };
    }),
  );

  // Find most used scene
  const sceneCount = new Map<string, number>();
  recentRecords.forEach((record) => {
    if (record.sceneName) {
      sceneCount.set(record.sceneName, (sceneCount.get(record.sceneName) || 0) + 1);
    }
  });
  const mostUsedScene =
    sceneCount.size > 0
      ? Array.from(sceneCount.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

  const averageRecordingDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;
  const averageFileSize = totalRecordings > 0 ? totalSize / totalRecordings : 0;

  const oldestRecording =
    recentRecords.length > 0
      ? recentRecords.reduce((oldest, record) =>
          record.startTime < oldest.startTime ? record : oldest,
        ).startTime
      : undefined;

  const newestRecording =
    recentRecords.length > 0
      ? recentRecords.reduce((newest, record) =>
          record.startTime > newest.startTime ? record : newest,
        ).startTime
      : undefined;

  const splitRecordingsCount = recentRecords.filter((record) => record.isSplit).length;

  return {
    totalRecordings,
    totalSize,
    totalDuration,
    successfulUploads,
    failedUploads,
    pendingUploads,
    storageByLocation,
    mostUsedScene,
    averageRecordingDuration,
    averageFileSize,
    oldestRecording,
    newestRecording,
    splitRecordingsCount,
  };
}

/**
 * Clear all data (for testing/reset purposes)
 */
export async function clearAllBackupData(): Promise<void> {
  const db = await openDatabase();

  const stores = [BACKUP_RECORDS_STORE, BACKUP_LOCATIONS_STORE, UPLOAD_QUEUE_STORE, CONFIG_STORE];

  for (const storeName of stores) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
