# Android APK Build via Capacitor

This plan explains how to generate an Android APK. Since this is a React/Web project (TanStack Start), we use **Capacitor** to wrap the web app into a native Android container.

**Flutter** is not applicable here because the app is already built using React and TypeScript. Rewriting the entire application in Dart/Flutter would be a complete rebuild from scratch.

## User Review Required

> [!IMPORTANT]
> Generating the final `.apk` file requires **Android Studio** and **Java (JDK)** installed on your local computer. I will set up the configuration so you can easily build it on your machine.

## Proposed Changes

### Build Configuration
- Install `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`.
- Create `capacitor.config.ts` pointing to the web build output (`.output/public`).
- Update `package.json` with mobile build scripts.

### Android Integration
- Initialize the Android project structure.
- Map PWA icons to Android resources.

### Local Build Instructions
- Provide a guide to run the local compilation once the project is synced to your computer.

## Technical Details

### 1. Dependencies
```bash
bun add @capacitor/core @capacitor/android
bun add -D @capacitor/cli
```

### 2. Capacitor Config (`capacitor.config.ts`)
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faketube.app',
  appName: 'YouTube',
  webDir: '.output/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### 3. Build Workflow
1. `npm run build` (Generates the web files).
2. `npx cap sync` (Copies web files to Android).
3. `npx cap open android` (Opens Android Studio to build the APK).
