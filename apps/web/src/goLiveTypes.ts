/**
 * Go Live Sequence - Type definitions for automated stream start workflow
 */

/**
 * Workflow step in the Go Live sequence
 */
export type WorkflowStep = 
  | 'idle'
  | 'preflight'
  | 'starting'
  | 'checklist'
  | 'going-live'
  | 'live'
  | 'error';

/**
 * Pre-flight check item
 */
export interface PreflightCheck {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'checking' | 'passed' | 'failed';
  errorMessage?: string;
  required: boolean;
}

/**
 * Checklist item for user confirmation
 */
export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  required: boolean;
}

/**
 * Go Live workflow state
 */
export interface GoLiveState {
  currentStep: WorkflowStep;
  preflightChecks: PreflightCheck[];
  userChecklist: ChecklistItem[];
  startTime?: Date;
  error?: string;
  isVirtualCameraActive: boolean;
  isRecording: boolean;
  currentScene: string;
}

/**
 * Go Live workflow configuration
 */
export interface GoLiveConfig {
  startingScene: string;        // Scene to show during countdown (default: SCN_STARTING)
  liveScene: string;             // Main live scene (default: SCN_LIVE)
  countdownDuration: number;     // Countdown in seconds (default: 5)
  enableRecording: boolean;      // Auto-start recording backup (default: true)
  enableVirtualCamera: boolean;  // Auto-start virtual camera (default: true)
  preflightChecks: {
    obsConnection: boolean;      // Check OBS connected
    scenesExist: boolean;        // Verify required scenes exist
    audioLevels: boolean;        // Warn if audio sources silent
  };
}

/**
 * Default configuration
 */
export const DEFAULT_GO_LIVE_CONFIG: GoLiveConfig = {
  startingScene: 'SCN_STARTING',
  liveScene: 'SCN_LIVE',
  countdownDuration: 5,
  enableRecording: true,
  enableVirtualCamera: true,
  preflightChecks: {
    obsConnection: true,
    scenesExist: true,
    audioLevels: false, // Optional check
  },
};

/**
 * Default pre-flight checks
 */
export const DEFAULT_PREFLIGHT_CHECKS: PreflightCheck[] = [
  {
    id: 'obs-connection',
    label: 'OBS Connected',
    description: 'Verify OBS WebSocket connection is active',
    status: 'pending',
    required: true,
  },
  {
    id: 'starting-scene',
    label: 'Starting Scene Exists',
    description: 'Check SCN_STARTING scene is configured in OBS',
    status: 'pending',
    required: true,
  },
  {
    id: 'live-scene',
    label: 'Live Scene Exists',
    description: 'Check SCN_LIVE scene is configured in OBS',
    status: 'pending',
    required: true,
  },
];

/**
 * Default user checklist items
 */
export const DEFAULT_USER_CHECKLIST: ChecklistItem[] = [
  {
    id: 'tiktok-ready',
    label: 'TikTok Live Studio ready?',
    description: 'OBS Virtual Camera selected, preview looks good',
    checked: false,
    required: true,
  },
  {
    id: 'audio-levels',
    label: 'Audio levels good?',
    description: 'Microphone active, music balanced, no clipping',
    checked: false,
    required: true,
  },
  {
    id: 'stream-title',
    label: 'Stream title and settings confirmed?',
    description: 'Title, category, and stream settings are correct',
    checked: false,
    required: false,
  },
];
