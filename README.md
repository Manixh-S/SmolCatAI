# SmolCat

SmolCat is a retro-inspired virtual pet built with React, TypeScript, Vite, and Azure Functions. You can feed, pet, and put your cat to sleep, rename it, switch between pixel-art skins, and chat with it through a Gemini-powered backend that responds based on the cat's current mood and stats.

The project is set up for deployment on Azure Static Web Apps with Google authentication and Azure Table Storage for server-side persistence.

## Features

- Retro tamagotchi-style UI with animated pixel cat skins
- Cat care loop with fullness, happiness, and energy stats (all "high = good"; feeding fills the Food bar)
- AI chat powered by Gemini with mood-aware responses
- Stats persist in `localStorage` for everyone and sync to the server for signed-in users
- Time-based decay applied on the server (and locally) when you return
- Rate limiting for anonymous chat to protect the Gemini quota
- Persistent browser session IDs for chat continuity
- Google sign-in via Azure Static Web Apps authentication
- Azure Table Storage for chat history, cat state, and session metadata
- Background music and PWA-style static assets

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Plain CSS files per component

### Backend

- Azure Functions v4
- Azure Table Storage via `@azure/data-tables`
- Google Gemini via `@google/genai`
- Vitest for unit tests

### Deployment

- Azure Static Web Apps
- GitHub Actions CI/CD

## How It Works

The frontend renders a handheld virtual pet interface. Basic interactions like feeding, petting, sleeping, renaming the cat, and choosing a skin happen in the browser. Stats decay on a live tick and are written to `localStorage` on every change, so a refresh no longer resets the cat.

For signed-in users, stats also sync with the backend: on load the app fetches saved state from `/api/getCat` (with server-side decay applied for time away), and changes are saved to `/api/updateCat` with a short debounce. The server owns the decay clock, so clients cannot rewind it.

When the user sends a chat message, the app posts the current cat stats, session ID, cat name, and message to `/api/chatWithCat`. The Azure Function builds a system prompt from the cat's current state, loads recent chat history from Azure Table Storage, sends the conversation to Gemini, and returns a short in-character response. Anonymous sessions are rate limited (5 messages/minute); signed-in users are not.

## Architecture Notes

- Frontend stat state, persistence, and server sync live in `src/useCatState.ts`
- Decay rates are defined in `src/catState.ts` and `api/src/shared/catState.ts` and must stay in sync
- Cat chat is handled by `api/src/functions/chatWithCat.ts`
- Shared API helpers (auth header parsing, decay, rate limiting, table names) live in `api/src/shared/`
- Google auth is configured in `staticwebapp.config.json`
- Vite proxies `/api` requests to the local Azure Functions host during development
- Offline decay is capped at 60 minutes so a cat left overnight is hungry, not permanently miserable

## Project Structure

```text
SmolCat/
|-- src/                     # React frontend
|   |-- App.tsx
|   |-- TamagotchiContainer.tsx
|   |-- useCatState.ts
|   |-- PixelCat.tsx
|   |-- BackgroundMusic.tsx
|   `-- ...
|-- public/                  # Static assets
|-- api/
|   |-- src/functions/
|   |   |-- chatWithCat.ts
|   |   |-- getCat.ts
|   |   `-- updateCat.ts
|   |-- src/shared/        # auth, cat state/decay, rate limiting, tables
|   |-- host.json
|   `-- package.json
|-- .github/workflows/       # Static Web Apps deploy pipeline
|-- staticwebapp.config.json # Auth and route rewrites
`-- package.json
```

## Prerequisites

Install these before running locally:

- Node.js 20+ recommended
- npm
- Azure Functions Core Tools v4
- An Azure Storage connection string for API-backed features
- A Gemini API key

Optional for a fuller local Azure experience:

- Azurite for local Table Storage emulation
- Azure Static Web Apps CLI if you want to test auth and frontend/API integration more closely

## Local Development

### 1. Install dependencies

Root app:

```bash
npm install
```

API app:

```bash
cd api
npm install
```

