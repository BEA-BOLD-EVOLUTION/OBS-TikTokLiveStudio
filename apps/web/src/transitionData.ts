/**
 * Example transition library data
 * Phase 2: AI Transition Sequences
 */

import type {
  TransitionLibrary,
  TransitionSection,
  Transition,
} from './transitionTypes.js';
import { DEFAULT_SECTIONS } from './transitionTypes.js';

/**
 * Create example transition data for demonstration
 */
export function createExampleTransitions(): Transition[] {
  return [
    // Topic Changes
    {
      id: 'TRN_TOPIC_MORPH',
      name: 'Morph Effect',
      video: 'transitions/topic-change/morph.mp4',
      duration: 3.0,
      description: 'Liquid morph with particle swirl',
      tags: ['smooth', 'elegant'],
      color: '#3B82F6',
      emoji: '🌊',
      favorite: true,
      collections: ['Gaming Stream', 'Professional'],
      returnToPrevious: true,
      usageCount: 24,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 'TRN_TOPIC_GLITCH',
      name: 'Digital Glitch',
      video: 'transitions/topic-change/glitch.mp4',
      duration: 2.0,
      description: 'Fast digital distortion',
      tags: ['fast', 'tech'],
      color: '#8B5CF6',
      emoji: '⚡',
      favorite: false,
      collections: ['Gaming Stream'],
      returnToPrevious: true,
      usageCount: 12,
      lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      id: 'TRN_TOPIC_SPIN',
      name: 'Spin Wipe',
      video: 'transitions/topic-change/spin.mp4',
      duration: 2.5,
      description: 'Circular wipe with rotation',
      tags: ['dynamic', 'smooth'],
      color: '#3B82F6',
      emoji: '🌀',
      favorite: true,
      collections: ['Tutorial Stream'],
      returnToPrevious: true,
      usageCount: 18,
      lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },

    // Sponsors
    {
      id: 'TRN_SPONSOR_BRAND_A',
      name: 'Brand A Bumper',
      video: 'transitions/sponsors/brand-a.mp4',
      duration: 5.0,
      description: 'Glitch transition with Brand A logo',
      tags: ['sponsor', 'branded'],
      color: '#10B981',
      emoji: '💰',
      favorite: true,
      collections: ['Sponsored Streams'],
      returnToPrevious: false,
      nextScene: 'SCN_LIVE',
      usageCount: 8,
      lastUsed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      id: 'TRN_SPONSOR_BRAND_B',
      name: 'Brand B Transition',
      video: 'transitions/sponsors/brand-b.mp4',
      duration: 4.5,
      description: 'Smooth fade with Brand B animation',
      tags: ['sponsor', 'elegant'],
      color: '#10B981',
      emoji: '✨',
      favorite: false,
      collections: ['Sponsored Streams'],
      returnToPrevious: false,
      nextScene: 'SCN_LIVE',
      usageCount: 3,
      lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    },

    // BRB
    {
      id: 'TRN_BRB_WARP',
      name: 'Warp Exit',
      video: 'transitions/brb/warp.mp4',
      duration: 4.0,
      description: 'Warp effect with countdown timer',
      tags: ['break', 'countdown'],
      color: '#F59E0B',
      emoji: '☕',
      favorite: true,
      collections: ['Just Chatting', 'Long Streams'],
      returnToPrevious: true,
      usageCount: 15,
      lastUsed: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      id: 'TRN_BRB_COFFEE',
      name: 'Coffee Break',
      video: 'transitions/brb/coffee.mp4',
      duration: 3.5,
      description: 'Animated coffee cup with message',
      tags: ['break', 'casual'],
      color: '#F59E0B',
      emoji: '☕',
      favorite: false,
      collections: ['Just Chatting'],
      returnToPrevious: true,
      usageCount: 9,
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },

    // Quick Reactions
    {
      id: 'TRN_REACT_JUMPSCARE',
      name: 'Jump Scare',
      video: 'transitions/quick/jumpscare.mp4',
      duration: 0.8,
      description: 'Sudden flash and shake',
      tags: ['instant', 'shock'],
      color: '#EF4444',
      emoji: '😱',
      favorite: true,
      collections: ['Gaming Stream', 'Horror'],
      returnToPrevious: true,
      usageCount: 45,
      lastUsed: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    },
    {
      id: 'TRN_REACT_FLASHBANG',
      name: 'Flashbang',
      video: 'transitions/quick/flashbang.mp4',
      duration: 0.5,
      description: 'Bright white flash',
      tags: ['instant', 'bright'],
      color: '#EF4444',
      emoji: '💥',
      favorite: true,
      collections: ['Gaming Stream'],
      returnToPrevious: true,
      usageCount: 67,
      lastUsed: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      id: 'TRN_REACT_ZOOM',
      name: 'Zoom Punch',
      video: 'transitions/quick/zoom.mp4',
      duration: 1.2,
      description: 'Fast zoom with impact',
      tags: ['dynamic', 'fast'],
      color: '#EF4444',
      emoji: '🎯',
      favorite: false,
      collections: ['Gaming Stream', 'Reaction'],
      returnToPrevious: true,
      usageCount: 22,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  ];
}

/**
 * Create initial library structure with example data
 */
export function createExampleLibrary(): TransitionLibrary {
  const allTransitions = createExampleTransitions();

  // Organize transitions into sections
  const sections: TransitionSection[] = DEFAULT_SECTIONS.map((def, index) => {
    const sectionTransitions = allTransitions.filter((t) => {
      if (def.id === 'topic-changes') return t.id.startsWith('TRN_TOPIC_');
      if (def.id === 'sponsors') return t.id.startsWith('TRN_SPONSOR_');
      if (def.id === 'brb') return t.id.startsWith('TRN_BRB_');
      if (def.id === 'quick-reactions') return t.id.startsWith('TRN_REACT_');
      return false;
    });

    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      custom: false,
      hidden: def.id === 'intros' || def.id === 'outros', // Hide Intros/Outros by default
      color: def.color,
      transitions: sectionTransitions,
      order: index,
    };
  });

  return {
    sections,
    settings: {
      defaultSection: 'topic-changes',
      autoGenerateThumbnails: true,
      thumbnailTimestamp: 'midpoint',
      maxFavorites: 12,
      enabledSections: sections.filter((s) => !s.hidden).map((s) => s.id),
      hiddenSections: sections.filter((s) => s.hidden).map((s) => s.id),
      streamDeckPages: [
        {
          page: 1,
          label: 'Favorites',
          transitions: ['TRN_TOPIC_MORPH', 'TRN_SPONSOR_BRAND_A', 'TRN_BRB_WARP'],
        },
        {
          page: 2,
          label: 'Quick Reactions',
          transitions: ['TRN_REACT_JUMPSCARE', 'TRN_REACT_FLASHBANG', 'TRN_REACT_ZOOM'],
        },
      ],
      viewMode: 'grid',
      sortBy: 'name',
      gridColumns: 4,
    },
    collections: [
      'Gaming Stream',
      'Professional',
      'Tutorial Stream',
      'Just Chatting',
      'Long Streams',
      'Sponsored Streams',
      'Horror',
      'Reaction',
    ],
  };
}

/**
 * Get all favorite transitions from library
 */
export function getFavoriteTransitions(library: TransitionLibrary): Transition[] {
  return library.sections
    .flatMap((section) => section.transitions)
    .filter((t) => t.favorite)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, library.settings.maxFavorites);
}

/**
 * Get all tags used in library
 */
export function getAllTags(library: TransitionLibrary): string[] {
  const tagSet = new Set<string>();
  library.sections.forEach((section) => {
    section.transitions.forEach((t) => {
      t.tags.forEach((tag) => tagSet.add(tag));
    });
  });
  return Array.from(tagSet).sort();
}

/**
 * Search transitions by query
 */
export function searchTransitions(
  library: TransitionLibrary,
  query: string,
): Transition[] {
  const lowerQuery = query.toLowerCase();
  return library.sections
    .flatMap((section) => section.transitions)
    .filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    );
}
