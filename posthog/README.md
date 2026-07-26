# PostHog report for this site

You do **not** need a paid plan. PostHog’s free cloud project is enough.

## Status

Configured:

- Project API key → `assets/posthog-config.js` (pageview capture)
- Project ID `529079` → `posthog/project.json`
- Dashboard → https://us.posthog.com/project/529079/dashboard/1907384
- Snapshot page → `/stats` (`stats/stats-data.json`)

### Optional: weekly auto-refresh

Add GitHub secret `POSTHOG_PERSONAL_API_KEY` (`phx_…`), then the
**PostHog weekly report** Action can refresh `/stats` every Monday.

Open:

- Site snapshot: `https://poornimajagannath.github.io/stats/`
- Dashboard: [Personal site stats](https://us.posthog.com/project/529079/dashboard/1907384)

## Optional (local)

```bash
export POSTHOG_PROJECT_API_KEY=phc_...
export POSTHOG_PERSONAL_API_KEY=phx_...
export POSTHOG_PROJECT_ID=12345

npm run posthog:config
npm run posthog:dashboard
npm run posthog:report
```

## Blume rebuilds

If you rebuild from Blume source later:

```ts
analytics: {
  posthog: {
    key: "phc_...",
    host: "https://us.i.posthog.com",
  },
}
```

Keep `/stats`, `/scripts`, and `/posthog` in the published repo. Re-run
`npm run posthog:inject` if HTML is regenerated without Blume analytics.
