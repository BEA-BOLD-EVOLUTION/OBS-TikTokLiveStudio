import { buildSetupCards, setupSteps, type SetupStep } from './setupSteps.js';

export function renderShell(steps: readonly SetupStep[] = setupSteps): string {
  const setupCards = buildSetupCards(steps);
  return `
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0c14;
      --panel: #111525;
      --panel-2: #171c31;
      --text: #eef3ff;
      --muted: #b6c1dd;
      --accent: #6aa9ff;
      --accent-2: #83f5cf;
      --border: #27304f;
      --shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      --radius: 16px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Inter, Segoe UI, system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 20% 0%, #1a2250 0%, var(--bg) 35%), var(--bg);
      color: var(--text);
    }

    .page {
      max-width: 1024px;
      margin: 0 auto;
      padding: 2rem 1rem 3rem;
    }

    .hero {
      background: linear-gradient(130deg, rgba(106, 169, 255, 0.2), rgba(131, 245, 207, 0.12));
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) + 6px);
      padding: 1.3rem;
      box-shadow: var(--shadow);
      margin-bottom: 1.25rem;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      background: rgba(131, 245, 207, 0.14);
      color: #c7f9e9;
      font-size: 0.86rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      letter-spacing: 0.01em;
    }

    .hero h1 {
      font-size: clamp(1.5rem, 2.6vw, 2.2rem);
      margin: 0 0 0.55rem;
      line-height: 1.2;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 70ch;
      line-height: 1.55;
      font-size: 1.02rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.95rem;
      margin: 1rem 0 1.15rem;
    }

    .card,
    .help,
    .next {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow);
    }

    .step-tag {
      display: inline-block;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-2);
      font-weight: 700;
    }

    .card h3,
    .help h2,
    .next h2 {
      margin: 0 0 0.5rem;
      line-height: 1.3;
    }

    .card p,
    .help li,
    .next li {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }

    .file-row {
      margin-top: 0.75rem;
      display: flex;
      gap: 0.6rem;
      align-items: center;
      flex-wrap: wrap;
    }

    code {
      background: rgba(106, 169, 255, 0.12);
      border: 1px solid rgba(106, 169, 255, 0.35);
      color: #d5e8ff;
      border-radius: 8px;
      padding: 0.25rem 0.45rem;
      font-size: 0.86rem;
      word-break: break-word;
    }

    .copy-btn {
      border: 1px solid #3d7ed8;
      border-radius: 8px;
      padding: 0.35rem 0.65rem;
      color: #d9e9ff;
      background: rgba(106, 169, 255, 0.16);
      font-weight: 600;
      cursor: pointer;
    }

    .copy-btn:hover,
    .copy-btn:focus-visible {
      background: rgba(106, 169, 255, 0.26);
      outline: none;
    }

    .copy-btn[data-copied='true'] {
      border-color: #52c7a0;
      background: rgba(82, 199, 160, 0.18);
      color: #c7f9e9;
    }

    .help ul,
    .next ul {
      margin: 0;
      padding-left: 1.2rem;
      display: grid;
      gap: 0.45rem;
    }

    .muted {
      margin-top: 0.65rem;
      font-size: 0.9rem;
      color: #9fafcf;
    }

    /* OBS Dashboard Styles */
    .obs-dashboard {
      margin-top: 2rem;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow);
    }

    .obs-status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .obs-status-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 999px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    .status-dot.disconnected {
      background: #ef4444;
    }

    .status-dot.connecting {
      background: #f59e0b;
    }

    .status-dot.connected {
      background: #10b981;
    }

    .status-dot.error {
      background: #ef4444;
      animation: flash 0.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    @keyframes flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .obs-controls {
      display: grid;
      gap: 1.5rem;
    }

    .control-section h3 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      color: var(--accent-2);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .obs-btn {
      padding: 0.75rem 1.25rem;
      background: rgba(106, 169, 255, 0.16);
      border: 1px solid rgba(106, 169, 255, 0.4);
      border-radius: 8px;
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .obs-btn:hover:not(:disabled) {
      background: rgba(106, 169, 255, 0.26);
      border-color: rgba(106, 169, 255, 0.6);
      transform: translateY(-1px);
    }

    .obs-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .scene-list {
      display: grid;
      gap: 0.5rem;
    }

    .scene-btn {
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 150ms ease;
    }

    .scene-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--accent);
    }

    .scene-btn.active {
      background: rgba(106, 169, 255, 0.2);
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 700;
    }

    .status-grid {
      display: grid;
      gap: 0.75rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    .status-item span {
      color: var(--muted);
    }

    .status-item strong {
      color: var(--text);
    }

    /* Toast notifications */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      opacity: 0;
      transform: translateY(1rem);
      transition: all 300ms ease;
      z-index: 1000;
      max-width: 400px;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .toast-success {
      background: #10b981;
      color: white;
    }

    .toast-error {
      background: #ef4444;
      color: white;
    }
  </style>

  <main class="page">
    <section class="hero" aria-label="Welcome section">
      <span class="status">🎬 Creator control room ready</span>
      <h1>Set up your live show controls in 3 quick moves</h1>
      <p>
        Keep your scenes, buttons, and transitions organized so you can focus on content—not clicking around during
        the stream.
      </p>
    </section>

    <section class="grid" aria-label="Setup steps">
      ${setupCards}
    </section>

    <section class="help" aria-label="How this helps you">
      <h2>Why creators use this workflow</h2>
      <ul>
        <li>Your show states are clear (like <em>Starting Soon</em>, <em>Live Main</em>, and <em>BRB</em>).</li>
        <li>Your Stream Deck actions stay reliable, even when scene names evolve.</li>
        <li>Your entire setup lives in one place for faster prep and smoother collabs.</li>
      </ul>
    </section>

    <section class="next" aria-label="What to run next" style="margin-top: 0.95rem;">
      <h2>Ready for rehearsal</h2>
      <ul>
        <li>After edits, run <code>npm run dev:plugin</code> to check your button-to-scene mappings.</li>
        <li>Keep this page open as your pre-stream checklist.</li>
      </ul>
      <p class="muted">Tip: use "Copy path" to jump straight to the file you want to edit.</p>
    </section>
  </main>
`;
}
