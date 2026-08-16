# GitHub Actions APK Build Plan

This plan sets up a GitHub Actions workflow to automatically build and release an Android APK whenever you create a new release on GitHub.

## Proposed Changes

### GitHub Actions Workflow
- Create a new workflow file `.github/workflows/android-build.yml`.
- The workflow will:
  - Trigger on every `release` (specifically when a release is created).
  - Use an Ubuntu runner.
  - Set up Node.js and Java (JDK 17).
  - Install dependencies.
  - Run the production build of the web app (`npm run build`).
  - Sync Capacitor with the Android project (`npx cap sync`).
  - Build the Android APK using Gradle (`./gradlew assembleRelease`).
  - Upload the generated APK as a release asset.

### Project Configuration
- Ensure the `webDir` in `capacitor.config.ts` correctly points to the build output.

## Technical Details

### Workflow Steps
1. **Checkout**: Pull the code.
2. **Setup Node**: Install Node.js.
3. **Setup Java**: Install JDK 17 required for Android builds.
4. **Install Dependencies**: `npm install`.
5. **Web Build**: `npm run build`.
6. **Capacitor Sync**: `npx cap sync android`.
7. **Gradle Build**: `cd android && ./gradlew assembleRelease`.
8. **Release Asset**: Use `softprops/action-gh-release` to attach the APK to the release.

### Requirements
- You will need to push this code to a GitHub repository.
- To create a signed APK, you would eventually need to add `ANDROID_KEYSTORE` secrets to your GitHub repo, but this initial setup will generate a standard (un-signed) release APK which can be tested.

## Note on Signing
The generated APK will be an unsigned release APK. For Play Store distribution, a signing step is required, but for direct installation on most devices, this is a sufficient starting point.
