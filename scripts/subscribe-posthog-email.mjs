#!/usr/bin/env node
/**
 * Subscribe an email to the Personal site stats dashboard (weekly Monday).
 *
 * Required env:
 *   POSTHOG_PERSONAL_API_KEY  with subscription:write (+ usually subscription:read)
 * Optional:
 *   POSTHOG_EMAIL             default poornima.jagannath8@gmail.com
 *   POSTHOG_PROJECT_ID        falls back to posthog/project.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolvePostHogEnv } from "./posthog-env.mjs";

const { host, projectId, personalApiKey: apiKey, root } = resolvePostHogEnv();
const email = (
  process.env.POSTHOG_EMAIL || "poornima.jagannath8@gmail.com"
).trim();

if (!apiKey || !projectId) {
  console.error("Missing POSTHOG_PERSONAL_API_KEY or project id.");
  process.exit(1);
}

const metaPath = join(root, "posthog/dashboard-meta.json");
if (!existsSync(metaPath)) {
  console.error("Missing posthog/dashboard-meta.json — run posthog:dashboard first.");
  process.exit(1);
}
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const insightIds = (meta.insights || []).map((i) => i.id).slice(0, 6);
if (!insightIds.length) {
  console.error("No insights recorded on the dashboard.");
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
    throw new Error(
      `${method} ${path} → ${res.status}: ${JSON.stringify(data)}`
    );
  }
  return data;
}

const start = new Date();
// Next Monday 14:00 UTC
const day = start.getUTCDay();
const daysUntilMonday = (8 - day) % 7 || 7;
start.setUTCDate(start.getUTCDate() + daysUntilMonday);
start.setUTCHours(14, 0, 0, 0);

const subscription = await api(`/api/projects/${projectId}/subscriptions/`, {
  method: "POST",
  body: {
    dashboard: meta.dashboardId,
    dashboard_export_insights: insightIds,
    target_type: "email",
    target_value: email,
    frequency: "weekly",
    byweekday: ["monday"],
    start_date: start.toISOString(),
    title: "Personal site stats",
  },
});

meta.emailSubscription = {
  id: subscription.id,
  email,
  frequency: "weekly",
  nextDeliveryDate: subscription.next_delivery_date || null,
  createdAt: new Date().toISOString(),
};
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

console.log(`Subscribed ${email} to dashboard #${meta.dashboardId}`);
console.log(`Subscription id: ${subscription.id}`);
if (subscription.next_delivery_date) {
  console.log(`Next delivery: ${subscription.next_delivery_date}`);
}

try {
  await api(`/api/projects/${projectId}/subscriptions/${subscription.id}/test-delivery/`, {
    method: "POST",
    body: {},
  });
  console.log("Sent a test delivery email.");
} catch (err) {
  console.warn(`Test delivery skipped: ${err.message}`);
}
