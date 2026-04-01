import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import {
  applyHostToProcessEnv,
  hostImUrls,
  resolveBaseHost,
} from "./vite.host-env";

export default defineConfig(({ command, mode }) => {
  const loaded = loadEnv(mode, process.cwd(), "");
  const baseHost = resolveBaseHost(loaded.VITE_BASE_HOST, command);
  const hostEnv = hostImUrls(baseHost);
  applyHostToProcessEnv(hostEnv);

  return {
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    plugins: [react()],
    clearScreen: false,
    define: {
      "import.meta.env.VITE_BASE_HOST": JSON.stringify(hostEnv.VITE_BASE_HOST),
      "import.meta.env.VITE_WS_URL": JSON.stringify(hostEnv.VITE_WS_URL),
      "import.meta.env.VITE_API_URL": JSON.stringify(hostEnv.VITE_API_URL),
      "import.meta.env.VITE_CHAT_URL": JSON.stringify(hostEnv.VITE_CHAT_URL),
    },
  };
});
