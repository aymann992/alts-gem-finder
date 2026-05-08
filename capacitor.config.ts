import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.altsgemfinder',
  appName: 'Alts Gem Finder',
  webDir: 'dist',
  server: {
    url: 'https://alts-gem-finder.lovable.app',
    cleartext: false,
  },
};

export default config;
