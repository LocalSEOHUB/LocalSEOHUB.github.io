# Security

This is a public repository hosting a static blog. There is no server, no database and
no user data — which removes most of the usual attack surface and concentrates the rest
in one place: **repository write access**.

## Threat model in one paragraph

The published site is static HTML on GitHub Pages. Nothing is computed per request and
no visitor input is stored. The only way to change what visitors see is to change what
is in this repository. So the security of the blog is exactly the security of the
GitHub account and tokens that can write to it.

## The CMS token

Sveltia CMS at `/admin` authenticates with a GitHub **fine-grained Personal Access
Token** that you paste at sign-in. There is no OAuth backend, no serverless function and
no client secret anywhere in this repository — deliberately, because a client secret in
a static site is not a secret.

Two token types work, with different blast radius:

- **Fine-grained**, scoped to this repository only, **Contents: read and write**. The
  tighter option. It can only be issued by the account that *owns* the repository —
  collaborator access does not qualify.
- **Classic** with the `public_repo` scope. Works from any account with push access, but
  grants write to **every public repository that account can push to**, not just this
  one. Use it only when the fine-grained route is unavailable, and prefer `public_repo`
  over full `repo`.

Either way the token:

- does **not** need Pull requests access (`publish_mode: simple` commits to `main`);
- should have an expiry set;
- **carries write access to the whole repository, not just posts** — including the
  GitHub Actions workflow file, which runs on every push.

Treat it like a password. Do not commit it, do not paste it into anything other than the
Sveltia sign-in prompt, and revoke it at
<https://github.com/settings/personal-access-tokens> the moment you suspect exposure.

The token is held in browser storage on the machine where you signed in. Signing out
from the CMS clears it. Revoking it on GitHub invalidates it everywhere.

## No permission model

There are no CMS roles. Anyone who can push to this repository can publish, edit or
delete any post, and can also modify the deploy workflow. Access control is GitHub's
collaborator list and nothing else. Keep that list short.

## Deletion is not erasure

Deleting a post through the CMS creates a commit that removes the file. **Every previous
version remains in git history and on GitHub, indefinitely and publicly.**

Anything genuinely sensitive that reaches a commit must be treated as disclosed.
Deleting it afterwards does not undo that — it has to be rotated, revoked or otherwise
invalidated. Purging history requires a force-push and coordination, and does not remove
data already fetched or cached by others.

Drafts are the exception worth knowing: `draft: true` posts are excluded from the built
site entirely, but their source **is** committed and is public in the repository. A
draft is unpublished, not private.

## What ships publicly

The deployed site contains only the built output. There are no analytics, no tracking
scripts, no web fonts, no cookie banner, and no third-party requests except:

- `unpkg.com` — the Sveltia CMS bundle, loaded only on `/admin`;
- `giscus.app` — the comment widget, loaded lazily on post pages once configured;
- `google.com` — only on posts that fill in the **Location map** field, and only when
  the reader scrolls far enough for the lazily-loaded iframe to fetch;
- whichever form service you configure for `/contact/`, on submit only.

Comments are GitHub Discussions. Commenters are identified by their GitHub account and
their comments are public, hosted by GitHub, and governed by GitHub's own policies.

## Dependencies

Three runtime dependencies and three dev dependencies, all first-party Astro or Pagefind
packages. Keep them current:

```bash
npm outdated
npm audit
```

The Sveltia CMS bundle is loaded from a CDN at the unpinned `latest` URL, so fixes
arrive without a redeploy — at the cost of a breaking upstream change being able to
affect `/admin` without a commit here. `public/admin/index.html` carries a commented
pinned alternative if you would rather trade one risk for the other.

## Reporting a vulnerability

If you find a security problem, please **do not open a public issue**. Email the address
on the [contact page](https://localseohub.github.io/contact/) with enough detail to
reproduce it, and allow a reasonable window before disclosure.

This is a personal blog maintained by one person, not a funded project — there is no
bounty and response times are best-effort. Reports are still very welcome.
