#!/usr/bin/env node
/**
 * Creates a PostHog dashboard + insights for personal site stats.
 *
 * Required env:
 *   POSTHOG_PERSONAL_API_KEY  Personal API key (Bearer), with dashboard:write + insight:write
 *   POSTHOG_PROJECT_ID        Numeric project id
 *
 * Optional:
 *   POSTHOG_HOST              Default https://us.posthog.com (use https://eu.posthog.com for EU)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const host = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(
  /\/$/,
  ""
);
const projectId = process.env.POSTHOG_PROJECT_ID;
const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

if (!apiKey || !projectId) {
  console.error(
    "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID.\n" +
      "Create a personal API key in PostHog → Settings → Personal API keys\n" +
      "with scopes: dashboard:write, insight:write, project:read"
  );
  process.exit(1);
}

const spec = JSON.parse(
  readFileSync(join(root, "posthog/dashboard-insights.json"), "utf8")
);

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = typeof data === "object" ? JSON.stringify(data) : text;
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }
  return data;
}

const dashboard = await api(`/api/projects/${projectId}/dashboards/`, {
  method: "POST",
  body: {
    name: spec.dashboard.name,
    description: spec.dashboard.description,
    pinned: spec.dashboard.pinned ?? true,
    tags: spec.dashboard.tags ?? [],
  },
});

console.log(`Created dashboard #${dashboard.id}: ${dashboard.name}`);

const createdInsights = [];
for (const insight of spec.insights) {
  const created = await api(`/api/projects/${projectId}/insights/`, {
    method: "POST",
    body: {
      name: insight.name,
      description: insight.description,
      query: insight.query,
      saved: true,
      dashboards: [dashboard.id],
      tags: ["personal-site"],
    },
  });
  createdInsights.push({
    id: created.id,
    short_id: created.short_id,
    name: created.name,
    url: `${host}/project/${projectId}/insights/${created.short_id}`,
  });
  console.log(`  + insight: ${created.name}`);
}

const dashboardUrl = `${host}/project/${projectId}/dashboard/${dashboard.id}`;
const meta = {
  generatedAt: new Date().toISOString(),
  host,
  projectId: Number(projectId),
  dashboardId: dashboard.id,
  dashboardUrl,
  insights: createdInsights,
};

mkdirSync(join(root, "posthog"), { recursive: true });
writeFileSync(
  join(root, "posthog/dashboard-meta.json"),
  JSON.stringify(meta, null, 2) + "\n"
);

console.log(`\nOpen your report: ${dashboardUrl}`);
console.log("Saved metadata to posthog/dashboard-meta.json");
