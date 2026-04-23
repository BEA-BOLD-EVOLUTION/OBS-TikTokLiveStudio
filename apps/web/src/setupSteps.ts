export interface SetupStep {
  title: string;
  subtitle: string;
  description: string;
  file: string;
}

export const setupSteps: SetupStep[] = [
  {
    title: 'Build your show flow',
    subtitle: 'First move',
    description:
      'Open your scene template and map your stream moments (Starting Soon, Live, Be Right Back, and more).',
    file: 'config/scenes.example.json',
  },
  {
    title: 'Program your Stream Deck moves',
    subtitle: 'Second move',
    description:
      'Assign each button to the scene you want to trigger (for example: 1 = Starting Soon, 2 = Live Main).',
    file: 'config/streamdeck-links.example.json',
  },
  {
    title: 'Lock in your go-live routine',
    subtitle: 'Final move',
    description:
      'Follow the quick workflow so OBS and Stream Deck stay in sync before every stream.',
    file: 'docs/obs-tiktok-streamdeck-workflow.md',
  },
];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildSetupCards(steps: readonly SetupStep[]): string {
  return steps
    .map((step, index) => {
      const title = escapeHtml(step.title);
      const subtitle = escapeHtml(step.subtitle);
      const description = escapeHtml(step.description);
      const file = escapeHtml(step.file);
      return `
      <article class="card" aria-label="${title}">
        <div class="step-tag">${subtitle}</div>
        <h3>${index + 1}. ${title}</h3>
        <p>${description}</p>
        <div class="file-row">
          <code>${file}</code>
          <button class="copy-btn" type="button" data-copy="${file}">Copy path</button>
        </div>
      </article>
    `;
    })
    .join('');
}
