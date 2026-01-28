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
- `npm run build:ios:local` - Run EAS iOS build locally (requires `bundle install` first)

## Local iOS builds (EAS)

EAS local iOS builds require Fastlane in your PATH. This project provides it via Bundler:

1. Install Ruby dependencies: `bundle install`
2. Run the local iOS build: `npm run build:ios:local`

Alternatively, install Fastlane globally and use `eas build --local --platform ios` directly:

- **macOS:** `brew install fastlane`
- **Or:** `gem install fastlane`

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
