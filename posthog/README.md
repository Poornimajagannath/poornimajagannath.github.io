# PostHog report for this site

You do **not** need a paid plan. PostHog’s free cloud project is enough.

## Status

Already saved in this repo:

- Project API key → `assets/posthog-config.js` (pageview capture)
- Project ID `529079` → `posthog/project.json`

Still needed (one secret):

- **Personal API key** (`phx_…`) to create the dashboard and refresh `/stats`

### Finish setup

1. In PostHog: **Settings → Personal API keys → Create**
2. Enable scopes: `dashboard:write`, `insight:write`, `web_analytics:read`, `query:read`
3. Add GitHub secret `POSTHOG_PERSONAL_API_KEY` = that `phx_…` value  
   (Repo → Settings → Secrets and variables → Actions)
4. Run **Actions → PostHog weekly report → Run workflow** once

That Action will create your PostHog dashboard and fill `/stats`.

Then open:

- Site snapshot: `https://poornimajagannath.github.io/stats/`
- Project: [https://us.posthog.com/project/529079](https://us.posthog.com/project/529079)

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
