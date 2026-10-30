# Listika

The public source for [listika.com](https://listika.com), a static site of curated, source-linked lists. The first list covers upcoming Kochi marathons, but topics are not limited to Kochi or any single location.

## Development

Use Node.js 22, then run `npm ci` and `npm run dev` locally. Run `npm test`, then `npm run build` to produce static files in `dist/`, and `npm run audit:seo` to check generated pages and sitemap. Astro's optional telemetry can be disabled with `ASTRO_TELEMETRY_DISABLED=1`.

List data lives in `src/data/lists/` as one JSON file per list. Each file has a slug, title, description, introduction, last checked date and entries; every entry includes a source URL and a real check date. Optional entry `date` and list `expires` values use `YYYY-MM-DD`. A list with an expiry date requires its IANA `timezone`; a dated entry requires either its own `timezone` or the list's. Builds remove past entries and expired lists based on their local dates. Rebuilds run daily and may be delayed, so removal is not instantaneous. A build never updates editorial check dates or verifies the content; sources need separate human review.

Choose topics that solve a specific reader need with distinctive, practical and verified information. Do not create single-event lists, generic explainers, thin rewrites or overlapping lists merely to reach a target page count. A multi-event calendar can remain useful with one verified entry while it waits for others to be announced.

The optional `collections` metadata can describe related lists, but it does not automatically publish a collection. Create or restore a collection only when there are enough lists to curate usefully and the user decides it is ready. The former Kochi collection URL redirects to the list index.

The Kochi marathon calendar uses optional entry fields `venue`, `distances`, `registrationUrl`, `registrationStatus` (`open`, `closed`, `sold-out`, or `unknown`) and `eventStatus` (`scheduled`, `postponed`, or `cancelled`). Fill these only from checked sources. When an event is postponed without a confirmed new date, remove its old `date` and label it postponed. Keep registration links and statuses accurate, or mark the status unknown.

The Pages workflow builds on pushes, manual dispatch, and daily on a schedule. GitHub Pages uses GitHub Actions as its publishing source; switching back to a branch would trigger an extra Jekyll build against Astro source files. The custom domain is managed in the repository's Pages settings; preserve the configured `listika.com` domain. The existing `CNAME` file belongs to the previous branch-based setup and is not used by the Actions deployment. Do not publish private project research to this repository.

The shared layout includes an AdSense ownership-verification meta tag. Analytics only loads after the visitor grants consent; the AdSense advertising script is currently disabled. Reassess privacy and consent before enabling ads or adding services.

The site publishes crawlable HTML, canonical URLs, a sitemap, a favicon and visible-matching structured data. The SEO audit checks local consistency rather than search indexing or factual accuracy. Keep editorial check dates distinct from page modification dates; do not use rebuild times as `lastmod`.
