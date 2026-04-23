/**
 * Cohost History Database - IndexedDB for client-side persistence
 */

import type { CohostRecord, CohostFilter, CohostStats } from './cohostTypes.js';
import { normalizeUsername } from './cohostTypes.js';

const DB_NAME = 'CohostHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'cohosts';

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open cohost database'));

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create cohosts object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for querying
        store.createIndex('username', 'username', { unique: false });
        store.createIndex('lastSeen', 'lastSeen', { unique: false });
        store.createIndex('streamCount', 'streamCount', { unique: false });
        store.createIndex('blocked', 'blocked', { unique: false });
      }
    };
  });
}

/**
 * Add new cohost record to database
 * @param username - TikTok username (will be normalized)
 * @param notes - Quick notes/tags array
 * @param customNote - Optional freeform note
 * @param ocrConfidence - Optional OCR confidence score
 * @param imageDataUrl - Optional cropped screenshot
 * @returns Created cohost record
 */
export async function addCohostRecord(
  username: string,
  notes: string[] = [],
  customNote?: string,
  ocrConfidence?: number,
  imageDataUrl?: string,
): Promise<CohostRecord> {
  const db = await initDatabase();

  const normalized = normalizeUsername(username);

  // Check if cohost already exists
  const existing = await getCohostByUsername(normalized);

  if (existing) {
    // Update existing record
    return updateCohostRecord(existing.id, {
      lastSeen: new Date(),
      streamCount: existing.streamCount + 1,
      notes: [...new Set([...existing.notes, ...notes])], // Merge notes (unique)
      customNote: customNote || existing.customNote,
      ocrConfidence: ocrConfidence ?? existing.ocrConfidence,
      imageDataUrl: imageDataUrl || existing.imageDataUrl,
    });
  }

  // Create new record
  const record: CohostRecord = {
    id: crypto.randomUUID(),
    username: normalized,
    joinedAt: new Date(),
    notes,
    customNote,
    blocked: false,
    lastSeen: new Date(),
    streamCount: 1,
    ocrConfidence,
    imageDataUrl,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(new Error('Failed to add cohost record'));
  });
}

/**
 * Get cohost record by username (normalized lookup)
 */
export async function getCohostByUsername(username: string): Promise<CohostRecord | null> {
  const db = await initDatabase();
  const normalized = normalizeUsername(username);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('username');
    const request = index.get(normalized);

    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        // Convert date strings back to Date objects
        result.joinedAt = new Date(result.joinedAt);
        result.lastSeen = new Date(result.lastSeen);
        if (result.leftAt) {
          result.leftAt = new Date(result.leftAt);
        }
      }
      resolve(result || null);
    };
    request.onerror = () => reject(new Error('Failed to get cohost record'));
  });
}

/**
 * Update existing cohost record
 */
export async function updateCohostRecord(
  id: string,
  updates: Partial<Omit<CohostRecord, 'id'>>,
): Promise<CohostRecord> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error('Cohost record not found'));
        return;
      }

      const updated = { ...record, ...updates };
      const putRequest = store.put(updated);

      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(new Error('Failed to update cohost record'));
    };

    getRequest.onerror = () => reject(new Error('Failed to find cohost record'));
  });
}

/**
 * Delete cohost record by ID
 */
export async function deleteCohostRecord(id: string): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete cohost record'));
  });
}

/**
 * Get all cohost records with optional filtering
 */
export async function getAllCohosts(filter?: CohostFilter): Promise<CohostRecord[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let records: CohostRecord[] = request.result;

      // Convert date strings to Date objects
      records = records.map((record) => ({
        ...record,
        joinedAt: new Date(record.joinedAt),
        lastSeen: new Date(record.lastSeen),
        leftAt: record.leftAt ? new Date(record.leftAt) : undefined,
      }));

      // Apply filters if provided
      if (filter) {
        records = filterCohostRecords(records, filter);
      }

      // Sort by lastSeen descending (most recent first)
      records.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

      resolve(records);
    };

    request.onerror = () => reject(new Error('Failed to get cohost records'));
  });
}

/**
 * Filter cohost records based on criteria
 */
function filterCohostRecords(records: CohostRecord[], filter: CohostFilter): CohostRecord[] {
  let filtered = records;

  // Filter by search query (username)
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filtered = filtered.filter((record) => record.username.includes(query));
  }

  // Filter by date range
  if (filter.startDate) {
    filtered = filtered.filter((record) => record.lastSeen >= filter.startDate!);
  }
  if (filter.endDate) {
    filtered = filtered.filter((record) => record.lastSeen <= filter.endDate!);
  }

  // Filter by tags
  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter((record) => filter.tags!.some((tag) => record.notes.includes(tag)));
  }

  // Filter blocked cohosts
  if (!filter.showBlocked) {
    filtered = filtered.filter((record) => !record.blocked);
  }

  return filtered;
}

/**
 * Get cohost statistics
 */
export async function getCohostStats(): Promise<CohostStats> {
  const records = await getAllCohosts();

  const uniqueUsernames = new Set(records.map((r) => r.username));
  const blockedCount = records.filter((r) => r.blocked).length;

  // Find most frequent cohost
  const usernameCounts = new Map<string, number>();
  records.forEach((record) => {
    const count = usernameCounts.get(record.username) || 0;
    usernameCounts.set(record.username, count + record.streamCount);
  });

  let mostFrequentCohost: { username: string; count: number } | undefined = undefined;
  let maxCount = 0;
  usernameCounts.forEach((count, username) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentCohost = { username, count };
    }
  });

  const totalStreamCount = records.reduce((sum, r) => sum + r.streamCount, 0);
  const averageStreamCount = records.length > 0 ? totalStreamCount / records.length : 0;

  return {
    totalCohosts: records.length,
    uniqueCohosts: uniqueUsernames.size,
    blockedCount,
    mostFrequentCohost,
    averageStreamCount: Math.round(averageStreamCount * 10) / 10,
  };
}

/**
 * Export all cohost records to CSV format
 */
export async function exportToCSV(): Promise<string> {
  const records = await getAllCohosts();

  const headers = [
    'Username',
    'Stream Count',
    'Last Seen',
    'Joined At',
    'Notes',
    'Custom Note',
    'Blocked',
    'OCR Confidence',
  ];

  const rows = records.map((record) => [
    record.username,
    record.streamCount.toString(),
    record.lastSeen.toISOString(),
    record.joinedAt.toISOString(),
    record.notes.join('; '),
    record.customNote || '',
    record.blocked ? 'Yes' : 'No',
    record.ocrConfidence?.toString() || '',
  ]);

  const csvLines = [headers.join(','), ...rows.map((row) => row.join(','))];

  return csvLines.join('\n');
}

/**
 * Clear all cohost records (use with caution)
 */
export async function clearAllCohosts(): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear cohost records'));
  });
}
