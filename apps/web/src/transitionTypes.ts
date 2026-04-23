/**
 * TypeScript types for AI Transition Sequences library
 * Phase 2: Creator Workflows
 */

/**
 * Individual transition video configuration
 */
export interface Transition {
  /** Unique identifier (e.g., "TRN_TOPIC_MORPH") */
  id: string;
  /** Display name */
  name: string;
  /** Path to video file (local or URL) */
  video: string;
  /** Duration in seconds */
  duration: number;
  /** Optional description */
  description?: string;
  /** Tags for search/filtering */
  tags: string[];
  /** Color hex code for visual organization */
  color: string;
  /** Emoji for quick visual scanning */
  emoji: string;
  /** Is this a favorite? */
  favorite: boolean;
  /** Collection memberships (e.g., "Gaming Stream") */
  collections: string[];
  /** Return to previous scene after transition? */
  returnToPrevious: boolean;
  /** If not returning to previous, which scene to go to? */
  nextScene?: string;
  /** Auto-generated thumbnail data URL */
  thumbnail?: string;
  /** Usage analytics */
  usageCount?: number;
  lastUsed?: Date;
}

/**
 * Section/category of transitions
 */
export interface TransitionSection {
  /** Section identifier */
  id: string;
  /** Display name (editable) */
  name: string;
  /** Emoji for section icon */
  emoji: string;
  /** Is this a custom section (can be deleted)? */
  custom: boolean;
  /** Is this section currently hidden? */
  hidden: boolean;
  /** Section theme color */
  color: string;
  /** Transitions in this section */
  transitions: Transition[];
  /** Section order/priority */
  order: number;
}

/**
 * Stream Deck page configuration
 */
export interface StreamDeckPage {
  /** Page number (1-based) */
  page: number;
  /** Page label */
  label: string;
  /** Transition IDs mapped to this page */
  transitions: string[];
}

/**
 * Transition library settings
 */
export interface TransitionLibrarySettings {
  /** Default section to show on load */
  defaultSection: string;
  /** Auto-generate thumbnails from video? */
  autoGenerateThumbnails: boolean;
  /** Timestamp for thumbnail (midpoint, first-frame, etc.) */
  thumbnailTimestamp: 'midpoint' | 'first-frame' | 'last-frame';
  /** Maximum favorites allowed */
  maxFavorites: number;
  /** Enabled section IDs */
  enabledSections: string[];
  /** Hidden section IDs */
  hiddenSections: string[];
  /** Stream Deck page mappings */
  streamDeckPages: StreamDeckPage[];
  /** View mode preference */
  viewMode: 'grid' | 'list';
  /** Sort preference */
  sortBy: 'name' | 'duration' | 'lastUsed' | 'mostUsed' | 'alphabetical';
  /** Grid columns count */
  gridColumns: number;
}

/**
 * Complete transition library configuration
 */
export interface TransitionLibrary {
  /** All sections */
  sections: TransitionSection[];
  /** Library settings */
  settings: TransitionLibrarySettings;
  /** Available collections */
  collections: string[];
}

/**
 * Filter state for transition search
 */
export interface TransitionFilter {
  /** Search query */
  query: string;
  /** Selected section IDs */
  sections: string[];
  /** Duration range filter */
  durationRange?: {
    min: number;
    max: number;
  };
  /** Tag filters */
  tags: string[];
  /** Color filters */
  colors: string[];
  /** Show favorites only? */
  favoritesOnly: boolean;
}

/**
 * Default section definitions (cannot be deleted, only hidden)
 */
export const DEFAULT_SECTIONS = [
  {
    id: 'topic-changes',
    name: 'Topic Changes',
    emoji: '🌊',
    description: 'Scene-to-scene transitions (morphs, glitches, wipes)',
    color: '#3B82F6',
  },
  {
    id: 'sponsors',
    name: 'Sponsors',
    emoji: '💰',
    description: 'Brand-specific transitions with logos/animations',
    color: '#10B981',
  },
  {
    id: 'brb',
    name: 'BRB',
    emoji: '☕',
    description: 'Break transitions with countdown/messages',
    color: '#F59E0B',
  },
  {
    id: 'quick-reactions',
    name: 'Quick Reactions',
    emoji: '⚡',
    description: 'Ultra-short (0.3-1.5 sec) instant-impact moments',
    color: '#EF4444',
  },
  {
    id: 'intros',
    name: 'Intros',
    emoji: '🎬',
    description: 'Stream opening sequences',
    color: '#8B5CF6',
  },
  {
    id: 'outros',
    name: 'Outros',
    emoji: '🎭',
    description: 'Stream ending sequences',
    color: '#EC4899',
  },
] as const;
