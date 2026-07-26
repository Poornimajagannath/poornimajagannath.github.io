# PostHog report for this site

This folder and `/stats` give you a simple way to see traffic for
[poornimajagannath.github.io](https://poornimajagannath.github.io).

## What you get

1. **Browser capture** via `/assets/posthog-loader.js` (pageviews + pageleave)
2. **PostHog dashboard** created by `scripts/create-posthog-dashboard.mjs`
   (pageviews, visitors, top pages, referrers, feedback, sessions)
3. **Local snapshot** at `/stats/` refreshed by
   `scripts/generate-posthog-report.mjs` or the weekly GitHub Action

## One-time setup

1. Create a PostHog project ([US](https://us.posthog.com) or [EU](https://eu.posthog.com)).
2. Copy the **project API key** (`phc_…`) into `/assets/posthog-config.js`.
3. Create a **personal API key** with scopes:
   - `dashboard:write`
   - `insight:write`
   - `web_analytics:read`
   - `query:read`
4. Run:

```bash
export POSTHOG_PERSONAL_API_KEY=phx_...
export POSTHOG_PROJECT_ID=12345
# export POSTHOG_HOST=https://eu.posthog.com   # only for EU cloud

node scripts/create-posthog-dashboard.mjs
node scripts/generate-posthog-report.mjs
```

5. Optional GitHub secrets for the weekly Action:
   - `POSTHOG_PERSONAL_API_KEY`
   - `POSTHOG_PROJECT_ID`
   - optional repo variable `POSTHOG_HOST`

## Blume rebuilds

If you rebuild the site from Blume source later, prefer first-party config:

```ts
analytics: {
  posthog: {
    key: "phc_...",
    host: "https://us.i.posthog.com",
  },
}
```

Keep `/stats`, `/scripts`, and `/posthog` in the published repo so the report
page and automation still work after a republish. Re-run
`node scripts/inject-posthog.mjs` if HTML is regenerated without Blume analytics.
