#!/usr/bin/env node
/**
 * Injects PostHog config + loader into every HTML page (idempotent).
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snippet = `<!-- posthog -->
<script src="/assets/posthog-config.js"></script>
<script src="/assets/posthog-loader.js"></script>
`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === "stats") continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, "utf8");
  if (html.includes("/assets/posthog-loader.js")) continue;
  if (!html.includes("</body>")) continue;
  html = html.replace("</body>", `${snippet}</body>`);
  writeFileSync(file, html);
  changed += 1;
  console.log(`injected ${relative(root, file)}`);
}
console.log(`Updated ${changed} HTML file(s)`);
