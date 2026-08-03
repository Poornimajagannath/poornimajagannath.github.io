#!/usr/bin/env node
/**
 * Build with Blume, then sync dist/ into the repo root for GitHub Pages
 * (user site served from the branch root).
 *
 * Preserves source/tooling directories that are not part of the static output.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

const preserve = new Set([
  ".git",
  ".github",
  ".gitignore",
  ".blume",
  "blume.config.ts",
  "theme.css",
  "content",
  "pages",
  "public",
  "scripts",
  "posthog",
  "package.json",
  "package-lock.json",
  "node_modules",
  "dist",
  "README.md",
]);

const build = spawnSync("npx", ["blume", "build"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(dist)) {
  console.error("dist/ missing after blume build");
  process.exit(1);
}

for (const name of readdirSync(root)) {
  if (preserve.has(name)) continue;
  // Keep dotfiles that are intentional site markers if present in dist later
  if (name.startsWith(".") && name !== ".nojekyll") continue;
  rmSync(join(root, name), { recursive: true, force: true });
}

for (const name of readdirSync(dist)) {
  const from = join(dist, name);
  const to = join(root, name);
  if (existsSync(to)) {
    rmSync(to, { recursive: true, force: true });
  }
  cpSync(from, to, { recursive: true });
}

// Ensure stats snapshot remains available if Blume didn't emit it
const statsSrc = join(root, "public", "stats");
const statsDest = join(root, "stats");
if (existsSync(statsSrc) && !existsSync(statsDest)) {
  mkdirSync(statsDest, { recursive: true });
  cpSync(statsSrc, statsDest, { recursive: true });
}

console.log("Published dist/ → repo root for GitHub Pages.");
