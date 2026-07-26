#!/usr/bin/env node
/**
 * Pulls PostHog web analytics into stats/stats-data.json for /stats.
 *
 * Required env:
 *   POSTHOG_PERSONAL_API_KEY
 *   POSTHOG_PROJECT_ID
 *
 * Optional:
 *   POSTHOG_HOST          Default https://us.posthog.com
 *   POSTHOG_LOOKBACK_DAYS Default 7
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolvePostHogEnv } from "./posthog-env.mjs";

const { host, projectId, personalApiKey: apiKey, root } =
  resolvePostHogEnv();
const lookbackDays = Number(process.env.POSTHOG_LOOKBACK_DAYS || 7);

if (!apiKey || !projectId) {
  console.error(
    "Missing POSTHOG_PERSONAL_API_KEY" +
      (projectId ? "" : " or POSTHOG_PROJECT_ID") +
      ".\n" +
      "Needed scopes: web_analytics:read, query:read (or insight:read)\n" +
      "Project ID can also live in posthog/project.json."
  );
  process.exit(1);
}

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

function num(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    if ("current" in value) return num(value.current);
    return null;
  }
  if (typeof value === "string" && /[hms]/.test(value)) {
    return parseDurationSeconds(value);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDurationSeconds(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text || text === "0") return 0;
  const asNumber = Number(text);
  if (Number.isFinite(asNumber)) return asNumber;
  let total = 0;
  const re = /(\d+(?:\.\d+)?)\s*(h|m|s)/gi;
  let match;
  let found = false;
  while ((match = re.exec(text))) {
    found = true;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "h") total += amount * 3600;
    else if (unit === "m") total += amount * 60;
    else total += amount;
  }
  return found ? total : null;
}

function metricParts(digest, key) {
  const raw = digest?.[key] ?? digest?.metrics?.[key] ?? digest?.summary?.[key];
  if (raw == null) return { current: null, previous: null, change: null };
  if (typeof raw === "object" && ("current" in raw || "previous" in raw)) {
    const current =
      key.includes("duration") || key.includes("avg_session")
        ? parseDurationSeconds(raw.current)
        : num(raw.current);
    const previous =
      key.includes("duration") || key.includes("avg_session")
        ? parseDurationSeconds(raw.previous)
        : num(raw.previous);
    let change = num(raw.change);
    if (change == null && current != null && previous != null && previous !== 0) {
      change = (current - previous) / previous;
    }
    return { current, previous, change };
  }
  return { current: num(raw), previous: null, change: null };
}

function normalizeList(items, nameKeys, countKeys) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((item) => {
    const name =
      nameKeys.map((k) => item?.[k]).find((v) => v != null && v !== "") ??
      "Unknown";
    const count =
      countKeys.map((k) => num(item?.[k])).find((v) => v != null) ?? 0;
    return { name: String(name), count };
  });
}

const digestPath = `/api/projects/${projectId}/web_analytics/weekly_digest/?lookback_days=${lookbackDays}`;
let digest;
try {
  digest = await api(digestPath);
} catch (err) {
  console.warn(`weekly_digest failed (${err.message}); trying recap…`);
  digest = await api(
    `/api/projects/${projectId}/web_analytics/recap/?lookback_days=${lookbackDays}`
  );
}

const visitors = metricParts(digest, "visitors");
const pageviews = metricParts(digest, "pageviews");
const sessions = metricParts(digest, "sessions");
const bounceRate = metricParts(digest, "bounce_rate");
const avgDuration = metricParts(digest, "avg_session_duration");

const topPages = normalizeList(
  digest.top_pages || digest.topPages || digest.pages || [],
  ["url", "pathname", "path", "name", "page"],
  ["count", "pageviews", "views", "visitors"]
);
const topSources = normalizeList(
  digest.top_sources || digest.topSources || digest.sources || [],
  ["source", "referrer", "channel", "name", "domain"],
  ["count", "visitors", "sessions", "pageviews"]
);

// Feedback breakdown via HogQL (Blume PageFeedback → event "feedback")
let feedback = { helpful: 0, notHelpful: 0, total: 0 };
try {
  const feedbackQuery = await api(`/api/projects/${projectId}/query/`, {
    method: "POST",
    body: {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT
            properties.helpful AS helpful,
            count() AS total
          FROM events
          WHERE event = 'feedback'
            AND timestamp >= now() - INTERVAL ${lookbackDays} DAY
          GROUP BY helpful
          ORDER BY total DESC
        `,
      },
    },
  });
  const rows = feedbackQuery?.results || feedbackQuery?.result || [];
  for (const row of rows) {
    const label = String(row[0] ?? "").toLowerCase();
    const total = num(row[1]) || 0;
    feedback.total += total;
    if (["yes", "true", "1", "helpful"].includes(label)) feedback.helpful += total;
    else if (["no", "false", "0", "not-helpful", "unhelpful"].includes(label))
      feedback.notHelpful += total;
  }
} catch (err) {
  console.warn(`Feedback query skipped: ${err.message}`);
}

let dashboardUrl = null;
const metaPath = join(root, "posthog/dashboard-meta.json");
if (existsSync(metaPath)) {
  try {
    dashboardUrl = JSON.parse(readFileSync(metaPath, "utf8")).dashboardUrl;
  } catch {
    /* ignore */
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  host,
  projectId: Number(projectId),
  dashboardUrl:
    dashboardUrl || digest.dashboard_url || `${host}/project/${projectId}`,
  lookbackDays,
  setupComplete: true,
  summary: {
    visitors: visitors.current,
    visitorsChange: visitors.change,
    pageviews: pageviews.current,
    pageviewsChange: pageviews.change,
    sessions: sessions.current,
    sessionsChange: sessions.change,
    bounceRate: bounceRate.current,
    bounceRateChange: bounceRate.change,
    avgSessionDurationSeconds: avgDuration.current,
    avgSessionDurationChange: avgDuration.change,
  },
  topPages,
  topSources,
  feedback,
  notes: [],
  rawDigestKeys: Object.keys(digest || {}),
};

writeFileSync(
  join(root, "stats/stats-data.json"),
  JSON.stringify(report, null, 2) + "\n"
);

console.log(`Wrote stats/stats-data.json`);
console.log(
  `Visitors: ${report.summary.visitors} · Pageviews: ${report.summary.pageviews} · Sessions: ${report.summary.sessions}`
);
