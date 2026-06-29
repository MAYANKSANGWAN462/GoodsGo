import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

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