### 2. Configure API settings

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GEMINI_API_KEY": "your-gemini-api-key"
  }
}
```

If you want to test Google auth in Azure Static Web Apps, you'll also need these app settings in Azure:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Those are referenced by `staticwebapp.config.json`. They are typically not required for basic local frontend development unless you are specifically testing auth flows.

### 3. Run the API

From `api/`:

```bash
npm run build
npm start
```

The Functions host runs on `http://localhost:7071` by default.

### 4. Run the frontend

From the repo root:

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:5173` by default and proxies `/api/*` to the Functions host.

## Available Scripts

### Root

- `npm run dev` starts the Vite dev server
- `npm run build` builds the frontend with TypeScript and Vite
- `npm run lint` runs ESLint
- `npm run preview` previews the production frontend build

### API

- `npm run build` compiles the Azure Functions TypeScript source
- `npm start` starts the local Azure Functions runtime
- `npm run watch` watches and recompiles API TypeScript files
- `npm test` runs the vitest unit tests (decay and rate-limit logic)

## Environment Variables

### Required for the API

- `GEMINI_API_KEY`: used by `chatWithCat` to generate cat responses
- `AzureWebJobsStorage`: used for Azure Functions storage and Table Storage persistence

### Required in Azure for Google auth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## API Endpoints

### `POST /api/chatWithCat`

Chats with the cat and returns a short AI-generated response.

Example request body:

```json
{
  "sessionId": "a-session-id",
  "catName": "SmolCat",
  "stats": {
    "fullness": 42,
    "happiness": 81,
    "energy": 63
  },
  "userMessage": "Do you want a snack?"
}
```

Behavior:

- Requires `GEMINI_API_KEY`
- Anonymous sessions are limited to 5 messages per minute (429 when exceeded); signed-in users are unlimited
- Loads up to 8 previous chat messages for the same session when storage is configured
- Stores chat history in the `CatChatHistory` table and rate-limit windows in `CatRateLimits`
- Stores authenticated session metadata (user, cat name) in the `CatSessions` table

### `GET /api/getCat`

Returns authenticated cat state from storage, applying time-based decay since the last update (capped at 60 minutes).

Behavior:

- Requires authenticated identity from Static Web Apps headers
- Requires `AzureWebJobsStorage`
- Reads from the `CatStates` table; returns default stats if none saved yet
- Legacy rows saved with the old `hunger` field (high = starving) are converted to `fullness` (high = fed) on read

### `POST /api/updateCat`

Stores authenticated cat state in storage.

Example request body:

```json
{
  "fullness": 25,
  "happiness": 90,
  "energy": 60
}
```

Behavior:

- Requires authenticated identity from Static Web Apps headers
- Requires `AzureWebJobsStorage`
- Upserts into the `CatStates` table
- `lastUpdated` is set by the server, so clients cannot rewind the decay clock

## Authentication

SmolCat is configured for Google login through Azure Static Web Apps auth.

Relevant routes:

- `/login` rewrites to `/.auth/login/google`
- `/logout` rewrites to `/.auth/logout`
- `/.auth/me` is used by the frontend to detect the signed-in user

When signed in, the UI shows account information and the backend can associate saved data with the authenticated user.

## Deployment

This repo includes a GitHub Actions workflow in `.github/workflows` that deploys the frontend and API to Azure Static Web Apps when changes are pushed to `main`.

Build config used by the workflow:

- App location: `/`
- API location: `api`
- Frontend output: `dist`

To deploy successfully, the Static Web App needs the appropriate secrets and app settings configured in Azure.

## Known Limitations

- Chat history is keyed only by the browser's session UUID; it is unguessable in practice but not real access control
- The client reports its own stats to `chatWithCat`, so chat mood can be spoofed (cosmetic only)
- Auth behavior is easiest to test in Azure Static Web Apps or with a matching local auth setup
- Chat history persistence and anonymous rate limiting depend on valid Table Storage configuration (both fail open without it)

## Future Improvements

- Merge anonymous local progress into the server state on first sign-in
- Add richer cat animations and more moods
- Expand AI memory and personality controls
- Add frontend component tests alongside the existing API unit tests

