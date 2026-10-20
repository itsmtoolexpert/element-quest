import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev (docker-compose.dev.yml) the API runs in the "api" container;
// outside Docker, set API_URL=http://localhost:8000.
const apiUrl = process.env.API_URL ?? "http://api:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: apiUrl, changeOrigin: false } },
  },
});
