# poornimajagannath.github.io

Personal site built with [Blume](https://useblume.dev/) 1.3.

## Develop

Requires Node.js 22.19+.

```bash
npm install
npm run dev
```

## Publish to GitHub Pages

Builds with Blume and syncs `dist/` to the repo root (the user Pages site):

```bash
npm run publish:site
git add -A && git commit -m "Rebuild site" && git push
```

Source lives in `content/`, `pages/`, `blume.config.ts`, and `theme.css`.

## Test

End-to-end tests use [e2e](https://e2e.tester.army/docs/quickstart) and locator assertions, so they do not need a model API key:

```bash
npm run test:e2e
```
