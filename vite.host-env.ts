import os from "node:os";

function isIPv4(net: os.NetworkInterfaceInfo): boolean {
  return net.family === "IPv4" || net.family === 4;
}

/** 取本机可用于局域网访问的 IPv4（WSL 多为 eth0；无则回退 127.0.0.1） */
export function detectLanIPv4(): string {
  const ifaces = os.networkInterfaces();
  const candidates: { name: string; address: string; priority: number }[] = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] ?? []) {
      if (!isIPv4(net) || net.internal) continue;
      let priority = 100;
      if (/^eth\d$/i.test(name) || /^ens\d+/i.test(name) || /^enp/i.test(name))
        priority = 0;
      else if (/^wlan/i.test(name) || /^wl/i.test(name)) priority = 1;
      else if (/^Ethernet/i.test(name)) priority = 0;
      candidates.push({ name, address: net.address, priority });
    }
  }
  candidates.sort(
    (a, b) => a.priority - b.priority || a.name.localeCompare(b.name),
  );
  return candidates[0]?.address ?? "127.0.0.1";
}

/**
 * .env 中 VITE_BASE_HOST：
 * - `auto`：开发 serve 时用 detectLanIPv4()；生产 build 固定为 127.0.0.1
 * - 其它值：原样使用（如 127.0.0.1、指定 IP/域名）
 */
export function resolveBaseHost(
  viteBaseHost: string | undefined,
  command: "build" | "serve",
): string {
  const raw = (viteBaseHost ?? "127.0.0.1").trim();
  if (raw === "auto") {
    return command === "serve" ? detectLanIPv4() : "127.0.0.1";
  }
  return raw;
}

export function hostImUrls(baseHost: string) {
  return {
    VITE_BASE_HOST: baseHost,
    VITE_WS_URL: `ws://${baseHost}:10001`,
    VITE_API_URL: `http://${baseHost}:10002`,
    VITE_CHAT_URL: `http://${baseHost}:10008`,
  } as const;
}

export function applyHostToProcessEnv(
  env: ReturnType<typeof hostImUrls>,
): void {
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }
}
