import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.altsgemfinder',
  appName: 'Alts Gem Finder',
  webDir: 'dist',
  server: {
    url: 'https://5578663c-6563-4688-8644-190db073dcb4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
