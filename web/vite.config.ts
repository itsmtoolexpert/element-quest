import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// In dev (docker-compose.dev.yml) the API runs in the "api" container;
// outside Docker, set API_URL=http://localhost:8000.
const apiUrl = process.env.API_URL ?? "http://api:8000";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We register the service worker ourselves, only where the browser allows it (HTTPS or localhost).
      injectRegister: null,
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Element Quest",
        short_name: "Elements",
        description: "Explore, practice and master the periodic table.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0F1128",
        theme_color: "#181A36",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Reference data is the same for everyone: keep a copy so Explore still works when the laptop is asleep.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /^\/api\/(elements|families|collections|materials)(\/|$)/.test(url.pathname),
            handler: "NetworkFirst",
            options: { cacheName: "eq-reference", networkTimeoutSeconds: 4, expiration: { maxEntries: 300 } },
          },
          {
            // Who's signed in, so the app can open (with a "can't reach" banner) while the laptop sleeps.
            urlPattern: ({ url }) => url.pathname === "/api/auth/me",
            handler: "NetworkFirst",
            options: { cacheName: "eq-session", networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: apiUrl, changeOrigin: false } },
  },
});
