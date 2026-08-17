# Plan: Fix Android Fullscreen and Capacitor Shell Issues

The user reported that while the Android build was successful, features have changed and fullscreen video mode is broken in the installed app. This is likely because the Capacitor app is now a thin shell pointing to the remote URL, which changes how certain browser-specific features like Fullscreen API and Orientation Lock behave, and potentially causes "changed features" if the remote URL state differs or if local persistence is lost.

## User Review Required

> [!IMPORTANT]
> The app is currently configured to load `https://ytclone2.lovable.app` directly. Any changes made to the local code will not be visible in the APK until the app is **Published**. To see your latest changes in the app, please Publish after I complete these fixes.

## Proposed Changes

### 1. Fix Fullscreen Video on Android
- Update `GlobalVideoPlayer.tsx` to handle fullscreen explicitly for Android.
- The `requestFullscreen` API can be finicky on Android WebView. I will add a fallback that expands the element to fill the fixed viewport if the native API fails.
- Ensure `orientation.lock` is handled robustly, as some mobile browsers/WebViews require user interaction or have strict requirements.

### 2. Improve Capacitor Shell Configuration
- Update `capacitor.config.ts` to improve integration with the remote URL.
- Add `allowNavigation` to ensure all YouTube-related domains are handled correctly within the app shell.
- Set `backgroundColor` to `#000000` to prevent white flashes during load/fullscreen.

### 3. Native Android Adjustments
- Update `AndroidManifest.xml` to include `hardwareAccelerated="true"` if not already present (it usually is, but good to verify for video performance).
- Ensure the activity handles orientation changes without restarting (already present in `configChanges`, but I'll double-check).

### 4. Technical Details
- **Fullscreen Fallback**: If `requestFullscreen` fails, I'll use a `fixed inset-0 z-[2147483647]` CSS approach as a "virtual fullscreen" which is more reliable in some WebView versions.
- **Orientation**: Capacitor has a `ScreenOrientation` plugin, but since we are using a remote URL, I'll stick to the web `screen.orientation` API first as it's already implemented, but make it more robust.

## Verification Plan

### Automated Tests
- I will use Playwright to simulate mobile viewport and verify the `toggleFullscreen` logic doesn't crash and correctly applies CSS classes.
- I will verify `capacitor.config.ts` syntax.

### Manual Verification
- The user will need to:
  1. Approve this plan.
  2. Wait for me to apply fixes.
  3. **Publish** the app to `ytclone2.lovable.app`.
  4. Trigger a new GitHub Action build to generate a new APK.
  5. Test the new APK.
