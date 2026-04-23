/**
 * Scene Recommendation Engine - Pattern detection and recommendation generation
 */

import type {
  SceneSwitchRecord,
  ScenePattern,
  SceneRecommendation,
  RecommendationConfig,
  TimeOfDay,
  DayType,
} from './sceneRecommendationTypes.js';
import {
  getTimeOfDay,
  getDayType,
  getTimeOfDayIcon,
  getDayTypeIcon,
} from './sceneRecommendationTypes.js';
import { getSceneSwitchHistory, getConfig } from './sceneRecommendationStorage.js';

/**
 * Recommendation Engine Class
 */
export class SceneRecommendationEngine {
  private patterns: ScenePattern[] = [];
  private config: RecommendationConfig;

  constructor(config?: RecommendationConfig) {
    this.config = config || {
      enabled: true,
      minDataPoints: 10,
      confidenceThreshold: 60,
      maxRecommendations: 3,
      timeWindow: 30 * 24 * 60 * 60 * 1000,
      patternDetection: {
        timeOfDay: true,
        dayOfWeek: true,
        sequence: true,
        duration: true,
      },
    };
  }

  /**
   * Analyze historical data and detect patterns
   */
  async analyzePatterns(): Promise<ScenePattern[]> {
    const records = await getSceneSwitchHistory(this.config.timeWindow);

    if (records.length < this.config.minDataPoints) {
      return [];
    }

    const patterns: ScenePattern[] = [];

    // Time-of-day patterns
    if (this.config.patternDetection.timeOfDay) {
      patterns.push(...this.detectTimeOfDayPatterns(records));
    }

    // Day-of-week patterns
    if (this.config.patternDetection.dayOfWeek) {
      patterns.push(...this.detectDayOfWeekPatterns(records));
    }

    // Sequence patterns (what scene typically follows what)
    if (this.config.patternDetection.sequence) {
      patterns.push(...this.detectSequencePatterns(records));
    }

    // Duration patterns (how long in each scene)
    if (this.config.patternDetection.duration) {
      patterns.push(...this.detectDurationPatterns(records));
    }

    this.patterns = patterns;
    return patterns;
  }

  /**
   * Detect time-of-day patterns
   */
  private detectTimeOfDayPatterns(records: SceneSwitchRecord[]): ScenePattern[] {
    const timeOfDayMap = new Map<string, Map<TimeOfDay, number>>();

    // Group by scene and time of day
    records.forEach((record) => {
      const tod = getTimeOfDay(record.hour);
      if (!timeOfDayMap.has(record.sceneName)) {
        timeOfDayMap.set(record.sceneName, new Map());
      }
      const sceneMap = timeOfDayMap.get(record.sceneName)!;
      sceneMap.set(tod, (sceneMap.get(tod) || 0) + 1);
    });

    const patterns: ScenePattern[] = [];

    // Convert to patterns
    timeOfDayMap.forEach((todMap, sceneName) => {
      const total = Array.from(todMap.values()).reduce((a, b) => a + b, 0);
      
      todMap.forEach((count, tod) => {
        const frequency = count;
        const confidence = Math.min(100, (count / total) * 100);

        if (confidence >= 30) { // Only keep significant patterns
          patterns.push({
            id: `tod-${sceneName}-${tod}`,
            sceneName,
            timeOfDay: tod,
            frequency,
            confidence,
          });
        }
      });
    });

    return patterns;
  }

  /**
   * Detect day-of-week patterns
   */
  private detectDayOfWeekPatterns(records: SceneSwitchRecord[]): ScenePattern[] {
    const dayTypeMap = new Map<string, Map<DayType, number>>();

    // Group by scene and day type
    records.forEach((record) => {
      const dayType = getDayType(record.dayOfWeek);
      if (!dayTypeMap.has(record.sceneName)) {
        dayTypeMap.set(record.sceneName, new Map());
      }
      const sceneMap = dayTypeMap.get(record.sceneName)!;
      sceneMap.set(dayType, (sceneMap.get(dayType) || 0) + 1);
    });

    const patterns: ScenePattern[] = [];

    dayTypeMap.forEach((dtMap, sceneName) => {
      const total = Array.from(dtMap.values()).reduce((a, b) => a + b, 0);
      
      dtMap.forEach((count, dayType) => {
        const frequency = count;
        const confidence = Math.min(100, (count / total) * 100);

        if (confidence >= 40) {
          patterns.push({
            id: `day-${sceneName}-${dayType}`,
            sceneName,
            dayType,
            frequency,
            confidence,
          });
        }
      });
    });

    return patterns;
  }

