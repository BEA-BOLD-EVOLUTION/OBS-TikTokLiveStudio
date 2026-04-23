# Product Roadmap: OBS + TikTok Live Studio Control System

## Vision

Enable creators to operate professional live streaming setups (OBS + TikTok Live Studio) through simple, one-click controls — without needing to learn the technical complexity of either system.

**Core Principle:** Abstract away technical operations behind creator-focused actions ("Go Live", "Take a Break", "Add Lower Third") that execute multi-step sequences automatically.

---

## Architecture Overview

```text
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

## Getting Started

### Prerequisites

Before you begin, install the following on your computer:

1. **Node.js 20+** and **npm 10+**
   - Download from: <https://nodejs.org/>
   - Choose the version labeled "LTS" (Long Term Support)
   - After installing, verify it worked:
     - Open PowerShell/Terminal (see step 1 in Quick Start below)
     - Type `node --version` and press Enter. You should see something like `v20.11.0`
     - Type `npm --version` and press Enter. You should see something like `10.2.4`

2. **OBS Studio** with **obs-websocket** plugin
   - Download OBS: <https://obsproject.com/>
   - Download obs-websocket: <https://github.com/obsproject/obs-websocket/releases>
   - Install both programs using the installer files
   - After installing, open OBS and configure it:
     - Click **Tools** at the top menu
     - Click **WebSocket Server Settings**
     - Check the box next to "Enable WebSocket server"
     - Keep Port as **4455** (default)
     - For now, leave the password blank (easier for testing)

3. **Git** (for cloning the repository)
   - Download from: <https://git-scm.com/>

### Quick Start (Step-by-Step)

**1. Open a command-line interface:**

This is a text-based window where you type commands to run programs. Here's how to open it on your computer:

- **Windows:**
  - Press the `Windows` key on your keyboard
  - Type `PowerShell`
  - Click on **Windows PowerShell** in the results
  - A blue window with white text will open

- **macOS:**
  - Press `Command + Space` to open Spotlight
  - Type `terminal`
  - Press `Enter`
  - A white or black window will open

- **Linux:**
  - Press `Ctrl + Alt + T`
  - Or search for "Terminal" in your applications menu

**2. Download the project files:**

In the window you just opened, type or copy-paste this command and press `Enter`:

```bash
git clone https://github.com/BEA-BOLD-EVOLUTION/OBS-TikTokLiveStudio.git
```

Wait for it to finish downloading. You'll see progress messages.

**3. Navigate into the project folder:**

Type this command and press `Enter`:

```bash
cd OBS-TikTokLiveStudio
```

The text at the beginning of the line should now end with `OBS-TikTokLiveStudio`.

**4. Install all dependencies:**

```bash
npm install
```

This will install dependencies for the web dashboard, OBS controller library, and Stream Deck plugin.

**4. Configure OBS connection (optional):**

If you set a password in OBS WebSocket settings, create a `.env` file:

```bash
# On Windows Command Prompt:
copy .env.example .env

# On macOS/Linux or Windows PowerShell:
cp .env.example .env
```

Then edit `.env` and set your OBS password:

```env
OBS_HOST=localhost
OBS_PORT=4455
OBS_PASSWORD=your_password_here
```

If you didn't set a password, skip this step.

**5. Start the web dashboard:**

```bash
npm run dev
```

This will start the development server. You'll see output like:

```text
  VITE v8.0.10  ready in 508 ms

  ➜  Local:   http://localhost:5173/
```

**6. Open your web browser and go to the URL shown** (typically `http://localhost:5173`)

You should see the OBS-TikTok Live Studio control dashboard.

### First Run Verification

After opening the dashboard in your browser:

1. **Check OBS connection status** in the top-left corner
   - If OBS is running with WebSocket enabled, you'll see a green "Connected" indicator
   - If not connected, you'll see a red "Disconnected" indicator with an error message

2. **Verify features are loaded:**
   - Scene Recommendations panel
   - Scheduled Workflows panel
   - Adaptive Quality panel
   - Audio Ducking panel
   - Auto-Backup Recordings panel

