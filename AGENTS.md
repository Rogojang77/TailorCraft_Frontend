# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TailorCraft is a **React Native / Expo** frontend-only app for tailoring business management. The backend lives in a separate repository (`TailorCraft-Backend`) and is not included here.

### Running the app

- **Dev server (web):** `npm run dev` starts Expo on port 8081. Add `--web` flag or press `w` to open in browser.
- **Lint:** `npm run lint` (runs `expo lint`). On first run, Expo auto-installs ESLint + config.
- **Web build:** `npm run build:web` exports a static web bundle to `dist/`.

### Environment

- Copy `.env.example` to `.env` before running. The only required variable is `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3001`).
- The `.npmrc` sets `legacy-peer-deps=true`; always use `npm install` (not `yarn` or `pnpm`).

### Gotchas

- The backend is in a separate repo. Without it running on port 3001, all API calls (login, signup, etc.) will fail with a network error. The frontend UI still renders and is fully testable on web.
- `expo lint` auto-installs ESLint dependencies on first invocation if not present; this is expected and not an error.
- The `postinstall` script runs `patch-package` but there are currently no patch files in `patches/`; this is normal.
- For web testing in Cloud VMs, use `npx expo start --web --port 8081` to start the dev server directly in web mode.
