# AGENTS.md

## Cursor Cloud specific instructions

This repo is a personal static website built with [Blume](https://useblume.dev/) 1.3 (an Astro-based static site generator). Source lives in `content/` (MDX articles), `pages/`, `blume.config.ts`, and `theme.css`. Standard commands are in `package.json` and `README.md`.

### Node version
- The project requires Node.js **>=22.19.0** (see `package.json` `engines`). The VM's default `/exec-daemon/node` is older (22.14.x), so the correct version is installed via `nvm` and made to win via a `PATH` prepend added to `~/.bashrc`. Use a login shell (`bash -l`) so `node --version` reports 22.19+. If you ever see engine errors, run `nvm use default` or confirm `which node` points at the nvm path, not `/exec-daemon/node`.

### Running the site
- Dev server: `npm run dev` — serves at `http://localhost:4321/` with hot reload. This is the command to use for development.
- Build: `npm run build` — outputs the static site to `dist/`.
- Preview a built site: `npm run preview`.
- There is no separate lint/test suite; `npm run build` is the effective validation step (it type-checks content routes and generates SEO/LLM artifacts). Core functionality to smoke-test: tab navigation (Home/Writing/Building/Connect), article rendering from `content/`, and the client-side search (Orama).

### PostHog scripts
- The `posthog:*` npm scripts and the `.github/workflows/posthog-report.yml` workflow require PostHog secrets (e.g. `POSTHOG_PERSONAL_API_KEY`). They are not needed to run or develop the site locally; skip them unless specifically working on analytics.
