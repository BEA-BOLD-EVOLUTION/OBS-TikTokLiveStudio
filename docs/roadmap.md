# Product Roadmap: OBS + TikTok Live Studio Control System

## Vision

Enable creators to operate professional live streaming setups (OBS + TikTok Live Studio) through simple, one-click controls — without needing to learn the technical complexity of either system.

**Core Principle:** Abstract away technical operations behind creator-focused actions ("Go Live", "Take a Break", "Add Lower Third") that execute multi-step sequences automatically.

---

## Architecture Overview

```
Creator Interface Layer
    ↓
[Stream Deck Hardware] ← Physical buttons with LED feedback
[Web Dashboard] ← Setup, monitoring, manual controls
    ↓
Control Abstraction Layer
    ↓
[OBS Controller] ← Scene/source/recording automation via WebSocket
    ↓
OBS Studio ← Rendering + Virtual Camera
    ↓
TikTok Live Studio ← Receives video feed (no API integration needed)
```

---

## Phase 1: Foundation (MVP)

**Goal:** Establish reliable OBS control from web UI and Stream Deck

### Core Infrastructure

- [x] Monorepo scaffold with web UI + Stream Deck plugin
- [x] Configuration system (scenes.example.json, streamdeck-links.example.json)
- [x] Creator-focused onboarding UI
- [ ] **OBS WebSocket connection manager**
  - Auto-discover local OBS instance
  - Connection status monitoring
  - Auto-reconnect on disconnect
  - Error handling + user-friendly messages

### Basic Controls

- [ ] **Scene switching**

  - Map config scene IDs → OBS scene names
  - Web UI scene buttons (SCN_STARTING, SCN_LIVE, SCN_BRB, etc.)
  - Stream Deck button mapping
  - Visual feedback (active scene indicator)

- [ ] **Virtual camera control**

  - Start/stop virtual camera
  - Status indicator in web UI
  - Stream Deck button integration

- [ ] **Recording controls**
  - Start/stop/pause recording
  - Recording duration timer
  - Auto-save location display

### Deliverables

- `packages/obs-controller/` - TypeScript OBS WebSocket client
- Updated web UI with live OBS status dashboard
- Stream Deck plugin with real OBS integration
- Updated README with setup instructions

---

## Phase 2: Creator Workflows ("Neat Things")

**Goal:** Build one-click automations for common creator tasks

### 🎬 Go Live Sequence

**What creators do manually:**

1. Open OBS → Switch to starting scene
2. Start virtual camera
3. Open TikTok Live Studio → Select OBS virtual camera
4. Adjust audio levels, check video preview
5. Switch to live scene
6. Click "Go Live" in TikTok
7. Start recording backup in OBS

**Our automation:**

```
[Go Live] button →
  1. Switch to SCN_STARTING (5-sec countdown overlay)
  2. Start OBS virtual camera
  3. Show checklist overlay: "TikTok ready? Audio levels good?"
  4. After user confirms →
  5. Switch to SCN_LIVE
  6. Start OBS recording (backup)
  7. Send notification: "You're live! Recording backup started."
```

### ☕ Take a Break

**One-click BRB mode:**

- Switch to SCN_BRB (Be Right Back scene)
- Mute all audio sources except background music
- Pause recording (optional)
- Start break timer in web UI
- Return button switches back to SCN_LIVE + unmutes

### 📝 Lower Thirds & Graphics

**Dynamic text overlays:**

- Show/hide name plates, social handles, donation alerts
- Timed auto-hide (5-10 seconds)
- Queue multiple lower thirds (rotate every 8 seconds)
- Update text content from web UI without editing OBS

### 🎵 Audio Scene Switching

**Smart audio mixing per scene:**

- SCN_STARTING: Background music at 100%, mic at 50%
- SCN_LIVE: Music at 20%, mic at 100%
- SCN_BRB: Music at 80%, mic muted
- Automatic crossfade transitions (fade out/in over 1 second)

### 🎥 Multi-Cam Switching

**For creators with multiple camera angles:**

