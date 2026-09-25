# Deployment

**Live:** <https://localseohub.github.io/>
**Repository:** `LocalSEOHUB/LocalSEOHUB.github.io` — GitHub Pages **user** site, served from the domain root

## How it works

Every push to `main` triggers [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):

```
push to main
  └─ build   actions/checkout@v7 → withastro/action@v6
     │         runs `npm ci` then `npm run build`
     │         `postbuild` runs Pagefind over dist/
     │         uploads dist/ as the github-pages artifact
     └─ deploy actions/deploy-pages@v5
```

Saving a post in the CMS **is** a push to `main`, so publishing and deploying are the
same action. Roughly a minute end to end.

The workflow requests only `contents: read`, `pages: write`, `id-token: write`, and uses
`concurrency: pages` with `cancel-in-progress: false` so a deploy is never interrupted
half-published.

### Why the npm `postbuild` hook matters

`withastro/action` runs the package manager's `build` script, not `astro build`
directly. Because Pagefind is wired as `postbuild`, npm runs it automatically and the
search index ends up inside the uploaded artifact. No extra workflow step, and no way to
deploy a site whose search index is stale.

## Required Pages configuration

**Settings → Pages → Build and deployment → Source must be `GitHub Actions`.**

✅ Set correctly since 2026-08-27 — verify with:

```bash
gh api repos/LocalSEOHUB/LocalSEOHUB.github.io/pages --jq '.build_type'   # expect: workflow
```

If it is ever switched back to *Deploy from a branch*, **two** pipelines fire on every
push and the second one fails:

```
✓ Deploy to GitHub Pages      (this workflow)   — success
✗ pages build and deployment  (legacy Jekyll)   — failure
```

Jekyll tries to parse `.astro` files as YAML front matter and dies:

```
ERROR: YOUR SITE COULD NOT BE BUILT:
Invalid YAML front matter in /github/workspace/src/pages/about.astro
```

This is exactly the Jekyll limitation the stack was chosen to avoid, and it is why the
project uses the Astro Actions workflow rather than native Pages/Jekyll — category and
tag archives and pagination need a real build step, not a plugin whitelist.

The failure is benign in itself — a failed Jekyll build never replaces the Actions
deployment — but it produces a red run and an email on every push, and the
configuration is wrong.

> **Never add a `.nojekyll` file to work around this.** Under branch mode it makes Pages
> skip Jekyll and publish the **raw repository root** — `src/`, `package.json`,
> `node_modules` exclusions and all — instead of the built site. That is strictly worse
> than the current failure. Change the source setting instead.

## Verifying a deployment

```bash
gh run list --repo LocalSEOHUB/LocalSEOHUB.github.io --limit 5
gh run view <run-id> --repo LocalSEOHUB/LocalSEOHUB.github.io --log-failed
```

A quick smoke test against the live site — this is the check that actually matters,
because it tests what visitors get rather than what the local build produced:

```bash
B=https://localseohub.github.io
for p in "" "blog/" "about/" "contact/" "search/" "admin/" "rss.xml" "sitemap-index.xml" "pagefind/pagefind-ui.js"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L "$B/$p")  /$p"
done
```

All should return `200`. Then confirm nothing leaked:

```bash
# drafts must be absent
curl -s -o /dev/null -w '%{http_code}\n' -L "$B/blog/draft-not-for-production/"   # expect 404

# no root-absolute internal references
curl -s -L "$B/" | grep -ohE 'https?://[^"]+' | grep -v 'localseohub' | sort -u
```

Not yet verified against a live site — this is a brand-new fork and GitHub Pages has not
been enabled yet. Run the checks above once Pages is on and a first deploy has gone out.

## Rollback

A failed build deploys nothing, so the previous version stays live — the build is the
safety net. To undo a bad *successful* deploy, revert the commit and push:

```bash
git revert <sha>
git push
```

Re-running an older workflow run also works from the Actions tab, and is faster if the
problem is content rather than code.

## Local equivalents

```bash
npm run build     # what CI runs, including Pagefind
npm run preview   # serves dist/ — the only faithful local test of search and base paths
```

`npm run dev` does **not** exercise search (no index), the `/admin/` directory index, or
draft exclusion. Use `preview` before assuming a deploy will behave.

## Access

Pushing requires write access to `LocalSEOHUB/LocalSEOHUB.github.io`. Changing repository
settings — Pages source, Discussions, collaborators — requires **admin**. The `LocalSEOHUB`
account owns this repository and has full admin access.

```bash
gh api repos/LocalSEOHUB/LocalSEOHUB.github.io --jq '.permissions'
```
