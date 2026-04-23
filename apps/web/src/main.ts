import { bootstrap } from './bootstrap.js';
import { OBSUIController } from './obsUI.js';
import { TransitionLibraryUI } from './transitionLibrary.js';
import { transitionPlayer } from './transitionPlayer.js';
import { GoLiveUI } from './goLiveUI.js';
import { goLiveWorkflow } from './goLiveWorkflow.js';
import { LowerThirdsUI } from './lowerThirdsUI.js';
import { lowerThirdsManager } from './lowerThirdsManager.js';
import { CohostUI } from './cohostUI.js';
import { SceneRecommendationUI } from './sceneRecommendationUI.js';
import { sceneTracker } from './sceneTracker.js';
import { ScheduledWorkflowUI } from './scheduledWorkflowUI.js';
import { workflowScheduler } from './scheduledWorkflowEngine.js';
import { AdaptiveQualityUI } from './adaptiveQualityUI.js';
import { adaptiveQualityEngine } from './adaptiveQualityEngine.js';
import { AudioDuckingUI } from './audioDuckingUI.js';
import { audioDuckingEngine } from './audioDuckingEngine.js';
import { AutoBackupUI } from './autoBackupUI.js';
import { autoBackupEngine } from './autoBackupEngine.js';
import './transitionLibrary.css';
import './goLive.css';
import './lowerThirds.css';
import './cohost.css';
import './sceneRecommendation.css';
import './scheduledWorkflow.css';
import './adaptiveQuality.css';
import './audioDucking.css';
import './autoBackup.css';

bootstrap();

// Initialize OBS controller
const obsUI = new OBSUIController();
const appContainer = document.querySelector('#app');

if (appContainer) {
  // Add OBS dashboard after setup cards
  const obsDashboard = document.createElement('div');
  obsDashboard.id = 'obs-dashboard-container';
  appContainer.appendChild(obsDashboard);

  // Initialize OBS connection
  obsUI.initialize(obsDashboard).catch((error) => {
    console.error('Failed to initialize OBS UI:', error);
  });

  // Connect transition player to OBS controller
  transitionPlayer.setOBSController(obsUI.getController());

  // Add Go Live Sequence (Phase 2 - Creator Workflows)
  const goLiveContainer = document.createElement('div');
  goLiveContainer.id = 'go-live-container';
  appContainer.appendChild(goLiveContainer);

  // Connect Go Live workflow to OBS controller
  goLiveWorkflow.setOBSController(obsUI.getController());
  new GoLiveUI('go-live-container', goLiveWorkflow);

  // Add Lower Thirds system (Phase 2 - Creator Workflows)
  const lowerThirdsContainer = document.createElement('div');
  lowerThirdsContainer.id = 'lower-thirds-container';
  appContainer.appendChild(lowerThirdsContainer);

  // Connect Lower Thirds manager to OBS controller
  lowerThirdsManager.setOBSController(obsUI.getController());
  new LowerThirdsUI('lower-thirds-container');

  // Add AI Transition Sequences library (Phase 2)
  const transitionContainer = document.createElement('div');
  transitionContainer.id = 'transition-library-container';
  appContainer.appendChild(transitionContainer);

  const transitionLibrary = new TransitionLibraryUI('transition-library-container', transitionPlayer);
  transitionLibrary.render();

  // Add Cohost Tracking OCR (Phase 2 - Creator Workflows)
  const cohostContainer = document.createElement('div');
  cohostContainer.id = 'cohost-container';
  appContainer.appendChild(cohostContainer);

  new CohostUI('cohost-container');

  // Add Scene Recommendations (Phase 3 - Intelligent Automation)
  const recommendationsContainer = document.createElement('div');
  recommendationsContainer.id = 'recommendations-container';
  appContainer.appendChild(recommendationsContainer);

  const recommendationsUI = new SceneRecommendationUI('recommendations-container');
  recommendationsUI.setOBSController(obsUI.getController());

  // Start scene tracking for pattern detection
  sceneTracker.setOBSController(obsUI.getController());

  // Add Scheduled Workflows (Phase 3 - Intelligent Automation)
  const workflowContainer = document.createElement('div');
  workflowContainer.id = 'workflow-container';
  appContainer.appendChild(workflowContainer);

  const workflowUI = new ScheduledWorkflowUI('workflow-container');
  workflowUI.setOBSController(obsUI.getController());

  // Start workflow scheduler
  workflowScheduler.setOBSController(obsUI.getController());
  workflowScheduler.start();

  // Add Adaptive Quality (Phase 3 - Intelligent Automation)
  const qualityContainer = document.createElement('div');
  qualityContainer.id = 'quality-container';
  appContainer.appendChild(qualityContainer);

  const qualityUI = new AdaptiveQualityUI('quality-container');
  qualityUI.setOBSController(obsUI.getController());

  // Connect quality engine to OBS
  adaptiveQualityEngine.setOBSController(obsUI.getController());

  // Add Audio Ducking (Phase 3 - Intelligent Automation)
  const audioDuckingContainer = document.createElement('div');
  audioDuckingContainer.id = 'audio-ducking-container';
  appContainer.appendChild(audioDuckingContainer);

  const audioDuckingUI = new AudioDuckingUI('audio-ducking-container');
  audioDuckingUI.setOBSController(obsUI.getController());

  // Connect audio ducking engine to OBS
  audioDuckingEngine.setOBSController(obsUI.getController());

  // Add Auto-Backup Recordings (Phase 3 - Intelligent Automation)
  const autoBackupContainer = document.createElement('div');
  autoBackupContainer.id = 'auto-backup-container';
  appContainer.appendChild(autoBackupContainer);

  const autoBackupUI = new AutoBackupUI('auto-backup-container');
  autoBackupUI.setOBSController(obsUI.getController());

  // Connect auto-backup engine to OBS
  autoBackupEngine.setOBSController(obsUI.getController());
}

console.log('Guided web UI loaded: creator-focused setup experience ready with OBS integration, Go Live Sequence, Lower Thirds, AI Transition Sequences, Cohost Tracking OCR, Scene Recommendations, Scheduled Workflows, Adaptive Quality, Audio Ducking, and Auto-Backup Recordings.');
