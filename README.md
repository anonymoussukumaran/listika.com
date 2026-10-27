# Listika

The public source for [listika.com](https://listika.com), a static site of curated, source-linked lists. The first list covers upcoming Kochi marathons, but topics are not limited to Kochi or any single location.

## Development

Use Node.js 22, then run `npm ci` and `npm run dev` locally. Run `npm run build` to produce static files in `dist/`. Astro's optional telemetry can be disabled with `ASTRO_TELEMETRY_DISABLED=1`.

List data lives in `src/data/lists/` as one JSON file per list. Each file has a slug, title, description, introduction, last checked date and entries; every entry includes a source URL and a real check date. Optional entry `date` and list `expires` values use `YYYY-MM-DD`. A list with an expiry date requires its IANA `timezone`; a dated entry requires either its own `timezone` or the list's. Builds remove past entries and expired lists based on their local dates. Rebuilds run daily and may be delayed, so removal is not instantaneous. A build never updates editorial check dates or verifies the content; sources need separate human review.

Choose topics that solve a specific reader need with distinctive, practical and verified information. Do not create single-event lists, generic explainers, thin rewrites or overlapping lists merely to reach a target page count. A multi-event calendar can remain useful with one verified entry while it waits for others to be announced.

Use the optional `collections` array on a list to group related lists for discovery. For example, the Kochi collection links to lists tagged `kochi`; a collection is not itself counted as a list. New collections need their own page and should be created when they help readers find several related lists.

The Pages workflow builds on pushes, manual dispatch, and daily on a schedule. GitHub Pages must use GitHub Actions as its source for this workflow. The custom domain is managed in the repository's Pages settings; preserve the configured `listika.com` domain. The existing `CNAME` file belongs to the previous branch-based setup and is not used by the Actions deployment. Do not publish private project research to this repository.

The common page layout includes the site's AdSense code. Do not introduce ad units, analytics or consent claims without the corresponding account configuration and privacy review.
