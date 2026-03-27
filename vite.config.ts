import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import oxlint from "vite-plugin-oxlint";

export default defineConfig({
  plugins: [oxlint(), tailwindcss(), react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
