import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faketube.app',
  appName: 'YouTube Premium',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https'
  }
};

export default config;