3. **Test a simple action:**
   - If OBS is connected, try switching scenes from the scene switcher
   - Or toggle the virtual camera on/off

**Troubleshooting:**

- **"Cannot connect to OBS"**: Make sure OBS is running on your computer. Then check that WebSocket is turned on:
  - In OBS, click **Tools** at the top
  - Click **WebSocket Server Settings**
  - Make sure there's a checkmark next to "Enable WebSocket server"
  
- **"Port already in use"**: This is normal. The system will automatically find an available port and show you a different number like `http://localhost:5174/` or `http://localhost:5175/`. Just use whatever URL it shows you.

- **"npm: command not found"** or **"npm is not recognized"**: This means Node.js isn't installed correctly.
  - Download and install Node.js from <https://nodejs.org/>
  - After installation, close the PowerShell/Terminal window completely
  - Open a new PowerShell/Terminal window
  - Try the commands again

- **The window closes immediately after typing a command**: You might have typed the command incorrectly. Make sure to copy-paste the commands exactly as shown, then press `Enter`.

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

### � AI Transition Sequences

**Automated transition sandwich (transition out → video → transition in):**

**Common use cases:**

- Topic/segment changes with branded interludes
- Sponsor break bumpers
- "We'll be right back" moments
- Chapter markers in long-form content

**One-click automation:**

```yaml
[Play Transition] button →
  1. Switch to SCN_TRANSITION (media source with complete AI-generated video)
  2. Play video clip (contains: transform-out → content → transform-in)
  3. When video ends → switch back to previous scene or next scene
  4. Resume normal audio/video flow
```

**Note:** The AI-generated video includes the full transformation sequence baked in — no separate fade/transform effects needed in OBS. The video handles entry animation, content display, and exit animation as a single render.

**Advanced features:**

