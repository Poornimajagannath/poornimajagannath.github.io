/**
 * Public PostHog project key (write-only). Safe to ship in the browser.
 *
 * No key yet? Create a free account at https://us.posthog.com/signup
 * then either:
 *   - add GitHub secrets and run the "PostHog weekly report" Action, or
 *   - run: POSTHOG_PROJECT_API_KEY=phc_... npm run posthog:config
 */
window.__POSTHOG_CONFIG__ = {
  key: "",
  host: "https://us.i.posthog.com",
};
