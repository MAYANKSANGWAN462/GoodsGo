import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Uploads source maps to Sentry after each production build, then deletes
    // the .map files from dist/ so they are never shipped to end users.
    // Only active when SENTRY_AUTH_TOKEN is set — local builds are unaffected.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
  ],

  build: {
    // Source maps are only generated when the Sentry plugin is active so that
    // .map files are never left in dist/ without being uploaded and deleted.
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy all REST API calls — eliminates cross-origin cookie issues
      // in local dev (frontend on :5173, backend on :5000).
      // cookieDomainRewrite ensures Set-Cookie headers from the backend
      // are scoped to the dev server's domain (localhost) so the browser
      // correctly stores and resends the httpOnly refresh_token cookie.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: { "*": "" },
      },
      // Proxy Socket.io — WebSocket upgrade + polling transport
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
        secure: false,
        cookieDomainRewrite: { "*": "" },
      },
    },
  },
});
