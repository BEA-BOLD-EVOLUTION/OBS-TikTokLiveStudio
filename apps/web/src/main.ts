import { bootstrap } from './bootstrap.js';
import { OBSUIController } from './obsUI.js';

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
}

console.log('Guided web UI loaded: creator-focused setup experience ready with OBS integration.');
