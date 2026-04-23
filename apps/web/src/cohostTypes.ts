/**
 * Cohost Tracking Types - TikTok Live username capture and history management
 */

/**
 * Cohost record with capture metadata and notes
 */
export interface CohostRecord {
  id: string;
  username: string; // TikTok username (with or without @)
  joinedAt: Date;
  leftAt?: Date;
  notes: string[]; // Quick notes/tags
  customNote?: string; // Freeform text
  blocked: boolean; // Flag to prevent matching again
  lastSeen: Date;
  streamCount: number; // How many times cohosted
  ocrConfidence?: number; // Tesseract confidence score (0-100)
  imageDataUrl?: string; // Optional: store cropped username screenshot
}

/**
 * Cohost history filter and search criteria
 */
export interface CohostFilter {
  searchQuery: string; // Search by username
  startDate?: Date;
  endDate?: Date;
  tags?: string[]; // Filter by specific tags
  showBlocked: boolean; // Include blocked cohosts in results
}

/**
 * OCR processing result from Tesseract.js
 */
export interface OCRResult {
  text: string; // Extracted text
  confidence: number; // Confidence score (0-100)
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

/**
 * Image region coordinates for cropping
 */
export interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * UI state for Cohost Tracking component
 */
export interface CohostUIState {
  isProcessing: boolean;
  showHistory: boolean;
  filter: CohostFilter;
  imageFile?: File;
  ocrText?: string;
  ocrConfidence?: number;
  currentUsername?: string;
  croppedImageUrl?: string;
}

/**
 * Quick note preset definition
 */
export interface QuickNotePreset {
  id: string;
  emoji: string;
  label: string;
}

/**
 * Cohost statistics for analytics display
 */
export interface CohostStats {
  totalCohosts: number;
  uniqueCohosts: number;
  blockedCount: number;
  averageStreamsPerCohost?: number;
  mostFrequentCohost?: { username: string; count: number };
  averageStreamCount?: number;
}

/**
 * Default quick note presets (matching roadmap.md specification)
 */
export const DEFAULT_QUICK_NOTES: QuickNotePreset[] = [
  { id: 'great', emoji: '⭐', label: 'Great cohost - will match again' },
  { id: 'block', emoji: '🚫', label: 'Block - do not match again' },
  { id: 'good-energy', emoji: '👍', label: 'Good energy - would stream again' },
  { id: 'meh', emoji: '😐', label: 'Meh - neutral experience' },
  { id: 'business', emoji: '💰', label: 'Business/promo focused' },
  { id: 'similar-niche', emoji: '🎮', label: 'Similar niche/content' },
  { id: 'chat-engagement', emoji: '💬', label: 'Great chat engagement' },
  { id: 'custom', emoji: '📝', label: 'Custom note' },
];

/**
 * Normalize TikTok username (strip @, lowercase, trim)
 */
export function normalizeUsername(username: string): string {
  return username.replace(/^@/, '').toLowerCase().trim();
}

/**
 * Validate TikTok username format (alphanumeric, dots, underscores, 1-24 chars)
 */
export function isValidUsername(username: string | null): boolean {
  if (!username) {
    return false;
  }
  const normalized = normalizeUsername(username);
  return /^[a-z0-9._]{1,24}$/.test(normalized);
}

/**
 * Format cohost record for display with badge
 */
export function formatCohostDisplay(record: CohostRecord): {
  display: string;
  badge: string;
} {
  const display = `@${record.username}`;
  let badge = '';

  if (record.blocked) {
    badge = '🔴';
  } else if (record.streamCount >= 5) {
    badge = '🟢'; // Great cohost (5+ streams)
  } else if (record.streamCount >= 2) {
    badge = '🟡'; // Returning cohost
  } else {
    badge = '⚪'; // New cohost
  }

  return { display, badge };
}

/**
 * Convert date to human-readable "time ago" format
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Generate unique ID using crypto API
 */
export function generateId(): string {
  return crypto.randomUUID();
}
