# OBS-TikTokLiveStudio

Scaffold repository for setting up OBS and TikTok Live Studio, with a lightweight web dashboard and a Stream Deck plugin starter to keep scenes/sources organized and linked.

## What’s included

- `apps/web`: minimal Vite + TypeScript web UI (hello world)
- `packages/streamdeck-plugin`: Stream Deck plugin starter (hello world)
- `config`: scene/source and Stream Deck mapping templates
- `docs`: workflow guide for organization/linking conventions
- Root tooling: TypeScript, ESLint, Prettier, `.env.example`, `.gitignore`

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

1. Install dependencies:
   - `npm install`
2. Create your local environment file:
   - Copy `.env.example` to `.env`
3. Adjust config templates under `config/` to match your OBS setup.

## Run

- Web dashboard (hello world):
  - `npm run dev:web`
- Stream Deck plugin starter (hello world):
  - `npm run dev:plugin`

## Build

- Build all packages:
  - `npm run build`

## Lint and format

- Lint:
  - `npm run lint`
- Format:
  - `npm run format`

## Quick structure

- `apps/web/src/main.ts` is the minimal runnable entry point.
- `packages/streamdeck-plugin/src/index.ts` validates Stream Deck link config.
- `config/scenes.example.json` and `config/streamdeck-links.example.json` are your baseline wiring.