- Stream Deck buttons: Cam 1 (face), Cam 2 (overhead), Cam 3 (wide)
- Smooth transitions (cut, fade, or swipe)
- Picture-in-picture mode (show both cams)
- Auto-switching based on audio input (switch to active speaker)

### 🔴 Ending Show Workflow

**Clean shutdown sequence:**

```
[End Show] button →
  1. Switch to SCN_ENDING (outro overlay with "Thanks for watching!")
  2. Wait 10 seconds
  3. Stop OBS recording
  4. Stop virtual camera
  5. Show recording summary: duration, file size, save location
  6. Open recording folder in explorer
```

### 📊 Live Metrics Dashboard

**Real-time OBS stats in web UI:**

- Active scene name
- Recording duration + file size
- CPU usage, FPS, dropped frames
- Audio levels (VU meters)
- Virtual camera status
- Warnings: High CPU, dropped frames, audio clipping

---

## Phase 3: Intelligent Automation

**Goal:** Proactive assistance and smart defaults

### 🤖 Scene Recommendations

**AI-powered suggestions based on usage patterns:**

- "You usually switch to SCN_BRB after 45 minutes — ready for a break?"
- "Your recording is 2 hours long — consider splitting into segments"
- "Audio levels are low on your mic — adjust input gain?"

### 📅 Scheduled Workflows

**Pre-configured go-live routines:**

- Monday 7pm: Gaming stream preset (game capture + webcam overlay)
- Wednesday 3pm: Tutorial stream (screen share + webcam side-by-side)
- Friday 8pm: Just chatting (full-screen webcam)

Auto-load scenes, sources, and settings per schedule.

### 🎛️ Adaptive Quality

**Auto-adjust OBS settings based on system load:**

- High CPU usage detected → reduce canvas resolution
- Dropped frames detected → lower bitrate
- Switch to hardware encoding if GPU available

### 🔊 Audio Ducking

**Automatic audio level management:**

- When creator speaks, background music volume reduces automatically
- Guest speaker joins → balance audio levels between hosts
- Notification sounds → temporarily lower music/game audio

### 💾 Auto-Backup

**Prevent data loss:**

- Auto-save recordings every 15 minutes (segmented recording)
- Upload backups to cloud storage (Google Drive, Dropbox)
- Notification if disk space falls below 10GB

---

## Phase 4: Advanced Features

**Goal:** Professional-grade capabilities with simple interfaces

### 🎬 Replay System

**Instant replay for live streams:**

- Buffer last 30 seconds of video
- Stream Deck button: "Show Replay"
- Overlay appears with slow-motion playback
- Auto-return to live feed after replay ends

### 🎨 Dynamic Branding

**Theme switcher:**

- Load different color schemes, overlays, fonts per event
- "Gaming", "Tutorial", "Interview" presets
- Update all scenes/sources with one click
- Export/import theme packs

### 👥 Guest Management

**Multi-host streaming:**

- Guest join workflow: Add video call source (Zoom, Discord, etc.)
- Auto-resize main webcam to PiP
- Guest leaves → restore full-screen layout
- Individual audio controls per guest

### 📱 Mobile Control

**Stream Deck companion app alternative:**

- Progressive Web App for iOS/Android
- Same controls as desktop web UI
- Operate stream from phone/tablet
- Useful for IRL streaming setups

### 🎯 Hotkey Macros

**Custom automation builder:**

- Visual workflow editor: "When X happens, do Y"
- Example: "When recording starts, also start timer and show REC indicator"
- Trigger chains: "If CPU > 80% for 10 seconds, lower quality and notify me"

### 📈 Analytics Integration

**Post-stream insights:**

- Recording analytics: peak moments, audio levels over time
- Scene usage breakdown: "You spent 60% in SCN_LIVE, 30% in SCN_BRB"
- Performance metrics: average FPS, CPU usage, encoding quality
- Export reports for VOD editing (highlight timestamps)

---

## Phase 5: Ecosystem Expansion

**Goal:** Support more platforms and workflows

### 🌐 Multi-Platform Streaming

**Extend beyond TikTok:**

