# PostHog report for this site

You do **not** need a paid plan. PostHog’s free cloud project is enough.

## 3-minute setup (no local keys)

### 1. Create a free PostHog account

1. Open [https://us.posthog.com/signup](https://us.posthog.com/signup) (use EU if you prefer: [https://eu.posthog.com/signup](https://eu.posthog.com/signup)).
2. Sign up with Google/GitHub/email — free tier is fine.
3. Create a project (any name, e.g. `personal site`).

### 2. Copy three values

| What | Where in PostHog | Looks like |
| --- | --- | --- |
| **Project API key** | Project settings → Project API key | `phc_…` |
| **Project ID** | Project settings → Project ID (number in the URL `/project/12345`) | `12345` |
| **Personal API key** | Account settings → Personal API keys → Create → enable `dashboard:write`, `insight:write`, `web_analytics:read`, `query:read` | `phx_…` |

### 3. Paste them into GitHub secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- `POSTHOG_PROJECT_API_KEY` = `phc_…`
- `POSTHOG_PROJECT_ID` = `12345`
- `POSTHOG_PERSONAL_API_KEY` = `phx_…`

### 4. Run the Action once

Repo → **Actions** → **PostHog weekly report** → **Run workflow**.

That Action will:

1. Turn on pageview capture on the site
2. Create your PostHog dashboard
3. Fill `/stats` with the latest numbers

Then open:

- Site snapshot: `https://poornimajagannath.github.io/stats/`
- Live charts: the dashboard URL printed in the Action log (also saved in `posthog/dashboard-meta.json`)

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
