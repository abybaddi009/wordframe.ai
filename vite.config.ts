import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    fs: {
      allow: ['..']
    },
    hmr: {
      port: 3001
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    rollupOptions: {
      external: ["sharp"]
    }
  },
  assetsInclude: ["**/*.onnx", "**/*.wasm"]
});
