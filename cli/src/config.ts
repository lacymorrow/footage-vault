import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_PATH = join(homedir(), ".vaultrc");

interface VaultConfig {
  apiUrl?: string;
  apiKey?: string;
}

export function loadConfig(): VaultConfig {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveConfig(config: VaultConfig): void {
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n");
}

export function getApiUrl(override?: string): string {
  const url = override ?? loadConfig().apiUrl;
  if (!url) {
    throw new Error(
      "API URL not set. Run: vault config --api-url <url> --api-key <key>"
    );
  }
  return url.replace(/\/$/, "");
}

export function getApiKey(override?: string): string {
  const key = override ?? loadConfig().apiKey;
  if (!key) {
    throw new Error(
      "API key not set. Run: vault config --api-url <url> --api-key <key>"
    );
  }
  return key;
}
