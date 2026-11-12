import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      "startups.itelfoundation.in",
      "www.startups.itelfoundation.in",
    ],
    proxy: {
      "/itelinc": {
        target: "http://10.20.35.21:8086",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
