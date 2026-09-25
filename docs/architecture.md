# Architecture

How the site is put together, and why the awkward parts are the way they are.

## Stack

| Piece | Choice | Version |
| --- | --- | --- |
| Framework | Astro, static output, zero client JS by default | 7.2.8 |
| Language | TypeScript, `strict` | 6.x |
| Content | Astro content collections + Zod schema | — |
| CMS | Sveltia CMS from the unpkg CDN, GitHub backend, PAT login | latest (verified 0.201.1) |
| Search | Pagefind, run as an npm `postbuild` step | 1.5.2 |
| Comments | Giscus (GitHub Discussions) | — |
| Feed | `@astrojs/rss` | 4.x |
| Sitemap | `@astrojs/sitemap` | 3.x |
| Styling | Hand-written CSS with custom properties | — |
| Hosting | GitHub Pages, deployed by GitHub Actions | — |

Three runtime dependencies, three dev dependencies. No CSS framework — the whole
stylesheet is one file of about 800 lines and nothing is shipped that isn't used.

## Directory map

```
src/
├── assets/images/uploads/   CMS upload target — optimised at build time
├── components/              Presentational, no data fetching
├── consts.ts                Every site-wide setting lives here and nowhere else
├── content.config.ts        Zod schema — the contract with the CMS
├── content/blog/            Posts. Filename = URL slug
├── layouts/BaseLayout.astro Single layout; `narrow` prop switches to reading width
├── lib/
│   ├── posts.ts             Querying, sorting, related, adjacency, reading time
│   └── url.ts               Base-path helpers — read this before adding links
├── pages/                   File-based routes
└── styles/global.css        Design tokens + all styling
public/
├── admin/                   Sveltia CMS (index.html + config.yml)
├── favicon.svg              Theme-aware
├── robots.txt
└── social-card.png          Default Open Graph image, 1200×630
```

`src/consts.ts` is the single edit point for titles, author details, page size, Giscus
IDs, the contact endpoint and social links.

## Routes

| Route | File | Notes |
| --- | --- | --- |
| `/` | `pages/index.astro` | Hero, featured post, latest grid, categories, author blurb |
| `/blog/`, `/blog/2/` … | `pages/blog/[...page].astro` | `paginate()`, 6 per page |
| `/blog/<slug>/` | `pages/blog/[slug].astro` | `slug` is the collection entry `id` |
| `/category/<slug>/`, `…/2/` | `pages/category/[category]/[...page].astro` | |
| `/tag/<slug>/`, `…/2/` | `pages/tag/[tag]/[...page].astro` | |
| `/about/`, `/contact/`, `/search/` | `pages/<name>/[...slug].astro` | **Flag-gated** — see below |
| `/404` | `pages/404.astro` | |
| `/rss.xml` | `pages/rss.xml.ts` | |
| `/sitemap-index.xml` | `@astrojs/sitemap` | `/search/` filtered out — it is `noindex` |

`[slug].astro` and `[...page].astro` share the `blog/` directory. Astro resolves named
dynamic routes ahead of rest parameters, and in a static build every path is enumerated
up front, so the two cannot silently collide.

Post URLs read `https://localseohub.github.io/blog/<slug>/` — the site root
plus the collection's route. Under the previous project site this doubled to
`/blog/blog/<slug>/`, because the repo name and the route were both `blog`; moving to a
user site removed the repetition.

## Optional pages

`/about/`, `/contact/` and `/search/` are gated by `FEATURES` in `src/consts.ts`:

```ts
export const FEATURES = { about: false, search: false, contact: false };
```

Each lives at `pages/<name>/[...slug].astro` with a `getStaticPaths` that returns `[]`
when its flag is off, so the page is **not generated at all** and the URL 404s. Merely
dropping the nav link would leave the page live, shareable and indexable — this does
not.

Every link to them is conditional too: header nav, footer, the home page's hero button
and author-section link, the 404 page's search button, and the About page's contact
sentence. Turning a flag back on restores the page and all of its links with no other
change.

Note the About page carries `data-pagefind-body`, so with it hidden the search index
covers posts only.

## Base paths

This is the part that breaks sites, so it gets an explicit design rather than a
convention.

This is a **user site**, served from the domain root, so `base` is `/`. A root-absolute
`/foo/` link therefore happens to work — but that is a property of the current hosting,
not of the code. **Every internal link, asset reference and absolute URL still goes
through [`src/lib/url.ts`](../src/lib/url.ts)**, which exposes three functions:

| Function | Use for | Example |
| --- | --- | --- |
| `withBase(p)` | Paths *you* author | `/about/` → `/about/` here; `/blog/about/` under a base |
| `absFromBuiltPath(p, site)` | Paths *Astro* produced — they already carry the base | `Astro.url.pathname`, `ImageMetadata.src`, `paginate()` URLs |
| `absUrl(p, site)` | Full absolute URL from a path you author | canonical, Open Graph, RSS, JSON-LD |

That discipline is why moving this site from a project site (`localseohub.github.io/blog/`,
`base: '/blog/'`) to this user site was a config change and nothing else. Had paths been
hardcoded, the move would have been a hunt through every template.

There are deliberately two absolute-URL functions instead of one clever one. An earlier
version tried to detect "does this path already start with the base?" and got it wrong
precisely because, under the old `/blog/` base, a `/blog/` route made `/blog/my-post/`
ambiguous. Two shipped bugs came from that guess — pagination emitting
`/blog/blog/blog/2/`, and post canonicals dropping a segment. Naming the two cases
removes the ambiguity, and keeps working at any base.

