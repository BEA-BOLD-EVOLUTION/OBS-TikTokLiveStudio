import { describe, expect, it } from 'vitest';
import type { GoLiveStep, GoLiveState, PreflightCheck } from './goLiveTypes.js';

describe('goLiveTypes', () => {
  describe('GoLiveStep type', () => {
    it('should accept all valid step values', () => {
      const validSteps: GoLiveStep[] = [
        'idle',
        'starting-scene',
        'virtual-camera',
        'checklist',
        'live-scene',
        'recording',
        'live',
        'error',
      ];

      expect(validSteps).toHaveLength(8);
    });
  });

  describe('PreflightCheck interface', () => {
    it('should support passing check', () => {
      const check: PreflightCheck = {
        id: 'obs-connection',
        name: 'OBS Connected',
        passed: true,
      };

      expect(check.passed).toBe(true);
      expect(check.errorMessage).toBeUndefined();
    });

    it('should support failing check with error message', () => {
      const check: PreflightCheck = {
        id: 'scene-exists',
        name: 'Required scenes exist',
        passed: false,
        errorMessage: 'SCN_STARTING scene not found',
      };

      expect(check.passed).toBe(false);
      expect(check.errorMessage).toBeDefined();
    });
  });

  describe('GoLiveState interface', () => {
    it('should support idle state', () => {
      const state: GoLiveState = {
        currentStep: 'idle',
        isInProgress: false,
        preflightChecks: [],
        checklistItems: {},
      };

      expect(state.currentStep).toBe('idle');
      expect(state.isInProgress).toBe(false);
    });

    it('should support in-progress state with timing', () => {
      const startTime = new Date();
      const state: GoLiveState = {
        currentStep: 'live',
        isInProgress: true,
        preflightChecks: [],
        checklistItems: {},
        startTime,
        goLiveTime: new Date(startTime.getTime() + 5000),
      };

      expect(state.isInProgress).toBe(true);
      expect(state.startTime).toBeInstanceOf(Date);
      expect(state.goLiveTime).toBeInstanceOf(Date);
    });

    it('should support error state', () => {
      const state: GoLiveState = {
        currentStep: 'error',
        isInProgress: false,
        preflightChecks: [],
        checklistItems: {},
        errorMessage: 'Virtual camera failed to start',
      };

      expect(state.currentStep).toBe('error');
      expect(state.errorMessage).toBeDefined();
    });

    it('should support checklist completion tracking', () => {
      const state: GoLiveState = {
        currentStep: 'checklist',
        isInProgress: true,
        preflightChecks: [],
        checklistItems: {
          'tiktok-ready': true,
          'audio-check': true,
          'title-set': false,
        },
      };

      expect(Object.keys(state.checklistItems)).toHaveLength(3);
      expect(state.checklistItems['tiktok-ready']).toBe(true);
      expect(state.checklistItems['title-set']).toBe(false);
    });
  });
});
