# YouTube Premium (FakeTube)

A high-fidelity YouTube clone built with React 19 and TanStack Start. This app provides a privacy-focused, ad-free experience with advanced features like background music playback, persistent mini-player, and native Android support.

## Key Features

- **YouTube Experience**: Replicates the modern "Premium" UI with light/dark modes.
- **Privacy First**: Keyless search and streaming using public proxy fallbacks (InnerTube, Piped, Invidious).
- **Premium Music**: Background audio playback with lock-screen controls (MediaSession API).
- **Persistent Mini-Player**: Draggable floating video player that stays active while browsing.
- **Multi-Profile System**: Support for up to 3 local profiles with separate history and preferences.
- **TV Support**: Spatial navigation for Smart TVs and TV boxes.
- **PWA**: Installable as a progressive web app on mobile and desktop.
- **Android APK**: Automated build pipeline via GitHub Actions.

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```sh
npm install
npm run dev
```

## Android Build

This project is configured with **Capacitor** for Android support.

### GitHub Actions (Automatic)
Creating a new Release on GitHub will automatically trigger the `Build Android APK` workflow, which generates and attaches an unsigned release APK to your release.

### Local Build
To build locally, you need Android Studio installed:
1. Build the web app: `npm run build`
2. Sync Capacitor: `npx cap sync android`
3. Open in Android Studio: `npx cap open android`

## Tech Stack

- **Framework**: TanStack Start (React 19)
- **Styling**: Tailwind CSS v4
- **Routing**: TanStack Router
- **Data Fetching**: TanStack Query
- **Mobile/Native**: Capacitor
- **Icons**: Lucide React
- **Icons/UI**: Shadcn UI (Radix)

---

Built with [Lovable](https://lovable.dev).
