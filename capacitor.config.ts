import type { CapacitorConfig } from '@capacitor/cli';

// Pure client SPA — the APK loads dist/index.html locally. No server URL,
// so the app works fully offline (data still requires internet for CoinGecko).
const config: CapacitorConfig = {
  appId: 'app.lovable.altsgemfinder',
  appName: 'Alts Gem Finder',
  webDir: 'dist',
};

export default config;
