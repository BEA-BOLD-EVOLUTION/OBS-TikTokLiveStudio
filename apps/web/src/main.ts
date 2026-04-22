const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App mount node was not found.');
}

app.innerHTML = `
  <main style="font-family: Inter, system-ui, sans-serif; max-width: 780px; margin: 4rem auto; line-height: 1.5; padding: 0 1rem;">
    <h1>OBS + TikTok Live Studio Baseline ✅</h1>
    <p>This lightweight dashboard is running.</p>
    <ul>
      <li>Use <code>config/scenes.example.json</code> to define scene/source structure.</li>
      <li>Use <code>config/streamdeck-links.example.json</code> to link buttons to scenes.</li>
      <li>Use <code>docs/obs-tiktok-streamdeck-workflow.md</code> to keep naming consistent.</li>
    </ul>
  </main>
`;

console.log('Web hello-world loaded: OBS/TikTok/Stream Deck scaffold ready.');
