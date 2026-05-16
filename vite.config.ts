// @lovable.dev/vite-tanstack-config wraps tanstackStart + react + tailwind + ts paths.
// We enable SPA mode so the build emits a real dist/index.html with no SSR runtime —
// required so Capacitor can bundle the app as a fully offline-capable APK.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: { enabled: true },
  },
});
