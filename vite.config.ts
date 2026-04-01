import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-electron-plugin";
import { customStart, loadViteEnv } from "vite-electron-plugin/plugin";
import pkg from "./package.json";
import legacy from "@vitejs/plugin-legacy";
import { createRequire } from "node:module";
import {
  applyHostToProcessEnv,
  hostImUrls,
  resolveBaseHost,
} from "./vite.host-env";
const require = createRequire(import.meta.url);
// import visualizer from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  rmSync("dist-electron", { recursive: true, force: true });

  const loaded = loadEnv(mode, process.cwd(), "");
  const baseHost = resolveBaseHost(loaded.VITE_BASE_HOST, command);
  const hostEnv = hostImUrls(baseHost);
  applyHostToProcessEnv(hostEnv);

  const sourcemap = command === "serve" || !!process.env.VSCODE_DEBUG;

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
    plugins: [
      react(),
      electron({
        include: ["electron"],
        transformOptions: {
          sourcemap,
        },
        plugins: [
          ...(!!process.env.VSCODE_DEBUG
            ? [
              // Will start Electron via VSCode Debug
              customStart(() =>
                console.log(
                    /* For `.vscode/.debug.script.mjs` */ "[startup] Electron App",
                ),
              ),
            ]
            : []),
          // Allow use `import.meta.env.VITE_SOME_KEY` in Electron-Main
          loadViteEnv(),
        ],
      }),
      // legacy({
      //   targets: ["defaults", "not IE 11"],
      // }),
      // visualizer({ open: true }),
    ],
    server: !!process.env.VSCODE_DEBUG
      ? (() => {
        const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
        return {
          host: url.hostname,
          port: +url.port,
        };
      })()
      : undefined,
    clearScreen: false,
    define: {
      "import.meta.env.VITE_BASE_HOST": JSON.stringify(hostEnv.VITE_BASE_HOST),
      "import.meta.env.VITE_WS_URL": JSON.stringify(hostEnv.VITE_WS_URL),
      "import.meta.env.VITE_API_URL": JSON.stringify(hostEnv.VITE_API_URL),
      "import.meta.env.VITE_CHAT_URL": JSON.stringify(hostEnv.VITE_CHAT_URL),
    },
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
        },
      },
    },
  };
});
