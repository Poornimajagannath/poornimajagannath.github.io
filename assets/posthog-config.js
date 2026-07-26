/**
 * Public PostHog project key (write-only). Safe to ship in the browser.
 *
 * 1. Create a project at https://us.posthog.com (or EU)
 * 2. Project settings → Project API key (starts with phc_)
 * 3. Paste it below and redeploy
 *
 * For Blume rebuilds, also set analytics.posthog in blume.config.ts so the
 * next publish keeps tracking without this loader.
 */
window.__POSTHOG_CONFIG__ = {
  key: "",
  host: "https://us.i.posthog.com",
};
