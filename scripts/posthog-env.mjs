/**
 * Shared PostHog env helpers. Project ID / hosts can live in posthog/project.json;
 * only the personal API key must stay secret.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadProjectConfig() {
  const path = join(root, "posthog/project.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

export function resolvePostHogEnv() {
  const file = loadProjectConfig();
  const host = (
    process.env.POSTHOG_HOST ||
    file.host ||
    "https://us.posthog.com"
  ).replace(/\/$/, "");
  const apiHost = (
    process.env.POSTHOG_API_HOST ||
    file.apiHost ||
    "https://us.i.posthog.com"
  ).replace(/\/$/, "");
  const projectId = String(
    process.env.POSTHOG_PROJECT_ID || file.projectId || ""
  ).trim();
  const personalApiKey = (process.env.POSTHOG_PERSONAL_API_KEY || "").trim();
  const projectApiKey = (process.env.POSTHOG_PROJECT_API_KEY || "").trim();
  return { host, apiHost, projectId, personalApiKey, projectApiKey, root };
}
