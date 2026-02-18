# TailorCraft - Frontend

React Native mobile application for TailorCraft tailoring management system.

## Tech Stack

- React Native 0.81.5
- Expo ~54.0.32
- Expo Router ~6.0.22
- TypeScript 5.9.2
- Zustand 5.0.10

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Run the Development Server

```bash
npm run dev
```

### 4. Run on iOS

```bash
npm run ios
```

### 5. Run on Android

```bash
npm run android
```

### 6. Run on a physical device (iPhone / Android)

- **Same Wi‑Fi**: Phone and Mac must be on the same network. Start the app with `npm run dev`, then scan the QR code with the **Expo Go** app (App Store / Play Store), or open the project in a **development build** if you use one.
- **If the device can’t connect** (e.g. “Couldn’t connect”, “Connection refused”):
  1. Try **tunnel mode** (works across networks and often avoids firewall issues):
     ```bash
     npm run dev:tunnel
     ```
     Then scan the **tunnel** QR code (not the LAN one) in Expo Go or your dev client.
  2. Or use **LAN** explicitly and open the shown URL on the device:
     ```bash
     npm run dev:lan
     ```
  3. Ensure the **backend** is reachable from the device: in `TailorCraft-Backend` run `npm run dev` (it should listen on `0.0.0.0:3001`). The frontend will use your machine’s IP for the API when running on a physical device.
- **Expo Go vs development build**: This project uses `expo-dev-client`. For full compatibility (e.g. custom native modules), build and install a dev client once: `npm run ios` or `npm run android`, then open that app on the device and connect it to Metro (same QR code / URL).

## Project Structure

- `app/` - Expo Router pages and navigation
- `components/` - Reusable React components
- `contexts/` - React Context providers (Auth, Subscription, etc.)
- `lib/` - API client and utilities
- `hooks/` - Custom React hooks
- `constants/` - App constants and design tokens
- `types/` - TypeScript type definitions
- `utils/` - Utility functions

## Available Scripts

- `npm run dev` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run lint` - Run ESLint
- `npm run build:web` - Build for web

## Backend Repository

The backend API is maintained in a separate repository: `TailorCraft-Backend`

## Features

- User authentication (email & phone verification)
- Customer management
- Order creation and tracking
- Measurement management
- Gallery/portfolio
- Statistics dashboard
- Subscription system (Free/Pro plans)
- PDF order generation

## License

Private