**`paginate()` URLs already include the base.** Passing them through `withBase()` doubles
it. `Pagination.astro` takes them raw.

To re-check after any change, build and confirm this prints nothing:

```bash
npm run build
grep -rhoE 'https?://[^"< ]+' dist --include=*.html | grep -v 'localseohub.github.io' | sort -u
```

The full audit — every internal link, `srcset` entry and in-page anchor resolved against
the built output — currently passes at 704 references, 0 broken.

## Content pipeline

`content.config.ts` uses the glob loader over `src/content/blog` and types
`featured_image` as `z.union([image(), z.string().url()])` — an upload or a remote URL.
The entry `id` is derived from the filename and becomes the URL slug.

Draft filtering happens once, in `getPosts()`:

```ts
getCollection('blog', ({ data }) => (import.meta.env.PROD ? data.draft !== true : true))
```

`import.meta.env.PROD` is true during `astro build` and false under `astro dev`. Every
route and the feed call `getPosts()`, so nothing has to remember to filter.

## Images

`image()` resolves paths **relative to the Markdown file**, which is why frontmatter
stores `../../assets/images/uploads/…` rather than a tidy absolute path.

The CMS is configured to produce exactly that. In `public/admin/config.yml` the blog
collection sets **both**:

```yaml
media_folder: ../../assets/images/uploads
public_folder: ../../assets/images/uploads
```

Collection-level relative paths in Sveltia are resolved against the collection's
`folder` (`src/content/blog`), so uploads land in `src/assets/images/uploads/` and the
*same* relative string is written into the frontmatter. `media_folder` decides where the
file goes; `public_folder` decides what gets written into the post.

If posts ever move, both values move with them.

`featured_image` is typed `z.union([image(), z.string().url()])`, so a post may use an
upload *or* a remote URL. `src/components/FeaturedImage.astro` is the single place that
knows the difference: remote sources get `inferSize` so Astro fetches them at build time
for their dimensions, and `image.remotePatterns` authorises optimising them. The result
is that a pasted URL is downloaded, resized and re-served from this origin — including
in the `og:image` tag — so both routes end up optimised and neither costs the reader a
third-party request.

The fallback approach — `public/images/uploads/` with a base-aware helper — was **not**
needed. The relative-path resolution works, and it is the better option because
`public/` images are never optimised.

## Location maps

`map_embed` is an optional per-post field holding a Google Maps embed snippet. The
pasted HTML is never rendered: `src/lib/maps.ts` extracts the `src`, rejects anything
that is not an https URL, and `LocationMap.astro` builds a fresh iframe from it. That
keeps author-supplied markup out of the page and lets the site override Google's
hardcoded `600×450` with a frame that fills the column — 16:9 above 40rem, 4:3 below.

The wrapper carries a fixed `aspect-ratio`, so the lazily-loaded iframe reserves its
space and cannot shift the page when it arrives. This is the only third-party embed on
the site, and only on posts that opt into it.

## Search

Pagefind indexes the built HTML, so it runs as an npm `postbuild` script rather than an
Astro integration:

```json
"build": "astro build",
"postbuild": "pagefind --site dist"
```

Using the npm lifecycle hook matters: `withastro/action` runs `npm run build`, so the
index is produced inside CI and ships in the deployed artifact without the workflow
needing a separate step.

Only elements marked `data-pagefind-body` are indexed — the post `<article>` and the
About page — so navigation chrome does not pollute results.

One base-path wrinkle: Pagefind indexes `dist/`, which *is* the deploy root, so its
result URLs start at `/`. `src/pages/search.astro` passes `bundlePath` and a
`processResult` hook that puts the base back on the front. Verified live: searching
returns `/blog/…` links.

Search cannot work under `npm run dev` — there is no index. The page detects the missing
bundle and shows an explanatory note instead of failing silently.

## Theme

CSS custom properties, three states:

1. No `data-theme` attribute → `prefers-color-scheme` decides.
2. `data-theme="dark"` / `"light"` → explicit choice wins in both directions.
3. Choice persisted in `localStorage`.

The bootstrap script is inlined in `<head>` before any painted markup, so a stored
preference applies before first paint — no flash. Both it and the toggle are wrapped in
`try/catch` so a browser with storage blocked still renders correctly, it just does not
remember.

Shiki emits both light and dark code themes as CSS variables; `global.css` picks the
matching one so code blocks follow the toggle rather than the OS.

## Client JavaScript

The entire budget, in inline scripts with nothing hydrated:

| Script | Where | Size |
| --- | --- | --- |
| Theme bootstrap | every page, in `<head>` | ~10 lines |
| Theme toggle | every page | ~15 lines |
| Copy-link button | post pages | ~20 lines |
| Pagefind UI loader | `/search/` only | ~30 lines |
| Giscus | post pages, `loading="lazy"` | third-party, deferred |

No framework runtime, no analytics, no web fonts, no cookie banner.

## SEO

`BaseHead.astro` emits a unique title and description, a base-aware canonical, Open
Graph and Twitter card tags, and — on post pages only — JSON-LD `BlogPosting`. Paginated
pages past the first are `noindex, follow`.

`robots.txt` sits at the domain root and is therefore **authoritative** — this is a
user site, so crawlers read it. (On a project site it would live under the repo
sub-path, where crawlers ignore it.)

## Accessibility

Semantic landmarks, a skip link, visible focus rings, labelled navigation, `aria-current`
on the active nav item, real alt text (decorative images take `alt=""`), a
`prefers-reduced-motion` block, and `role="status"` for the copy-link confirmation.
Verified at 375 px with no horizontal overflow; wide tables scroll inside themselves
rather than pushing the page sideways.
