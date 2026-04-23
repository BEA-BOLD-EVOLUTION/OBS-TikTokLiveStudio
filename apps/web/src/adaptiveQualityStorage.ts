/**
 * Adaptive Quality Storage
 * IndexedDB persistence layer for network metrics and quality adjustments
 */

import type {
  NetworkMetrics,
  QualityAdjustment,
  AdaptiveQualityConfig,
  AdaptiveQualityAnalytics,
  QualityStability,
  NetworkPerformance,
  NetworkQuality,
  QualityPreset,
} from './adaptiveQualityTypes.js';
import { DEFAULT_ADAPTIVE_CONFIG, DEFAULT_QUALITY_PRESETS } from './adaptiveQualityTypes.js';

const DB_NAME = 'AdaptiveQualityDB';
const DB_VERSION = 1;
const METRICS_STORE = 'networkMetrics';
const ADJUSTMENTS_STORE = 'qualityAdjustments';
const CONFIG_STORE = 'config';

/**
 * Initialize IndexedDB database
 */
function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Network metrics store
      if (!db.objectStoreNames.contains(METRICS_STORE)) {
        const metricsStore = db.createObjectStore(METRICS_STORE, {
          keyPath: 'timestamp',
        });
        metricsStore.createIndex('quality', 'quality', { unique: false });
        metricsStore.createIndex('bandwidthKbps', 'bandwidthKbps', { unique: false });
      }

      // Quality adjustments store
      if (!db.objectStoreNames.contains(ADJUSTMENTS_STORE)) {
        const adjustmentsStore = db.createObjectStore(ADJUSTMENTS_STORE, {
          keyPath: 'id',
        });
        adjustmentsStore.createIndex('timestamp', 'timestamp', { unique: false });
        adjustmentsStore.createIndex('toPreset', 'toPreset', { unique: false });
        adjustmentsStore.createIndex('success', 'success', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
      }
    };
  });
}

// ==================== Network Metrics ====================

/**
 * Record network metrics
 */
export async function recordNetworkMetrics(metrics: NetworkMetrics): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METRICS_STORE], 'readwrite');
    const store = transaction.objectStore(METRICS_STORE);

    // Convert Date to ISO string for storage
    const metricsData = {
      ...metrics,
      timestamp: metrics.timestamp.toISOString(),
    };

    const request = store.put(metricsData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get network metrics within time range
 */
export async function getNetworkMetrics(
  startTime: Date,
  endTime: Date = new Date()
): Promise<NetworkMetrics[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METRICS_STORE], 'readonly');
    const store = transaction.objectStore(METRICS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allMetrics = request.result as any[];
      const filtered = allMetrics
        .filter((m) => {
          const timestamp = new Date(m.timestamp);
          return timestamp >= startTime && timestamp <= endTime;
        })
        .map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get latest network metrics
 */
export async function getLatestNetworkMetrics(count: number = 1): Promise<NetworkMetrics[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METRICS_STORE], 'readonly');
    const store = transaction.objectStore(METRICS_STORE);
    const request = store.openCursor(null, 'prev');

    const results: any[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor && results.length < count) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(
          results.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Prune old network metrics
 */
export async function pruneOldMetrics(retentionHours: number = 24): Promise<void> {
  const db = await initDatabase();
  const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METRICS_STORE], 'readwrite');
    const store = transaction.objectStore(METRICS_STORE);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const timestamp = new Date(cursor.value.timestamp);
        if (timestamp < cutoffTime) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ==================== Quality Adjustments ====================

/**
 * Record quality adjustment
 */
export async function recordQualityAdjustment(adjustment: QualityAdjustment): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ADJUSTMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(ADJUSTMENTS_STORE);

    // Convert Dates to ISO strings
    const adjustmentData = {
      ...adjustment,
      timestamp: adjustment.timestamp.toISOString(),
      networkMetrics: {
        ...adjustment.networkMetrics,
        timestamp: adjustment.networkMetrics.timestamp.toISOString(),
      },
    };

    const request = store.put(adjustmentData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all quality adjustments
 */
export async function getAllAdjustments(): Promise<QualityAdjustment[]> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ADJUSTMENTS_STORE], 'readonly');
    const store = transaction.objectStore(ADJUSTMENTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const adjustments = request.result.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp),
        networkMetrics: {
          ...a.networkMetrics,
          timestamp: new Date(a.networkMetrics.timestamp),
        },
      }));
      resolve(adjustments);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get quality adjustments within time range
 */
export async function getQualityAdjustments(
  startTime: Date,
  endTime: Date = new Date()
): Promise<QualityAdjustment[]> {
  const allAdjustments = await getAllAdjustments();
  return allAdjustments.filter((a) => a.timestamp >= startTime && a.timestamp <= endTime);
}

/**
 * Get recent adjustments
 */
export async function getRecentAdjustments(count: number = 10): Promise<QualityAdjustment[]> {
  const allAdjustments = await getAllAdjustments();
  return allAdjustments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, count);
}

/**
 * Prune old quality adjustments
 */
export async function pruneOldAdjustments(retentionDays: number = 30): Promise<void> {
  const db = await initDatabase();
  const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ADJUSTMENTS_STORE], 'readwrite');
    const store = transaction.objectStore(ADJUSTMENTS_STORE);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const timestamp = new Date(cursor.value.timestamp);
        if (timestamp < cutoffTime) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ==================== Configuration ====================

/**
 * Save configuration
 */
