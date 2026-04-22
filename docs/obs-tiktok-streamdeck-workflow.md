# OBS + TikTok Live Studio + Stream Deck Organization Workflow

This baseline keeps your stream controls easy to maintain by linking three pieces:

1. **OBS scenes + sources** in `config/scenes.example.json`
2. **Stream Deck button mappings** in `config/streamdeck-links.example.json`
3. **Operational profile details** in `.env` (copied from `.env.example`)

## Recommended conventions

- Prefix scenes with `SCN_` and sources with `SRC_`.
- Keep scene IDs stable even if display labels change.
- Map Stream Deck keys to scene IDs (not labels), so renames don’t break bindings.

## Suggested setup order

1. Build your OBS scenes/sources and apply naming conventions.
2. Export/record scene IDs in `config/scenes.example.json`.
3. Map Stream Deck keys to the scene IDs in `config/streamdeck-links.example.json`.
4. Run `npm run dev:plugin` to validate that mappings load.
5. Run `npm run dev:web` to view the baseline dashboard.

## Why this helps

- Faster onboarding when rebuilding a stream machine.
- Cleaner handoff if multiple people manage the setup.
- Less drift between OBS scene organization and Stream Deck controls.
