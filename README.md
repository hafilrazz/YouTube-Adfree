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

## Android App Generation

This project uses **Capacitor** to transform the web application into a native Android app.

### GitHub Actions (No Android Studio Required)
This is the recommended way if you don't have Android Studio:
1. Push your code to a GitHub repository.
2. Create a new **Release** on GitHub.
3. The `Build Android APK` workflow will automatically generate the file.
4. Download the `app-release-unsigned.apk` from the release assets.

For a detailed guide on cloud builds, see `CLOUD_BUILD_GUIDE.md`.

### Local Generation
If you want to build the app on your own computer:

#### Prerequisites
- **Android Studio**: Installed and configured with Android SDK.
- **Java 17**: Required for Gradle builds.
- **Node.js**: Version 20 or higher.

#### Steps
1. **Prepare the web build**:
   ```bash
   npm run build
   ```
2. **Sync with Android project**:
   ```bash
   npx cap sync android
   ```
3. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```
4. **Generate APK**:
   In Android Studio, go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   The generated file will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.

For a more detailed guide including signing for the Play Store, see `apk-build-guide.md`.

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
