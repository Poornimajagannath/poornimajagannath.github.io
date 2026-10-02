import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

// Locator assertions only, so CI can run without a model API key.
export default {
  targets: [
    {
      name: "web",
      engine: web(),
      app: {
        url: process.env.APP_URL ?? "http://127.0.0.1:0",
        command: {
          executable: "node",
          args: ["scripts/preview-site.mjs"],
          env: { PORT: "{port}" },
          log: ".e2e/logs/app.log",
          startupTimeout: 180_000,
        },
      },
    },
  ],
} satisfies E2EConfig;
