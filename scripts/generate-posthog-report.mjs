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
const lookbackDays = Number(process.env.POSTHOG_LOOKBACK_DAYS || 7);

if (!apiKey || !projectId) {
  console.error(
    "Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID.\n" +
      "Needed scopes: web_analytics:read, query:read (or insight:read)"
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
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function change(current, previous) {
  const c = num(current);
  const p = num(previous);
  if (c == null || p == null || p === 0) return null;
  return (c - p) / p;
}

function pickMetric(digest, keys) {
  for (const key of keys) {
    if (digest?.[key] != null) return digest[key];
    if (digest?.metrics?.[key] != null) return digest.metrics[key];
    if (digest?.summary?.[key] != null) return digest.summary[key];
  }
  return null;
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

const visitors = pickMetric(digest, [
  "visitors",
  "unique_visitors",
  "uniqueVisitors",
]);
const visitorsPrev = pickMetric(digest, [
  "visitors_previous",
  "previous_visitors",
  "unique_visitors_previous",
]);
const pageviews = pickMetric(digest, ["pageviews", "page_views", "views"]);
const pageviewsPrev = pickMetric(digest, [
  "pageviews_previous",
  "previous_pageviews",
  "page_views_previous",
]);
const sessions = pickMetric(digest, ["sessions", "unique_sessions"]);
const sessionsPrev = pickMetric(digest, [
  "sessions_previous",
  "previous_sessions",
]);
const bounceRate = pickMetric(digest, ["bounce_rate", "bounceRate"]);
const bounceRatePrev = pickMetric(digest, [
  "bounce_rate_previous",
  "previous_bounce_rate",
]);
const avgDuration = pickMetric(digest, [
  "average_session_duration",
  "avg_session_duration",
  "avgSessionDuration",
  "average_session_duration_seconds",
]);
const avgDurationPrev = pickMetric(digest, [
  "average_session_duration_previous",
  "previous_average_session_duration",
  "avg_session_duration_previous",
]);

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
  dashboardUrl,
  lookbackDays,
  setupComplete: true,
  summary: {
    visitors: num(visitors),
    visitorsChange: change(visitors, visitorsPrev),
    pageviews: num(pageviews),
    pageviewsChange: change(pageviews, pageviewsPrev),
    sessions: num(sessions),
    sessionsChange: change(sessions, sessionsPrev),
    bounceRate: num(bounceRate),
    bounceRateChange: change(bounceRate, bounceRatePrev),
    avgSessionDurationSeconds: num(avgDuration),
    avgSessionDurationChange: change(avgDuration, avgDurationPrev),
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
