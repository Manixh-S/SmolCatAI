# SmolCat

SmolCat is a retro-inspired virtual pet built with React, TypeScript, Vite, and Azure Functions. You can feed, pet, and put your cat to sleep, rename it, switch between pixel-art skins, and chat with it through a Gemini-powered backend that responds based on the cat's current mood and stats.

The project is set up for deployment on Azure Static Web Apps with Google authentication and Azure Table Storage for server-side persistence.

## Features

- Retro tamagotchi-style UI with animated pixel cat skins
- Local cat care loop with hunger, happiness, and energy stats
- AI chat powered by Gemini with mood-aware responses
- Persistent browser session IDs for chat continuity
- Google sign-in via Azure Static Web Apps authentication
- Azure Table Storage support for chat history and user session metadata
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
- Google Gemini via `@google/generative-ai`

### Deployment

- Azure Static Web Apps
- GitHub Actions CI/CD

## How It Works

The frontend renders a handheld virtual pet interface. Basic interactions like feeding, petting, sleeping, renaming the cat, choosing a skin, and storing the generated session ID happen in the browser.

When the user sends a message, the app posts the current cat stats, session ID, cat name, and user message to `/api/chatWithCat`. The Azure Function builds a system prompt from the cat's current state, optionally loads recent chat history from Azure Table Storage, sends the conversation to Gemini, and returns a short in-character response.

If the user is authenticated through Static Web Apps, the backend also stores session metadata tied to that identity.

## Architecture Notes

- Frontend stat decay is handled in `src/useCatState.ts`
- Cat chat is handled by `api/src/functions/chatWithCat.ts`
- Google auth is configured in `staticwebapp.config.json`
- Vite proxies `/api` requests to the local Azure Functions host during development
- The repo includes `getCat` and `updateCat` API endpoints for authenticated saved state, but the current frontend does not call them yet

That last point matters: today, cat stats are not restored from the backend on refresh. Name, skin, and session ID are stored in `localStorage`; the main pet stats currently live in frontend state during the session.

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
    "hunger": 42,
    "happiness": 81,
    "energy": 63
  },
  "userMessage": "Do you want a snack?"
}
```

Behavior:

- Requires `GEMINI_API_KEY`
- Loads up to 8 previous chat messages for the same session when storage is configured
- Stores chat history in the `CatChatHistory` table
- Stores authenticated session metadata in the `CatSessions` table

### `GET /api/getCat`

Returns authenticated cat state from storage, applying time-based decay since the last update.

Behavior:

- Requires authenticated identity from Static Web Apps headers
- Requires `AzureWebJobsStorage`
- Reads from the `CatStates` table

### `POST /api/updateCat`

Stores authenticated cat state in storage.

Example request body:

```json
{
  "hunger": 25,
  "happiness": 90,
  "lastUpdated": 1760000000000
}
```

Behavior:

- Requires authenticated identity from Static Web Apps headers
- Requires `AzureWebJobsStorage`
- Upserts into the `CatStates` table

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

- The current UI does not yet read from `getCat` or write to `updateCat`
- Cat stats reset on refresh because they currently live in client memory
- Auth behavior is easiest to test in Azure Static Web Apps or with a matching local auth setup
- Chat history persistence depends on valid Table Storage configuration

## Future Improvements

- Wire frontend stats to `getCat` and `updateCat`
- Persist the full pet lifecycle across sessions
- Add richer cat animations and more moods
- Expand AI memory and personality controls
- Add automated tests for frontend state and API handlers

