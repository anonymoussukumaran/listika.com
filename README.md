# Listika

The public source for [listika.com](https://listika.com), a static site of curated, source-linked lists, starting with Kochi.

## Development

Use Node.js 22, then run `npm ci` and `npm run dev` locally. Run `npm run build` to produce static files in `dist/`. Astro's optional telemetry can be disabled with `ASTRO_TELEMETRY_DISABLED=1`.

List data lives in `src/data/lists/` as one JSON file per list. Each file has a slug, title, description, introduction, last checked date and entries; every entry includes a source URL and a real check date. Optional entry `date` and list `expires` values use `YYYY-MM-DD` in the relevant local date. The build removes dated entries and time-limited lists after those dates in the Asia/Kolkata timezone. A build never updates editorial check dates or verifies the content; sources need separate human review.

Choose topics that solve a specific reader need with distinctive, practical and verified information. Do not create single-event lists, generic explainers, thin rewrites or overlapping lists merely to reach a target page count. A multi-event calendar can remain useful with one verified entry while it waits for others to be announced.

The Pages workflow builds on pushes, manual dispatch, and daily on a schedule. GitHub Pages must use GitHub Actions as its source for this workflow. The custom domain is managed in the repository's Pages settings; preserve the configured `listika.com` domain. The existing `CNAME` file belongs to the previous branch-based setup and is not used by the Actions deployment. Do not publish private project research to this repository.

The common page layout includes the site's AdSense code. Do not introduce ad units, analytics or consent claims without the corresponding account configuration and privacy review.