  /**
   * Detect sequence patterns (scene A → scene B)
   */
  private detectSequencePatterns(records: SceneSwitchRecord[]): ScenePattern[] {
    const sequenceMap = new Map<string, Map<string, number>>();

    // Build sequence counts
    for (let i = 0; i < records.length - 1; i++) {
      const current = records[i].sceneName;
      const next = records[i + 1].sceneName;

      if (current === next) continue; // Skip same-scene "switches"

      if (!sequenceMap.has(current)) {
        sequenceMap.set(current, new Map());
      }
      const nextMap = sequenceMap.get(current)!;
      nextMap.set(next, (nextMap.get(next) || 0) + 1);
    }

    const patterns: ScenePattern[] = [];

    sequenceMap.forEach((nextMap, sceneName) => {
      const total = Array.from(nextMap.values()).reduce((a, b) => a + b, 0);
      const commonNextScenes = Array.from(nextMap.entries())
        .map(([nextScene, count]) => ({
          sceneName: nextScene,
          probability: count / total,
        }))
        .filter((entry) => entry.probability >= 0.2) // At least 20% probability
        .sort((a, b) => b.probability - a.probability);

      if (commonNextScenes.length > 0) {
        const topNextScene = commonNextScenes[0];
        patterns.push({
          id: `seq-${sceneName}`,
          sceneName,
          frequency: total,
          confidence: Math.min(100, topNextScene.probability * 100),
          commonNextScenes,
        });
      }
    });

    return patterns;
  }

  /**
   * Detect duration patterns (average time in scene)
   */
  private detectDurationPatterns(records: SceneSwitchRecord[]): ScenePattern[] {
    const durationMap = new Map<string, number[]>();

    records.forEach((record) => {
      if (record.duration) {
        if (!durationMap.has(record.sceneName)) {
          durationMap.set(record.sceneName, []);
        }
        durationMap.get(record.sceneName)!.push(record.duration);
      }
    });

    const patterns: ScenePattern[] = [];

    durationMap.forEach((durations, sceneName) => {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const confidence = Math.min(100, (durations.length / records.length) * 200);

      patterns.push({
        id: `dur-${sceneName}`,
        sceneName,
        frequency: durations.length,
        confidence,
        averageDuration: avgDuration,
      });
    });

    return patterns;
  }

  /**
   * Generate recommendations based on current context
   */
  async getRecommendations(
    currentScene?: string,
    currentTime?: Date
  ): Promise<SceneRecommendation[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Ensure patterns are analyzed
    if (this.patterns.length === 0) {
      await this.analyzePatterns();
    }

    const now = currentTime || new Date();
    const currentHour = now.getHours();
    const currentTimeOfDay = getTimeOfDay(currentHour);
    const currentDayType = getDayType(now.getDay());

    const recommendations: SceneRecommendation[] = [];

    // Time-based recommendations
    const timePatterns = this.patterns.filter(
      (p) =>
        p.timeOfDay === currentTimeOfDay &&
        p.confidence >= this.config.confidenceThreshold
    );

    timePatterns.forEach((pattern) => {
      if (pattern.sceneName !== currentScene) {
        recommendations.push({
          sceneName: pattern.sceneName,
          reason: `${getTimeOfDayIcon(currentTimeOfDay)} Often used in the ${currentTimeOfDay}`,
          confidence: pattern.confidence,
          type: 'time-based',
          icon: getTimeOfDayIcon(currentTimeOfDay),
        });
      }
    });

    // Day-type recommendations
    const dayPatterns = this.patterns.filter(
      (p) =>
        p.dayType === currentDayType &&
        p.confidence >= this.config.confidenceThreshold
    );

    dayPatterns.forEach((pattern) => {
      if (pattern.sceneName !== currentScene && !recommendations.find(r => r.sceneName === pattern.sceneName)) {
        recommendations.push({
          sceneName: pattern.sceneName,
          reason: `${getDayTypeIcon(currentDayType)} Popular on ${currentDayType}s`,
          confidence: pattern.confidence,
          type: 'time-based',
          icon: getDayTypeIcon(currentDayType),
        });
      }
    });

    // Sequence-based recommendations (if current scene is known)
    if (currentScene) {
      const sequencePattern = this.patterns.find(
        (p) => p.sceneName === currentScene && p.commonNextScenes
      );

      if (sequencePattern && sequencePattern.commonNextScenes) {
        sequencePattern.commonNextScenes.slice(0, 2).forEach((nextScene) => {
          if (!recommendations.find(r => r.sceneName === nextScene.sceneName)) {
            recommendations.push({
              sceneName: nextScene.sceneName,
              reason: `🔄 Often follows "${currentScene}"`,
              confidence: nextScene.probability * 100,
              type: 'sequence-based',
              icon: '🔄',
            });
          }
        });
      }

      // Duration-based recommendations
      const durationPattern = this.patterns.find(
        (p) => p.sceneName === currentScene && p.averageDuration
      );

      if (durationPattern && durationPattern.averageDuration) {
        // This would require tracking when current scene started
        // For now, we'll skip duration-based recommendations in this version
      }
    }

    // Sort by confidence and limit
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxRecommendations);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RecommendationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current patterns
   */
  getPatterns(): ScenePattern[] {
    return this.patterns;
  }
}

/**
 * Singleton instance
 */
export const recommendationEngine = new SceneRecommendationEngine();
