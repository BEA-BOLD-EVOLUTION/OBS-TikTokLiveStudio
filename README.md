# OBS-TikTokLiveStudio

**A creator-first control system that bridges OBS Studio and TikTok Live Studio** through an intuitive web interface and Stream Deck integration. Designed for creators who want professional live streaming capabilities without becoming experts in either system.

🎯 **Current Status:** Phase 1 Foundation Complete ✅

## Features

### Phase 1 - OBS WebSocket Integration ✅

- **Real-time OBS Control:**
  - WebSocket connection with auto-reconnect (max 5 attempts, 3-second delay)
  - Live connection status indicator with animations
  - Current scene, recording, and virtual camera status

- **Scene Management:**
  - Visual scene switcher grid showing all scenes
  - Highlight active scene
  - Support for `SCN_` prefixed scene naming convention

- **Quick Actions:**
  - Toggle virtual camera on/off
  - Start/stop/pause recording
  - Toast notifications for user feedback

- **Developer-Friendly:**
  - TypeScript OBS controller library (`packages/obs-controller`)
  - Fully typed interfaces and event subscriptions
  - Clean separation between UI and OBS logic

### Coming Soon

- **Phase 2:** AI Transition Sequences with section-based organization, visual management, bulk import
- **Phase 3:** Intelligent automation and scene recommendations
- **Phase 4:** Advanced features (guest management, TikTok cohost tracking with OCR)
- **Phase 5:** Ecosystem expansion (multi-platform streaming)

See [docs/roadmap.md](docs/roadmap.md) for the complete 800+ line roadmap.

## Prerequisites

- **Node.js 20+** and **npm 10+**
- **OBS Studio** with **obs-websocket** plugin installed
  - Download: <https://github.com/obsproject/obs-websocket/releases>
  - Configure in OBS: Tools → WebSocket Server Settings
  - Enable WebSocket server
  - Default port: **4455**
  - Set password or leave empty

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create your local environment file:**

   ```bash
   cp .env.example .env
   ```

   Default OBS connection settings (no password):

   ```env
   OBS_HOST=localhost
   OBS_PORT=4455
   OBS_PASSWORD=
   ```

3. **Start the web dashboard:**

   ```bash
   npm run dev:web
   ```

   Opens at <http://localhost:5173> (auto-connects to OBS)

4. **Verify OBS connection:**
   - Check connection status indicator (green = connected)
   - See your OBS scenes listed
   - Test scene switching and quick actions

## Development Commands

### Build

```bash
npm run build        # Build all packages
```

### Quality Checks

```bash
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm test             # Run tests
```

### Stream Deck Plugin

```bash
npm run dev:plugin   # Validate Stream Deck plugin (hello world)
```

## Project Structure

```text
OBS-TikTokLiveStudio/
├── apps/
│   └── web/                    # Creator control dashboard
│       ├── src/
│       │   ├── main.ts         # Entry point with OBS integration
│       │   ├── obsUI.ts        # OBS status dashboard component
│       │   ├── bootstrap.ts    # App initialization
│       │   ├── template.ts     # UI shell and styles
│       │   └── setupSteps.ts   # Onboarding cards
│       └── index.html
├── packages/
│   ├── obs-controller/         # OBS WebSocket client library
│   │   └── src/
│   │       ├── index.ts        # Main export
│   │       ├── connection.ts   # Connection manager
│   │       ├── scenes.ts       # Scene switching
│   │       ├── recording.ts    # Recording/streaming controls
│   │       ├── virtualCamera.ts # Virtual camera toggle
│   │       └── types.ts        # TypeScript interfaces
│   └── streamdeck-plugin/      # Stream Deck plugin scaffold
├── config/
│   ├── scenes.example.json     # OBS scene/source templates
│   └── streamdeck-links.example.json  # Button mappings
└── docs/
    ├── roadmap.md              # 5-phase product roadmap
    └── obs-tiktok-streamdeck-workflow.md  # Naming conventions
```

## Naming Conventions

- **Scenes:** `SCN_` prefix (e.g., `SCN_STARTING`, `SCN_LIVE`, `SCN_BRB`)
- **Sources:** `SRC_` prefix (e.g., `SRC_WEBCAM`, `SRC_GAME`)
- **Transitions:** `TRN_` prefix (e.g., `TRN_FADE`, `TRN_SWIPE`)

See [docs/obs-tiktok-streamdeck-workflow.md](docs/obs-tiktok-streamdeck-workflow.md) for details.

## Documentation

- **[claude.md](claude.md)** - Comprehensive development journal capturing all architectural decisions, creator insights, and progress through Phase 1
- **[docs/roadmap.md](docs/roadmap.md)** - Complete 800+ line product roadmap with UX specifications for all 5 phases
- **[docs/obs-tiktok-streamdeck-workflow.md](docs/obs-tiktok-streamdeck-workflow.md)** - Workflow organization and naming conventions

## Contributing

This project uses:

- **TypeScript 5.8.3** with strict type checking
- **Prettier 3.5.3** for formatting
- **ESLint 9.24.0** for linting
- **npm workspaces** for monorepo management

## License

TBD

## Repository

- **GitHub:** <https://github.com/BEA-BOLD-EVOLUTION/OBS-TikTokLiveStudio>
- **Branch:** main
- **Contributors:** BEA-BOLD-EVOLUTION team + Claude (AI assistant)
