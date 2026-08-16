# Android APK Build Implementation

This plan outlines the steps to enable a native Android APK build using Capacitor. Since direct APK compilation requires Android Studio on a local machine, this process sets up the project structure so the user can run the final build locally.

## User Review Required

> [!IMPORTANT]
> APK generation requires **Android Studio** and **Java (JDK)** installed on your local computer. I will configure the project so you can simply run `npx cap build android` on your machine to get the APK.

## Proposed Changes

### Build Configuration
- Add `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android` dependencies.
- Initialize Capacitor configuration (`capacitor.config.ts`).
- Configure the `webDir` to match TanStack Start's build output (`.output/public`).

### Android Integration
- Add the Android platform folder (`npx cap add android`).
- Ensure the PWA icons and metadata are mapped to native Android resources.
- Update `package.json` with convenience scripts for mobile building.

### Documentation
- Provide a clear, step-by-step guide on how to perform the local build.

## Technical Details

### 1. Dependency Addition
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
1. Run `bun run build` to generate the production web build.
2. Run `npx cap sync` to copy web assets to the Android project.
3. Open in Android Studio via `npx cap open android`.
4. Build the signed APK/Bundle in Android Studio.
