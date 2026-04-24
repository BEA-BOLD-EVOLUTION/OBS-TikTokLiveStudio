/**
 * Tests for transition type definitions and constants
 * Written using READ-FIRST methodology - all tests based on actual code in transitionTypes.ts
 */
import { describe, it, expect } from 'vitest';
import type {
  Transition,
  TransitionSection,
  TransitionLibrary,
  TransitionFilter,
  TransitionLibrarySettings,
} from './transitionTypes';
import { DEFAULT_SECTIONS } from './transitionTypes';

describe('transitionTypes', () => {
  describe('Transition interface', () => {
    it('should create a valid transition object with all required properties', () => {
      const transition: Transition = {
        id: 'TRN_TEST',
        name: 'Test Transition',
        video: '/path/to/video.mp4',
        duration: 2.5,
        tags: ['test', 'example'],
        color: '#3B82F6',
        emoji: '🎬',
        favorite: true,
        collections: ['Test Collection'],
        returnToPrevious: true,
      };

      expect(transition.id).toBe('TRN_TEST');
      expect(transition.name).toBe('Test Transition');
      expect(transition.video).toBe('/path/to/video.mp4');
      expect(transition.duration).toBe(2.5);
      expect(transition.tags).toHaveLength(2);
      expect(transition.color).toBe('#3B82F6');
      expect(transition.emoji).toBe('🎬');
      expect(transition.favorite).toBe(true); // Property is 'favorite', not 'isFavorite'
      expect(transition.collections).toHaveLength(1);
      expect(transition.returnToPrevious).toBe(true);
    });

    it('should allow optional properties to be undefined', () => {
      const transition: Transition = {
        id: 'TRN_MINIMAL',
        name: 'Minimal',
        video: '/video.mp4',
        duration: 1,
        tags: [],
        color: '#000',
        emoji: '🎬',
        favorite: false,
        collections: [],
        returnToPrevious: false,
        // description, nextScene, thumbnail, usageCount, lastUsed are all optional
      };

      expect(transition.description).toBeUndefined();
      expect(transition.nextScene).toBeUndefined();
      expect(transition.thumbnail).toBeUndefined();
      expect(transition.usageCount).toBeUndefined(); // usageCount is OPTIONAL, not guaranteed to be 0
      expect(transition.lastUsed).toBeUndefined();
    });

    it('should allow nextScene when returnToPrevious is false', () => {
      const transition: Transition = {
        id: 'TRN_NEXT',
        name: 'Next Scene',
        video: '/video.mp4',
        duration: 1,
        tags: [],
        color: '#000',
        emoji: '🎬',
        favorite: false,
        collections: [],
        returnToPrevious: false,
        nextScene: 'SCN_LIVE', // Optional override for next scene
      };

      expect(transition.nextScene).toBe('SCN_LIVE');
    });
  });

  describe('TransitionSection interface', () => {
    it('should create a valid section with all properties', () => {
      const section: TransitionSection = {
        id: 'test-section',
        name: 'Test Section',
        emoji: '🧪',
        custom: true, // Property DOES exist
        hidden: false, // Property DOES exist
        color: '#3B82F6',
        transitions: [],
        order: 1,
      };

      expect(section.id).toBe('test-section');
      expect(section.name).toBe('Test Section');
      expect(section.emoji).toBe('🧪');
      expect(section.custom).toBe(true); // Verified: custom property exists
      expect(section.hidden).toBe(false); // Verified: hidden property exists
      expect(section.color).toBe('#3B82F6');
      expect(section.transitions).toEqual([]);
      expect(section.order).toBe(1);
    });

    it('should allow sections with multiple transitions', () => {
      const transition1: Transition = {
        id: 'TRN_1',
        name: 'First',
        video: '/1.mp4',
        duration: 1,
        tags: [],
        color: '#000',
        emoji: '🎬',
        favorite: false,
        collections: [],
        returnToPrevious: true,
      };

      const transition2: Transition = {
        id: 'TRN_2',
        name: 'Second',
        video: '/2.mp4',
        duration: 2,
        tags: [],
        color: '#000',
        emoji: '🎬',
        favorite: false,
        collections: [],
        returnToPrevious: true,
      };

      const section: TransitionSection = {
        id: 'multi-section',
        name: 'Multi Section',
        emoji: '📚',
        custom: false,
        hidden: false,
        color: '#10B981',
        transitions: [transition1, transition2],
        order: 2,
      };

      expect(section.transitions).toHaveLength(2);
      expect(section.transitions[0].id).toBe('TRN_1');
      expect(section.transitions[1].id).toBe('TRN_2');
    });
  });

  describe('TransitionLibrary interface', () => {
    it('should create a valid library structure', () => {
      const settings: TransitionLibrarySettings = {
        defaultSection: 'topic-changes',
        autoGenerateThumbnails: true,
        thumbnailTimestamp: 'midpoint',
        maxFavorites: 20,
        enabledSections: [],
        hiddenSections: [],
        streamDeckPages: [],
        viewMode: 'grid',
        sortBy: 'name',
        gridColumns: 4,
      };

      const library: TransitionLibrary = {
        sections: [],
        settings, // settings property DOES exist
        collections: [],
      };

      expect(library.sections).toEqual([]);
      expect(library.settings).toBeDefined(); // Verified: settings exists
      expect(library.settings.defaultSection).toBe('topic-changes');
      expect(library.collections).toEqual([]);
    });
  });

  describe('TransitionFilter interface', () => {
    it('should create a valid filter object', () => {
      const filter: TransitionFilter = {
        query: 'test search',
        sections: ['topic-changes', 'sponsors'],
        durationRange: {
          min: 1,
          max: 5,
        },
        tags: ['gaming', 'animation'],
        colors: ['#3B82F6', '#10B981'],
        favoritesOnly: true,
      };

      expect(filter.query).toBe('test search');
      expect(filter.sections).toHaveLength(2);
      expect(filter.durationRange).toBeDefined();
      expect(filter.durationRange?.min).toBe(1);
      expect(filter.durationRange?.max).toBe(5);
      expect(filter.tags).toHaveLength(2);
      expect(filter.colors).toHaveLength(2);
      expect(filter.favoritesOnly).toBe(true);
    });
  });

  describe('DEFAULT_SECTIONS constant', () => {
    it('should export exactly 6 default sections', () => {
      // Verified by reading code: DEFAULT_SECTIONS has 6 sections, not 11
      expect(DEFAULT_SECTIONS).toHaveLength(6);
    });

    it('should have correct section IDs in order', () => {
      const sectionIds = DEFAULT_SECTIONS.map((s) => s.id);
      expect(sectionIds).toEqual([
        'topic-changes',
        'sponsors',
        'brb',
        'quick-reactions',
        'intros',
        'outros',
      ]);
    });

    it('should have all required properties for each section', () => {
      DEFAULT_SECTIONS.forEach((section) => {
        expect(section.id).toBeDefined();
        expect(section.name).toBeDefined();
        expect(section.emoji).toBeDefined();
        expect(section.description).toBeDefined();
        expect(section.color).toBeDefined();

        expect(typeof section.id).toBe('string');
        expect(typeof section.name).toBe('string');
        expect(typeof section.emoji).toBe('string');
        expect(typeof section.description).toBe('string');
        expect(section.color).toMatch(/^#[0-9A-F]{6}$/i); // Valid hex color
      });
    });

    it('should have unique IDs', () => {
      const ids = DEFAULT_SECTIONS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(DEFAULT_SECTIONS.length);
    });

    it('should have the specific topic-changes section', () => {
      const topicChanges = DEFAULT_SECTIONS.find((s) => s.id === 'topic-changes');
      expect(topicChanges).toBeDefined();
      expect(topicChanges?.name).toBe('Topic Changes');
      expect(topicChanges?.emoji).toBe('🌊');
      expect(topicChanges?.color).toBe('#3B82F6');
    });

    it('should have the specific quick-reactions section', () => {
      const quickReactions = DEFAULT_SECTIONS.find((s) => s.id === 'quick-reactions');
      expect(quickReactions).toBeDefined();
      expect(quickReactions?.name).toBe('Quick Reactions');
      expect(quickReactions?.emoji).toBe('⚡');
      expect(quickReactions?.color).toBe('#EF4444');
      expect(quickReactions?.description).toContain('0.3-1.5 sec'); // Ultra-short duration
    });
  });
});
