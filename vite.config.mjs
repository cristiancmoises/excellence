import { defineConfig } from "vite";
export default defineConfig({
  server: { proxy: { "/api": "http://127.0.0.1:3210" } },
  build: {
    chunkSizeWarningLimit: 2200,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@fortune-sheet")) return "spreadsheet";
          if (id.includes("exceljs")) return "xlsx";
          if (id.includes("chart.js")) return "charts";
        },
      },
    },
  },
});
