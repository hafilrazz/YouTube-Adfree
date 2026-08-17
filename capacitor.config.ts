import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faketube.app',
  appName: 'YouTube Premium',
  webDir: 'capacitor-web',
  server: {
    androidScheme: 'https',
    url: 'https://ytclone2.lovable.app',
    cleartext: false,
    allowNavigation: [
      '*.youtube.com',
      '*.googlevideo.com',
      '*.ytimg.com',
      'ytclone2.lovable.app'
    ]
  },
  backgroundColor: '#000000'
};

export default config;