- Twitch integration via API (stream metadata, chat overlay)
- YouTube Live (auto-update stream title/description)
- Facebook Live, Instagram Live (when APIs available)
- RTMP custom destinations

### 🎮 Game Integration

**For gaming streamers:**

- Detect active game → auto-switch to game scene
- In-game events → trigger OBS actions (e.g., death → show "RIP" overlay)
- Game audio routing (separate game/voice/music channels)

### 🗣️ Chat Overlays

**Show live chat in OBS:**

- TikTok Live chat overlay (when API available)
- Custom styling (font, color, position)
- Chat commands trigger OBS actions (!lights, !scene2)

### 🎁 Donation/Alert Widgets

**Monetization integrations:**

- TikTok Gifts → show on-screen alert
- Streamlabs/StreamElements integration
- Custom alert animations per donation tier

### 📹 VOD Auto-Publishing

**Post-stream automation:**

- Auto-upload recording to YouTube/TikTok as VOD
- Generate thumbnail from stream (pick frame or template)
- Auto-tag with stream date, duration, game/category
- Add intro/outro bumpers automatically

---

## Technical Debt & Maintenance

### Known Limitations

- **No TikTok API:** Currently no official TikTok Live API for metadata/chat. Relies on manual TikTok Live Studio operation.
- **OBS WebSocket dependency:** Requires OBS 28+ with WebSocket plugin enabled.
- **Stream Deck SDK:** Limited testing without physical hardware. Need mock mode for development.

### Testing Strategy

- **Unit tests:** OBS controller, config parser, scene mapper
- **Integration tests:** WebSocket connection, scene switching, recording controls
- **E2E tests:** Full workflows (Go Live, Take a Break, End Show)
- **Hardware tests:** Stream Deck plugin with real device

### Performance Goals

- OBS connection latency: < 100ms
- Scene switch response time: < 200ms
- Web UI refresh rate: 60fps
- Stream Deck button latency: < 50ms

---

## Success Metrics

### User Experience

- ✅ Creator can go from setup to first stream in < 10 minutes
- ✅ No need to open OBS UI during stream
- ✅ One-click operations for 90% of common tasks
- ✅ Clear error messages with recovery steps (no technical jargon)

### Technical Reliability

- ✅ 99.9% uptime for OBS connection
- ✅ Auto-recovery from disconnects within 5 seconds
- ✅ Zero data loss (recordings, settings, configurations)
- ✅ < 5% CPU overhead from control system

### Adoption

- ✅ 10+ creators using for weekly streams
- ✅ 50+ successful streams without critical bugs
- ✅ 5+ community-contributed scene templates/themes

---

## Community & Ecosystem

### Open Source Strategy

- MIT License for core packages
- Accept community PRs for features, bug fixes, themes
- Plugin marketplace for custom workflows/scenes
- Template library (stream overlays, transitions, alerts)

### Documentation

- Video tutorials for setup, first stream, advanced features
- Creator showcase: "How I use OBS-TikTokLiveStudio"
- Troubleshooting guide for common issues
- API docs for developers extending the system

### Support Channels

- GitHub Discussions for Q&A
- Discord community for real-time help
- Bug reports via GitHub Issues with reproduction templates

---

## Next Immediate Steps

1. **Install OBS WebSocket client:** `npm install obs-websocket-js --workspace apps/web`
2. **Scaffold obs-controller package:** Connection manager, scene switcher, status monitor
3. **Update web UI:** Add OBS connection status, active scene display, manual scene buttons
4. **Test with real OBS instance:** Verify connection, scene switching, virtual camera toggle
5. **Document setup:** Update README with OBS WebSocket setup instructions

---

## Long-Term Vision

**Ultimate Goal:** Make professional live streaming accessible to every creator, regardless of technical skill level.

**Analogy:** Just as Canva simplified graphic design and Shopify simplified e-commerce, this tool simplifies live streaming production.

**Impact:** Enable creators to focus on content, not on technical operations. Lower the barrier to entry for high-quality live streams. Empower more diverse voices to share their stories through live video.