- **Transition library management (20+ videos):**
  - **Section-based organization:**
    - **Default sections provided:** Topic Changes, Sponsors, BRB, Quick Reactions, Intros, Outros
      - **Topic Changes:** Scene-to-scene transitions (morphs, glitches, wipes)
      - **Sponsors:** Brand-specific transitions with logos/animations
      - **BRB (Be Right Back):** Break transitions with countdown/messages
      - **Quick Reactions:** Ultra-short (0.3-1.5 sec) instant-impact moments (jump scares, flash cuts)
      - **Intros:** Stream opening sequences
      - **Outros:** Stream ending sequences
    - **Default sections can be hidden:** Show/hide any default section you don't use (cannot be deleted, only hidden)
    - **Add unlimited custom sections:** Create your own categories (e.g., "Chapter Breaks", "Guest Arrivals", "Poll Results", "Donation Alerts", "Seasonal", "Branded Content")
    - **Each section is distinct:** Independent management, colors, favorites, Stream Deck pages
    - **Editable section titles:** Rename any section to match your workflow
  - **Visual Organization (solves OBS's lack of organization features):**
    - Color coding: Assign colors to transitions (e.g., blue=topic change, green=sponsor, red=urgent)
    - Custom collections/groups: Create playlists like "Gaming Stream", "Tutorial Stream", "Just Chatting"
    - Visual tags with color badges (smooth, fast, branded, seasonal, etc.)
    - Emoji labels for quick visual scanning (🎮 gaming, 💰 sponsor, ☕ break)
    - Grid view (thumbnails) vs List view (compact details)
    - Filter by multiple criteria: color + category + tags
  - Favorites/pinned transitions for quick access
  - Search by name, description, tags, or duration
  - Sort by: most used, recently added, duration, alphabetical, color
  - Thumbnail preview grid (auto-generate from video midpoint frame)
  - Bulk import from folder (drag-and-drop multiple .mp4 files from computer)
    - Auto-categorize based on folder name or video duration (e.g., <2 sec → Quick Reactions)
  - Folder-based organization mirrors file structure
- **Smart selection:** Choose transition based on context ("topic change" vs "break")
- **Custom playback:** Override video playback speed (slow-mo, fast-forward)
- **Queue management:** Schedule multiple transitions (e.g., every 20 minutes)
- **Stream Deck integration:**
  - Dedicated buttons per transition type (first 8-12 favorites)
  - Multi-page support (page 1: favorites, page 2: sponsors, etc.)
  - LED feedback shows active transition playing
- **Auto-resume:** Remember which scene was active before transition, return to it
- **Preview mode:** Test transition sequence without going live
- **Video validation:** Auto-detect video duration, resolution, format on import
- **Usage analytics:** Track which transitions used most, play counts, last used date

**Configuration example:**

```json
{
  "transitionLibrary": {
    "categories": [
      {
        "name": "Topic Changes",
        "transitions": [
          {
            "id": "TRN_TOPIC_MORPH",
            "name": "Morph Effect",
            "video": "transitions/topic-change/morph.mp4",
            "duration": 3,
            "description": "Liquid morph with particle swirl",
            "tags": ["smooth", "elegant"],
            "color": "#3B82F6",
            "emoji": "🌊",
            "favorite": true,
            "collections": ["Gaming Stream", "Professional"],
            "returnToPrevious": true
          },
          {
            "id": "TRN_TOPIC_GLITCH",
            "name": "Digital Glitch",
            "video": "transitions/topic-change/glitch.mp4",
            "duration": 2,
            "description": "Fast digital distortion",
            "tags": ["fast", "tech"],
            "color": "#8B5CF6",
            "emoji": "⚡",
            "favorite": false,
            "collections": ["Gaming Stream"],
            "returnToPrevious": true
          }
        ]
      },
      {
        "name": "Sponsors",
        "transitions": [
          {
            "id": "TRN_SPONSOR_BRAND_A",
            "name": "Brand A Bumper",
            "video": "transitions/sponsors/brand-a.mp4",
            "duration": 5,
            "description": "Glitch transition with Brand A logo",
            "tags": ["sponsor", "branded"],
            "color": "#10B981",
            "emoji": "💰",
            "favorite": true,
            "collections": ["Sponsored Streams"],
            "returnToPrevious": false,
            "nextScene": "SCN_LIVE"
          }
        ]
      },
      {
        "name": "Be Right Back",
        "transitions": [
          {
            "id": "TRN_BRB_WARP",
            "name": "Warp Exit",
            "video": "transitions/brb/warp.mp4",
            "duration": 4,
            "description": "Warp effect with countdown timer",
            "tags": ["break", "countdown"],
            "color": "#F59E0B",
            "emoji": "☕",
            "favorite": true,
            "collections": ["Just Chatting", "Long Streams"],
            "returnToPrevious": true
          }
        ]
      },
      {
        "name": "Guest Arrivals",
        "custom": true,
        "transitions": [
          {
            "id": "TRN_GUEST_ARRIVAL",
            "name": "Guest Spotlight",
            "video": "transitions/custom/guest-arrival.mp4",
            "duration": 3.5,
            "description": "Spotlight animation for co-host arrival",
            "tags": ["guest", "collab", "custom"],
            "color": "#A78BFA",
            "emoji": "👋",
            "favorite": true,
            "collections": ["Collab Streams"],
            "returnToPrevious": false,
            "nextScene": "SCN_MULTI_CAM"
          }
        ]
      }
    ],
    "settings": {
      "defaultCategory": "Topic Changes",
      "autoGenerateThumbnails": true,
      "thumbnailTimestamp": "midpoint",
      "maxFavorites": 12,
      "enabledSections": ["Topic Changes", "Sponsors", "BRB", "Quick Reactions", "Guest Arrivals"],
      "hiddenSections": ["Intros", "Outros"],
      "streamDeckPages": [
        {
          "page": 1,
          "label": "Favorites",
          "transitions": ["TRN_TOPIC_MORPH", "TRN_SPONSOR_BRAND_A", "TRN_BRB_WARP"]
        },
        {
          "page": 2,
          "label": "All Topics",
          "transitions": ["TRN_TOPIC_MORPH", "TRN_TOPIC_GLITCH"]
        }
      ]
    }
  }
}
```

**UX Design (following modern best practices):**

_Layout Structure:_

- **Three-column layout:**
  - **Left sidebar (240px):** Section navigation + controls
  - **Main content area (flexible):** Transition grid/list view
  - **Right panel (320px, collapsible):** Selected transition details + preview

_Section Navigation (Left Sidebar):_

```
┌─ Transition Library ────────────┐
│ 🔍 Search all transitions...    │
├──────────────────────────────────┤
│ ⭐ Favorites (12)               │
│                                  │
│ SECTIONS                         │
│ ➕ Add Section                   │
│                                  │
│ 🌊 Topic Changes (8)      👁️ ▼ │
│ 💰 Sponsors (3)           👁️ ▼ │
│ ☕ BRB (2)                👁️ ▼ │
│ ⚡ Quick Reactions (15)   👁️ ▼ │
│ 👋 Guest Arrivals (1)     🗑️ ▼ │
│                                  │
│ HIDDEN SECTIONS                  │
│ 🎬 Intros                 👁️‍🗨️  │
│ 🎭 Outros                 👁️‍🗨️  │
└──────────────────────────────────┘
```

- Collapsible accordion per section (▼ expands to show transition list)
- Eye icon (👁️) = hide/show toggle
- Trash icon (🗑️) only on custom sections
- Drag handle (⋮⋮) for reordering sections
- Badge count shows transitions per section
- Hover state reveals section-level controls (rename, color theme, hide/delete)

_Main Content Area (Grid View):_

```
┌─────────────────────────────────────────────────────────────┐
│ Topic Changes (8 transitions)          [Grid] [List] [+Add] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ [THUMB]  │  │ [THUMB]  │  │ [THUMB]  │  │ [THUMB]  │   │
│  │ 🌊 Morph │  │ ⚡ Glitch │  │ 🌀 Spin  │  │ ✨ Fade  │   │
│  │ 3.0s ⭐  │  │ 2.0s     │  │ 2.5s ⭐  │  │ 1.5s     │   │
│  │ ━━━━━━━  │  │ ━━━━━━━  │  │ ━━━━━━━  │  │ ━━━━━━━  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ [THUMB]  │  │ [THUMB]  │  │ [THUMB]  │  │ + Add    │   │
│  │ 💫 Burst │  │ 🔥 Fire  │  │ 🎨 Paint │  │ New      │   │
│  │ 2.2s     │  │ 1.8s ⭐  │  │ 3.5s     │  │          │   │
│  │ ━━━━━━━  │  │ ━━━━━━━  │  │ ━━━━━━━  │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **Grid cards (180px × 140px):**
  - Video thumbnail (auto-generated from midpoint)
  - Emoji + transition name (truncated with ellipsis)
  - Duration badge (bottom left)
  - Favorite star (bottom right, toggleable)
  - Color strip (left border, 4px, section color theme)
  - Hover: overlay with play preview + edit/delete/duplicate icons
- **Drag-and-drop:** Reorder within section or move between sections
- **Multi-select:** Shift+click or Ctrl+click, shows bulk action toolbar

_Main Content Area (List View):_

```text
┌──────────────────────────────────────────────────────────────────┐
│ Topic Changes (8)  [●●] 🔽Name  🔽Duration  🔽Last Used  [+Add]  │
├──────────────────────────────────────────────────────────────────┤
│ ━━ 🌊 Morph Effect            3.0s    2 hours ago    ⭐ [▶️][✏️] │
│ ━━ ⚡ Digital Glitch          2.0s    5 days ago        [▶️][✏️] │
│ ━━ 🌀 Spin Wipe               2.5s    1 hour ago     ⭐ [▶️][✏️] │
│ ━━ ✨ Cross Fade              1.5s    3 hours ago       [▶️][✏️] │
│ ━━ 💫 Particle Burst          2.2s    Yesterday         [▶️][✏️] │
│ ━━ 🔥 Fire Transition         1.8s    30 minutes ago ⭐ [▶️][✏️] │
│ ━━ 🎨 Paint Splash            3.5s    Never             [▶️][✏️] │
└──────────────────────────────────────────────────────────────────┘
```

- Compact rows with sortable columns
- Color strip (left border ━━)
- Inline actions: Play preview, Edit, Star favorite
- Checkbox for multi-select (left side)
- Click row to expand details in right panel

_Right Panel (Transition Details):_

```text
┌─ Morph Effect ──────────────────┐
│ [  VIDEO PREVIEW  ]             │
│ [   ▶️ Play   ]                 │
├─────────────────────────────────┤
│ Name: [Morph Effect    ] ✏️     │
│ Duration: 3.0s                  │
│ File: morph.mp4                 │
│                                 │
│ Description:                    │
│ [Liquid morph with particle     │
│  swirl effect             ] ✏️  │
│                                 │
│ Tags: smooth elegant      [+]   │
│ Color: [#3B82F6] 🎨             │
│ Emoji: [🌊] 🙂                  │
│                                 │
│ Collections:                    │
│ ☑️ Gaming Stream                │
│ ☑️ Professional                 │
│ ☐ Tutorial Stream               │
│                                 │
│ Settings:                       │
│ ☑️ Return to previous scene     │
│ ☐ Go to: [Select scene ▼]      │
│ ☑️ Add to favorites             │
│                                 │
│ Usage: 24 times                 │
│ Last used: 2 hours ago          │
│                                 │
│ [Delete] [Duplicate] [Export]   │
└─────────────────────────────────┘
```

- Live video preview (hover to play)
- Inline editing for all fields (click pencil ✏️)
- Color picker popup
- Emoji picker popup
- Collection checkboxes (multi-select)
- Usage analytics at bottom

_Bulk Import Flow:_

1. **Drag-and-drop zone:**

   ```
   ┌────────────────────────────────┐
   │    📁 Drop video files here    │
   │                                │
   │   or click to browse files     │
   │                                │
   │  Supports: .mp4, .mov, .webm   │
   └────────────────────────────────┘
   ```

2. **Processing modal:**

   ```
   ┌─ Importing 15 videos ──────────┐
   │                                │
   │ ✅ morph.mp4 → Topic Changes   │
   │ ✅ glitch.mp4 → Topic Changes  │
   │ ✅ sponsor-a.mp4 → Sponsors    │
   │ ⏳ jumpscare.mp4 (0.8s)        │
   │    → Quick Reactions           │
   │ ❌ invalid.avi (unsupported)   │
   │                                │
   │ [━━━━━━━━━━━━━━━━━] 67%       │
   │                                │
   │ Auto-categorizing by:          │
   │ • Duration (< 2s = Quick)      │
   │ • Folder name                  │
   │ • File name keywords           │
   │                                │
   │      [Cancel] [Continue]       │
   └────────────────────────────────┘
   ```

3. **Review and edit:**
   - Table showing all imported files
   - Columns: Thumbnail, Name, Duration, Auto-category, Actions
   - Edit category dropdown before finalizing
   - Bulk actions: Assign to section, set color, add tags

_Search & Filter UI:_

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [Search transitions...              ] [Clear] [🔽]  │
├─────────────────────────────────────────────────────────┤
│ FILTERS (3 active)                              [Reset] │
│                                                         │
│ Sections: [All ▼]                                      │
│   ☑️ Topic Changes  ☑️ Sponsors  ☐ BRB                │
│                                                         │
│ Duration: [Any ▼]                                      │
│   ○ < 1s  ○ 1-2s  ● 2-4s  ○ > 4s                      │
│                                                         │
│ Tags: smooth elegant fast                        [+]   │
│                                                         │
│ Color: [All ▼]  🔵 🟣 🟢 🟡 🔴                         │
│                                                         │
│ Collections: [All ▼]                                   │
│   ☑️ Gaming Stream  ☐ Tutorial  ☐ Professional        │
│                                                         │
│ [Apply Filters]                                        │
└─────────────────────────────────────────────────────────┘
```

- Instant search (debounced 300ms)
- Multi-select checkboxes for sections and collections
- Color filter shows section color palette
- Tag cloud (click to add/remove filter)
- Active filter count badge
- Clear all / Reset buttons

_Visual Design System:_

- **Colors:**
  - Background: `#0a0c14` (dark mode base)
  - Panel: `#1a1d29` (elevated surface)
  - Accent: `#3B82F6` (primary blue)
  - Text: `#E5E7EB` (high contrast)
  - Muted: `#9CA3AF` (secondary text)
  - Success: `#10B981`, Warning: `#F59E0B`, Error: `#EF4444`

- **Typography:**
  - Headers: Inter Bold 16px/20px/24px
  - Body: Inter Regular 14px
  - Labels: Inter Medium 12px
  - Monospace (duration): JetBrains Mono 12px

- **Spacing:**
  - Grid gap: 16px
  - Section padding: 24px
  - Card padding: 12px
  - Border radius: 8px (cards), 4px (inputs)

- **Animations:**
  - Hover transitions: 150ms ease
  - Drag-and-drop: spring physics (react-spring)
  - Modal enter/exit: 200ms ease-out
  - Skeleton loading for thumbnails

_Interaction Patterns:_

- **Inline editing:** Click text → input field appears → blur or Enter to save
- **Drag-and-drop:** Visual indicator shows drop target (dashed border pulse)
- **Multi-select:** Shift+click for range, Ctrl/Cmd+click for individual
- **Keyboard shortcuts:**
  - `Ctrl+F` = Focus search
  - `Space` = Play selected transition preview
  - `Del` = Delete selected
  - `Ctrl+D` = Duplicate
  - `Esc` = Deselect all / close modal
  - Arrow keys = Navigate grid
  - `F` = Toggle favorite

- **Toast notifications:**
  - Success: "3 transitions added to Sponsors" (green, 3s)
  - Error: "Failed to import video.avi - unsupported format" (red, 5s)
  - Info: "Section hidden from Stream Deck" (blue, 2s)

_Accessibility (WCAG 2.1 AA):_

- Color contrast ratio ≥ 4.5:1 for text
- Focus indicators on all interactive elements (2px solid accent)
- Keyboard navigation for all features
- ARIA labels for icon-only buttons
- Screen reader announcements for drag-drop, filter changes
- Skip links ("Skip to content")
- Reduced motion support (disable animations if `prefers-reduced-motion`)

_Responsive Design:_

- **Desktop (1920px+):** Full three-column layout
- **Laptop (1280px):** Right panel collapses to modal on transition select
- **Tablet (768px):** Left sidebar becomes hamburger menu, grid 2 columns
- **Mobile (< 768px):** List view only, full-screen modals, bottom sheet for filters

**Technical implementation:**

- Media source in OBS configured to play video file once (no loop)
- OBS WebSocket `MediaInputPlaybackEnded` event triggers scene switch back
- State machine tracks: previous scene → transition → next scene
- Stream Deck buttons trigger by transition ID
- **Web UI library manager:**
  - **Section management:**
    - Create new sections (+ Add Section button)
    - Delete custom sections (default sections cannot be deleted, only hidden)
    - Show/hide default sections (toggle eye icon - hidden sections don't appear in UI or Stream Deck)
    - Reorder sections (drag-and-drop)
    - Rename any section (click to edit inline)
    - Assign section-level color themes
  - **Transition management:**
    - Inline editing for transition names
    - Color picker for each transition
    - Emoji selector dropdown
    - Drag-and-drop to reorder transitions within sections
    - Move transitions between sections
    - Transition preview thumbnails + duration
    - Multi-select for batch operations (assign color, add to collection, delete)
- Support for common AI video formats: MP4 (H.264/H.265), WebM, MOV
- Auto-detect video properties on import (resolution, fps, codec)
- Validate video duration matches config or auto-update

### �🎵 Audio Scene Switching

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

## Phase 3: Intelligent Automation ✅ COMPLETE

**Goal:** Proactive assistance and smart defaults

### 🤖 Scene Recommendations

- [x] **AI-powered suggestions based on usage patterns:**
  - Time-of-day pattern detection (morning, afternoon, evening, late-night)
  - Day-of-week pattern detection (weekday vs weekend)
  - Scene sequence detection (common transitions between scenes)
  - Duration tracking (average time spent in each scene)
  - Confidence scoring for recommendations (0-100)
  - Real-time recommendations based on current scene and time
  - Analytics dashboard with usage statistics

### 📅 Scheduled Workflows

- [x] **Time-based workflow automation with multi-action sequences:**
  - 4 recurrence types: once, daily, weekly, interval-based
  - 11 action types: scene switching, recording control, streaming control, virtual camera, lower thirds, transitions
  - Workflow scheduler with 10-second check frequency
  - Action delay support for sequential execution
  - Workflow history and execution analytics
  - Manual "Run Now" for testing workflows
  - Visual workflow editor with color coding

### 🎛️ Adaptive Quality

- [x] **Automatic bitrate adjustment based on network conditions:**
  - 5 quality presets: ultra (1080p60 6000Kbps), high (1080p30 4500Kbps), medium (720p30 2500Kbps), low (480p30 1200Kbps), minimal (360p30 600Kbps)
  - Network quality monitoring (bandwidth, latency, packet loss, jitter)
  - 3 adjustment strategies: conservative, balanced, aggressive
  - Auto-recovery to higher quality when network improves
  - Quality stability analytics
  - Manual preset override support

### 🔊 Audio Ducking

- [x] **Automatic music volume reduction with voice activity detection:**
  - Web Audio API-based VAD with FFT analysis (2048 bins)
  - Voice frequency range filtering (85-3000 Hz)
  - Configurable duck amount (default 70% reduction)
  - Fast attack time (100ms) and slow release (500ms)
  - Per-source duck amount customization
  - Real-time audio level meter with canvas visualization
  - Multi-source management with priority system

### 💾 Auto-Backup Recordings

- [x] **Intelligent recording management with multi-location backup:**
  - Multi-location backup (local, network, cloud: OneDrive/Dropbox/Google Drive)
  - Split recording intervals (none, 30min, 1hr, 2hr)
  - Upload queue with retry logic (exponential backoff)
  - File naming patterns with timestamp/session/split variables
  - Storage capacity monitoring per location
  - Cloud authentication (OAuth placeholders for production)
  - Upload progress tracking with speed and ETA

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

**TikTok Live Cohost Tracking:**

When creators cohost with other TikTok streamers (using TikTok's native cohost feature), this tool helps track and manage those collaborations.

**Quick Cohost Capture:**

- **One-click OCR capture** (automated screen reading):
  - Single button press (Ctrl+Shift+C) or Stream Deck button
  - System performs OCR on predefined screen region where TikTok displays cohost username
  - Auto-extracts username from screen (no manual typing needed)
  - Creator sets up screen region once during initial configuration:
    - "Capture username region" setup wizard
    - Draw bounding box around where TikTok shows cohost name
    - Save region coordinates for future captures
    - Support multiple monitor setups
  - Fallback: If OCR fails or low confidence, show quick manual entry dialog
- Capture fields:
  - TikTok username (auto-captured via OCR or manual entry)
  - Join timestamp (auto-captured)
  - Leave timestamp (optional, manual or auto)
  - Quick notes with preset tags (editable)
- Quick access: keyboard shortcut (Ctrl+Shift+C), Stream Deck button, or floating capture button during live
- **Returning cohost detection:**
  - After OCR capture, system checks history
  - Shows alert: "You've cohosted with @username before!"
  - Displays previous cohost count: "3 previous streams"
  - Shows last cohost date: "Last stream: 2 weeks ago"
  - Auto-loads previous tags/notes for quick reference
  - Visual indicators:
    - 🟢 Green badge: Tagged "Great cohost" or positive notes
    - 🔴 Red badge: Tagged "Block" with warning
    - 🟡 Yellow badge: Mixed or neutral history

**Quick Notes Presets:**

- Default quick-select tags (all editable):
  - ⭐ "Great cohost - will match again"
  - 🚫 "Block - do not match again"
  - 👍 "Good energy - would stream again"
  - 😐 "Meh - neutral experience"
  - 💰 "Business/promo focused"
  - 🎮 "Similar niche/content"
  - 💬 "Great chat engagement"
  - 📝 Custom note (freeform text)
- Click to add multiple tags per cohost
- Edit/rename any preset tag to match your workflow
- Add unlimited custom preset tags

**Cohost History Log:**

- Searchable list of all past cohosts
- Filter by date range, username, tags
- Export to CSV for analytics/credits
- Show cohost frequency count (e.g., "5 streams with @username")
- Flag blocked cohosts with visual indicator
- Auto-populate lower third with cohost username when captured
- Post-stream summary: list of all cohosts from that session with notes

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

### 📦 Installation & Distribution Automation

**Goal:** Eliminate manual setup steps for creators

**Automated Installation:**

- **One-click installer packages:**
  - Windows: `.exe` installer that handles everything
  - macOS: `.dmg` with drag-to-install + auto-setup
  - Linux: `.AppImage` or `.deb` package
  
- **Installation script:**
  - `install.sh` / `install.ps1` that runs all setup commands automatically
  - Checks for Node.js, installs if missing
  - Clones repo, runs `npm install`, starts dev server
  - Opens browser to dashboard automatically

**Desktop Application:**

- Package as standalone desktop app (Electron or Tauri)
- No need for users to:
  - Install Node.js/npm manually
  - Use command line at all
  - Understand git/repositories
- Double-click to launch, works like any other app
- Auto-updates when new version is available

**OBS Auto-Discovery:**

- Automatically detect OBS running on localhost
- Auto-connect without manual configuration
- Show "OBS not detected" prompt with one-click setup wizard
- No need to edit `.env` files or understand ports/passwords

**First-Run Setup Wizard:**

- Visual step-by-step guide on first launch:
  - "Welcome to OBS-TikTok Live Studio"
  - Check if OBS is installed → guide to download if not
  - Check if OBS WebSocket is enabled → auto-enable via API if possible
  - Test connection → show success/failure with helpful next steps
  - Optional: Import existing OBS scenes automatically
  
**Why This Matters:**

- Current setup requires: command line knowledge, git, Node.js, manual configuration
- Automated approach: download, install, click - ready to stream
- Reduces setup time from 10+ minutes to < 60 seconds
- Lowers barrier to entry for non-technical creators

**Implementation Priority:**

1. **Phase 5A**: Installation script (`install.sh`/`install.ps1`) for power users
2. **Phase 5B**: First-run setup wizard in web UI
3. **Phase 5C**: Desktop app packaging with Electron/Tauri
4. **Phase 5D**: One-click installers for Windows/macOS

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

## Current Status (April 23, 2026)

- ✅ **Phase 1: Foundation** - Complete (OBS WebSocket integration, web dashboard, scene/recording/virtual camera control)
- ✅ **Phase 2: Creator Workflows** - Complete (AI Transitions, Go Live Sequence, Lower Thirds, Cohost Tracking OCR)
- ✅ **Phase 3: Intelligent Automation** - Complete (Scene Recommendations, Scheduled Workflows, Adaptive Quality, Audio Ducking, Auto-Backup)
- 🚀 **Phase 4: Advanced Features** - Next Priority (Guest Management, Replay System, Dynamic Branding, Mobile Control)

## Next Immediate Steps

1. **Begin Phase 4 - Guest Management:** Implement TikTok Live Cohost Tracking with OCR-based username capture
2. **Production hardening:** Implement real network APIs for Adaptive Quality (replace simulated metrics)
3. **Cloud integration:** Complete OAuth flows for OneDrive/Dropbox/Google Drive in Auto-Backup
4. **OBS audio control:** Implement WebSocket audio filter APIs for Audio Ducking volume control
5. **Testing:** Add comprehensive integration tests for all Phase 3 features

---

## Long-Term Vision

**Ultimate Goal:** Make professional live streaming accessible to every creator, regardless of technical skill level.

**Analogy:** Just as Canva simplified graphic design and Shopify simplified e-commerce, this tool simplifies live streaming production.

**Impact:** Enable creators to focus on content, not on technical operations. Lower the barrier to entry for high-quality live streams. Empower more diverse voices to share their stories through live video.
