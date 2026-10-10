import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: [
        "brand/symbol-mini.png",
        "brand/favicon-32.png",
        "brand/apple-touch-icon.png",
      ],
      manifest: {
        id: "/",
        name: "Zentro",
        short_name: "Zentro",
        lang: "es",
        start_url: "/",
        scope: "/",
        description: "Tu día a día, ahorro, inversión y deudas.",
        display: "standalone",
        theme_color: "#eee3fa",
        background_color: "#fff8ed",
        icons: [
          {
            src: "/brand/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/brand/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/swagger(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { proxy: { "/api": "http://127.0.0.1:5080" } },
  preview: { proxy: { "/api": "http://127.0.0.1:5080" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { charts: ["recharts"] },
      },
    },
  },
});