export async function saveConfig(config: AdaptiveQualityConfig): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(CONFIG_STORE);

    const request = store.put({ key: 'config', value: config });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get configuration
 */
export async function getConfig(): Promise<AdaptiveQualityConfig> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONFIG_STORE], 'readonly');
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get('config');

    request.onsuccess = () => {
      const config = request.result?.value || DEFAULT_ADAPTIVE_CONFIG;
      resolve(config);
    };
    request.onerror = () => reject(request.error);
  });
}

// ==================== Analytics ====================

/**
 * Calculate quality stability metrics
 */
async function calculateQualityStability(
  adjustments: QualityAdjustment[],
  timeWindowMs: number
): Promise<QualityStability> {
  if (adjustments.length === 0) {
    return {
      totalTimeMs: 0,
      timeAtPreset: {
        minimal: 0,
        low: 0,
        medium: 0,
        high: 0,
        ultra: 0,
      },
      adjustmentCount: 0,
      avgTimeBetweenAdjustments: 0,
      optimalTimePercentage: 0,
    };
  }

  // Sort adjustments by timestamp
  const sorted = [...adjustments].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate time at each preset
  const timeAtPreset: Record<QualityPreset, number> = {
    minimal: 0,
    low: 0,
    medium: 0,
    high: 0,
    ultra: 0,
  };

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const duration = next.timestamp.getTime() - current.timestamp.getTime();
    timeAtPreset[current.toPreset] += duration;
  }

  // Add time from last adjustment to now
  const lastAdjustment = sorted[sorted.length - 1];
  const timeSinceLast = Date.now() - lastAdjustment.timestamp.getTime();
  timeAtPreset[lastAdjustment.toPreset] += timeSinceLast;

  // Calculate average time between adjustments
  const totalTimeBetween = sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime();
  const avgTimeBetweenAdjustments = totalTimeBetween / (sorted.length - 1) / 60000; // in minutes

  // Calculate optimal time percentage (high and ultra presets)
  const optimalTime = timeAtPreset.high + timeAtPreset.ultra;
  const optimalTimePercentage = (optimalTime / timeWindowMs) * 100;

  return {
    totalTimeMs: timeWindowMs,
    timeAtPreset,
    adjustmentCount: adjustments.length,
    avgTimeBetweenAdjustments,
    optimalTimePercentage,
  };
}

/**
 * Calculate network performance summary
 */
async function calculateNetworkPerformance(metrics: NetworkMetrics[]): Promise<NetworkPerformance> {
  if (metrics.length === 0) {
    return {
      avgBandwidthKbps: 0,
      minBandwidthKbps: 0,
      maxBandwidthKbps: 0,
      avgLatencyMs: 0,
      avgPacketLoss: 0,
      mostCommonQuality: 'poor',
    };
  }

  const avgBandwidthKbps = metrics.reduce((sum, m) => sum + m.bandwidthKbps, 0) / metrics.length;
  const minBandwidthKbps = Math.min(...metrics.map((m) => m.bandwidthKbps));
  const maxBandwidthKbps = Math.max(...metrics.map((m) => m.bandwidthKbps));
  const avgLatencyMs = metrics.reduce((sum, m) => sum + m.latencyMs, 0) / metrics.length;
  const avgPacketLoss = metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length;

  // Find most common quality
  const qualityCounts: Record<NetworkQuality, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0,
  };
  metrics.forEach((m) => {
    qualityCounts[m.quality]++;
  });

  const mostCommonQuality = (
    Object.entries(qualityCounts).sort((a, b) => b[1] - a[1])[0][0]
  ) as NetworkQuality;

  return {
    avgBandwidthKbps,
    minBandwidthKbps,
    maxBandwidthKbps,
    avgLatencyMs,
    avgPacketLoss,
    mostCommonQuality,
  };
}

/**
 * Calculate complete analytics
 */
export async function calculateAnalytics(timeWindowHours: number = 24): Promise<AdaptiveQualityAnalytics> {
  const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
  const endTime = new Date();

  const [metrics, adjustments] = await Promise.all([
    getNetworkMetrics(startTime, endTime),
    getQualityAdjustments(startTime, endTime),
  ]);

  const recentAdjustments = await getRecentAdjustments(10);

  const stability = await calculateQualityStability(adjustments, timeWindowHours * 60 * 60 * 1000);
  const network = await calculateNetworkPerformance(metrics);

  const totalAdjustments = adjustments.length;
  const successfulAdjustments = adjustments.filter((a) => a.success).length;
  const failedAdjustments = totalAdjustments - successfulAdjustments;

  return {
    stability,
    network,
    totalAdjustments,
    successfulAdjustments,
    failedAdjustments,
    recentAdjustments,
  };
}

// ==================== Data Management ====================

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  const db = await initDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METRICS_STORE, ADJUSTMENTS_STORE, CONFIG_STORE], 'readwrite');

    const metricsStore = transaction.objectStore(METRICS_STORE);
    const adjustmentsStore = transaction.objectStore(ADJUSTMENTS_STORE);
    const configStore = transaction.objectStore(CONFIG_STORE);

    const promises = [
      new Promise<void>((res, rej) => {
        const req = metricsStore.clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
      new Promise<void>((res, rej) => {
        const req = adjustmentsStore.clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
      new Promise<void>((res, rej) => {
        const req = configStore.clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
    ];

    Promise.all(promises)
      .then(() => resolve())
      .catch(reject);
  });
}
