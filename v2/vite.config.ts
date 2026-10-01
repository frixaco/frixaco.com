import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        // Publish the résumé under a neutral name instead of its source file name.
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith(".pdf"))
            ? "assets/resume-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
