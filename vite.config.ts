import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Ensure Vite outputs into the folder Capacitor expects:
  vite: {
    build: {
      outDir: "capacitor-web"
    }
  }
});
