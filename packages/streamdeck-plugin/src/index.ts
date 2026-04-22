import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootConfigPath = join(process.cwd(), '..', '..', 'config', 'streamdeck-links.example.json');

try {
  const content = readFileSync(rootConfigPath, 'utf-8');
  const links = JSON.parse(content) as {
    profileName: string;
    buttons: Array<{ key: string; action: string; scene: string }>;
  };

  console.log('Stream Deck plugin scaffold is running.');
  console.log(`Profile: ${links.profileName}`);
  console.log(`Mapped buttons: ${links.buttons.length}`);
} catch {
  console.log('Stream Deck plugin scaffold is running.');
  console.log('Config not found yet. Create config/streamdeck-links.example.json at repo root.');
}
