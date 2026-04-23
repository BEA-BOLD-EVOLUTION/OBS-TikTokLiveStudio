/**
 * Scene Recommendation Types - AI-driven scene suggestions based on usage patterns
 */

/**
 * Record of a single scene switch event
 */
export interface SceneSwitchRecord {
  id: string;
  sceneName: string;
  timestamp: Date;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  minute: number; // 0-59
  previousScene?: string;
  duration?: number; // milliseconds in this scene before switching
  sessionId?: string; // groups switches from same stream session
}

/**
 * Time of day categorization
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late-night';

/**
 * Day type categorization
 */
export type DayType = 'weekday' | 'weekend';

/**
 * Pattern detected from historical data
 */
export interface ScenePattern {
  id: string;
  sceneName: string;
  timeOfDay?: TimeOfDay;
  dayType?: DayType;
  hour?: number;
  dayOfWeek?: number;
  frequency: number; // how many times this pattern occurred
  confidence: number; // 0-100, confidence in this pattern
  averageDuration?: number; // average time spent in this scene (ms)
  commonNextScenes?: Array<{
    sceneName: string;
    probability: number; // 0-1
  }>;
}

/**
 * Recommendation for next scene
 */
export interface SceneRecommendation {
  sceneName: string;
  reason: string;
  confidence: number; // 0-100
  type: 'time-based' | 'sequence-based' | 'duration-based' | 'manual';
  icon?: string;
  action?: () => void;
}

/**
 * Analytics summary
 */
export interface SceneAnalytics {
  totalSwitches: number;
  uniqueScenes: number;
  mostUsedScene: string;
  averageSessionDuration: number; // milliseconds
  patternCount: number;
  lastAnalyzed: Date;
  timeOfDayDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    'late-night': number;
  };
  dayTypeDistribution: {
    weekday: number;
    weekend: number;
  };
}

/**
 * Configuration for recommendation engine
 */
export interface RecommendationConfig {
  enabled: boolean;
  minDataPoints: number; // minimum switches before showing recommendations
  confidenceThreshold: number; // 0-100, minimum confidence to show recommendation
  maxRecommendations: number; // max number of recommendations to show at once
  timeWindow: number; // milliseconds, how far back to analyze
  patternDetection: {
    timeOfDay: boolean;
    dayOfWeek: boolean;
    sequence: boolean;
    duration: boolean;
  };
}

/**
 * UI state
 */
export interface RecommendationUIState {
  showRecommendations: boolean;
  showAnalytics: boolean;
  currentRecommendations: SceneRecommendation[];
  analytics: SceneAnalytics | null;
  isAnalyzing: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  enabled: true,
  minDataPoints: 10,
  confidenceThreshold: 60,
  maxRecommendations: 3,
  timeWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  patternDetection: {
    timeOfDay: true,
    dayOfWeek: true,
    sequence: true,
    duration: true,
  },
};

/**
 * Utility: Get time of day category from hour
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late-night';
}

/**
 * Utility: Get day type from day of week
 */
export function getDayType(dayOfWeek: number): DayType {
  return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
}

/**
 * Utility: Generate unique ID for records
 */
export function generateRecordId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Utility: Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Utility: Get icon for time of day
 */
export function getTimeOfDayIcon(timeOfDay: TimeOfDay): string {
  const icons: Record<TimeOfDay, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    'late-night': '🌙',
  };
  return icons[timeOfDay];
}

/**
 * Utility: Get icon for day type
 */
export function getDayTypeIcon(dayType: DayType): string {
  return dayType === 'weekend' ? '🎉' : '💼';
}
