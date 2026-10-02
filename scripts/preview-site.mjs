#!/usr/bin/env node
/**
 * Production build of the GitHub Pages site, then `blume preview`.
 * e2e starts this and substitutes the allocated port into PORT.
 */
import { spawn } from "node:child_process";

const port = process.env.PORT;
if (!port || port === "0") {
  console.error("PORT must be the port allocated for this preview");
  process.exit(1);
}

const children = new Set();

function stop(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: "inherit" });
    children.add(child);
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`npx ${args.join(" ")} exited ${code ?? signal}`));
    });
  });
}

try {
  await run(["blume", "build"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop(1);
}

const preview = spawn(
  "npx",
  ["blume", "preview", "--host", "127.0.0.1", "--port", port],
  { stdio: "inherit" },
);
children.add(preview);
preview.on("error", (error) => {
  console.error(error);
  stop(1);
});
preview.on("exit", (code, signal) => {
  children.delete(preview);
  stop(code === 0 || signal === "SIGTERM" ? 0 : (code ?? 1));
});
