# One-time setup

Everything on this page is done once. The site builds and deploys without any of it —
missing pieces degrade gracefully rather than breaking — but each one unlocks something.

Status as of 2026-08-27:

| Step | Status |
| --- | --- |
| Repository created and pushed | ✅ done |
| GitHub Actions workflow deploying | ✅ done |
| Pages source set to GitHub Actions | ✅ done |
| Fine-grained PAT for the CMS | ❌ not created |
| Giscus comments | ❌ not configured |
| Contact form endpoint | ❌ not set |
| Author identity in `src/consts.ts` | ❌ still placeholder text |

---

## 1. Pages source ✅

**Settings → Pages → Build and deployment → Source: `GitHub Actions`**

Done on 2026-08-27. `build_type` reads `workflow`, and a dispatched run now produces a
single green pipeline with no accompanying `pages-build-deployment` job.

It matters because the alternative — *Deploy from a branch* — runs a Jekyll build
alongside the Astro workflow, and Jekyll cannot parse `.astro` files:

```
ERROR: YOUR SITE COULD NOT BE BUILT:
Invalid YAML front matter in /github/workspace/src/pages/about.astro
```

That is the Jekyll limitation this stack was chosen to avoid: category and tag archives
and pagination need a real build step, not a plugin whitelist.

> If this is ever switched back, do **not** reach for a `.nojekyll` file. Under
> branch-source mode it makes Pages skip Jekyll and publish the **raw repository root**
> (`src/`, `package.json`, …) instead of the built site. Changing the source setting is
> the only correct fix.

To confirm at any time:

```bash
gh api repos/LocalSEOHUB/LocalSEOHUB.github.io/pages --jq '.build_type'   # expect: workflow
gh run list --repo LocalSEOHUB/LocalSEOHUB.github.io --limit 3
```

## 2. Access token for the CMS

The CMS signs in with a GitHub Personal Access Token. There is no OAuth backend, no
serverless function and no client secret anywhere in this repository.

Two kinds of token work, and which one you can use depends on **who owns the repo**.

### Fine-grained (tighter — use it if you can)

<https://github.com/settings/personal-access-tokens/new>

| Field | Value |
| --- | --- |
| Resource owner | `LocalSEOHUB` |
| Repository access | **Only select repositories → `localseohub.github.io`** |
| Repository permissions → **Contents** | **Read and write** |
| Repository permissions → Metadata | Read-only (added automatically) |
| Expiration | Set one. 90 days is a reasonable default |

Two defaults catch people out: *Repository access* starts on **Public repositories**,
which is read-only, and *Contents* starts on **No access** — read-only there passes the
login check but makes every save fail.

> **The catch.** A fine-grained token can only be scoped to repositories owned by its
> **resource owner**. Collaborator access does not count: if you are signed in as an
> account that merely *collaborates* on this repo, it will not appear in the list and no
> permission setting will help. Sign in as the owner, or use a classic token below.

### Classic (the fallback that always works)

<https://github.com/settings/tokens> → **Generate new token (classic)** → tick
**`public_repo`** only.

Because this repository is public, `public_repo` is enough — do not grant full `repo`.
This works from any account with push access, regardless of who owns the repo, which is
why it is the reliable option when the fine-grained route refuses.

The trade-off is real: `public_repo` grants write access to **every public repository
you can push to**, not just this one. A fine-grained token scoped to a single repo is
strictly tighter. Prefer fine-grained when the owner account is available to you.

**Pull requests access is not needed either way** — `publish_mode: simple` in
`public/admin/config.yml` commits straight to `main`.

Whichever you use, commits are authored by the account that issued the token.

Then open <https://localseohub.github.io/admin/>, choose **"Sign In Using Access
Token"** and paste it.

> There is no "Sign In with GitHub" button on the login screen. It starts an OAuth flow
> that needs a server to hold a client secret, which a static site cannot have, so it
> hung on "Signing in…" forever. Sveltia offers no config option to disable it, so a
> small fail-open script in `public/admin/index.html` hides it. See
> [troubleshooting.md](troubleshooting.md#cms-sign-in-with-github-hangs-on-signing-in).

**Treat the token like a password.** It can read and write everything in this
repository. Do not paste it anywhere else, do not commit it, and revoke it from the
same settings page the moment you suspect it has leaked. See [SECURITY.md](../SECURITY.md).

## 3. Giscus comments

Comments are GitHub Discussions rendered by [Giscus](https://giscus.app). Until it is
configured, post pages show a one-line notice instead of the widget — nothing breaks.

1. **Settings → General → Features → ✅ Discussions**
2. Open the **Discussions** tab and make sure a category exists. The default expected by
   `src/consts.ts` is **Announcements**; any category works as long as the names match.
3. Install the app at <https://github.com/apps/giscus> and grant it access to
   `LocalSEOHUB/LocalSEOHUB.github.io` **only**.
4. Go to <https://giscus.app>, enter `LocalSEOHUB/LocalSEOHUB.github.io`, pick the category, and choose
   *Discussion title contains page pathname* for the mapping.
5. Copy the generated `data-repo-id` and `data-category-id` into `src/consts.ts`:

```ts
export const GISCUS = {
  repo: 'LocalSEOHUB/LocalSEOHUB.github.io',
  repoId: 'R_kg...',        // ← paste
  category: 'Announcements',
  categoryId: 'DIC_kw...',  // ← paste
  // ...
} as const;
```

Because comments are public Discussions, consider whether
[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) says what you want it to say.

## 4. Contact form endpoint

GitHub Pages serves static files only, so a working form needs a third-party endpoint.
`CONTACT_FORM_ENDPOINT` in `src/consts.ts` is deliberately empty — no endpoint was
invented for you.

Create a form at <https://formspree.io> (or any equivalent), then:

```ts
export const CONTACT_FORM_ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
```

The form markup — including a honeypot field — is already written in
`src/pages/contact.astro` and appears automatically once the value is set. Until then
`/contact/` shows the mailto link instead.

## 5. Author identity

All in [`src/consts.ts`](../src/consts.ts). Nothing else hardcodes these:

```ts
export const SITE_TITLE = 'Field Notes';          // ← yours
export const SITE_DESCRIPTION = '...';            // ← yours
export const AUTHOR_NAME = 'Your Name';           // ← yours
export const AUTHOR_BIO = '...';                  // ← yours
export const AUTHOR_EMAIL = 'you@example.com';    // ← yours
export const SOCIAL_LINKS = [ ... ];              // ← yours
```

Also worth replacing: the About page prose in `src/pages/about.astro`, the three sample
posts in `src/content/blog/`, and `public/social-card.png` (the default Open Graph
image, 1200×630).

## 6. Optional: licensing

No licence file is included, because the choice is yours to make and it is a legally
meaningful one. Without a licence, the content is "all rights reserved" by default.

Blogs commonly split the two: a permissive code licence (MIT) plus a content licence
(e.g. CC BY 4.0) for the posts. If you want that, say so and it can be added.

## 7. Optional: custom domain

A custom domain needs `site` in `astro.config.mjs`, `site_url`/`display_url` in
`public/admin/config.yml`, the `Sitemap:` line in `public/robots.txt`, and a `CNAME`
file in `public/` containing the bare domain. Because this is already a root-served
user site, no base path has to change. See
[architecture.md](architecture.md#base-paths).
