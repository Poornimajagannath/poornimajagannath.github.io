# PostHog report for this site

You do **not** need a paid plan. PostHog’s free cloud project is enough.

## Status

Configured:

- Project API key → `assets/posthog-config.js` (pageview capture)
- Project ID `529079` → `posthog/project.json`
- Dashboard → https://us.posthog.com/project/529079/dashboard/1907384
- Snapshot page → `/stats` (`stats/stats-data.json`)

### Get the report by email

**Easiest — Web analytics weekly digest (built into PostHog):**

1. Open [Notification settings](https://us.posthog.com/settings/user-notifications)
2. Turn on **Web analytics weekly digest**
3. Select project `529079` if asked

PostHog emails a Monday summary (visitors, pageviews, top pages/sources).

**Dashboard charts by email:**

1. Open [Personal site stats](https://us.posthog.com/project/529079/dashboard/1907384)
2. Click **Subscribe** → **Email** → weekly (e.g. Monday)
3. Use your address and save  
   Optional: **Test delivery** to get one immediately

Or, with a personal API key that includes `subscription:write`:

```bash
export POSTHOG_PERSONAL_API_KEY=phx_...
npm run posthog:email
```

### Optional: weekly auto-refresh of `/stats`

Add GitHub secret `POSTHOG_PERSONAL_API_KEY`, then the
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

PostHog is wired natively in `blume.config.ts` (`analytics.posthog`).
After `npm run publish:site`, production HTML includes the PostHog snippet automatically — you usually do **not** need `npm run posthog:inject`.

Keep `/stats`, `/scripts`, and `/posthog` in the published repo.
