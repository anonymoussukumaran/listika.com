// Audit generated static pages; run after `npm run build`.
// This checks consistency and syntax, not factual accuracy, crawlability in
// production, search-engine eligibility, indexing, or ranking.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'dist';
const site = new URL('https://listika.com/');
const errors = [];
const read = (file) => readFileSync(file, 'utf8');
const check = (condition, message) => { if (!condition) errors.push(message); };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|apos|#39|#(\d+)|#x([\da-f]+));/gi, (all, dec, hex) => {
  if (dec) return String.fromCodePoint(Number(dec));
  if (hex) return String.fromCodePoint(parseInt(hex, 16));
  return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" })[all.toLowerCase()] ?? all;
});
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? decode(match[1] ?? match[2]) : undefined;
};
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
function urlFor(file) {
  const rel = relative(root, file).replaceAll('\\', '/');
  return new URL(rel === 'index.html' ? '/' : '/' + rel.replace(/index\.html$/, ''), site);
}
function targetFile(url) {
  const pathname = decodeURIComponent(url.pathname);
  const path = join(root, pathname.replace(/^\/+/, ''));
  return pathname.endsWith('/') || (existsSync(path) && statSync(path).isDirectory()) ? join(path, 'index.html') : path;
}
function metadataTags(html, tag) { return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map((m) => m[0]); }
function isNoIndex(html) {
  return metadataTags(html, 'meta').some((tag) => /^(robots|googlebot)$/i.test(attr(tag, 'name') ?? '') && /(?:^|[,\s])noindex(?:$|[,\s])/i.test(attr(tag, 'content') ?? ''));
}
function isRedirect(html) { return metadataTags(html, 'meta').some((tag) => /^refresh$/i.test(attr(tag, 'http-equiv') ?? '')); }
function validateDate(value, label) {
  const format = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const day = typeof value === 'string' ? value.slice(0, 10) : '';
  const calendar = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00Z`) : new Date(NaN);
  const valid = typeof value === 'string' && format.test(value) && !Number.isNaN(calendar.valueOf()) && calendar.toISOString().slice(0, 10) === day && !Number.isNaN(Date.parse(value));
  check(valid, `${label}: invalid date ${String(value)}`);
  // Allow one day for date-only metadata authored in a timezone ahead of UTC.
  if (valid) check(Date.parse(value) <= Date.now() + 86400000, `${label}: date is in the future`);
}
function checkJsonDates(value, label) {
  if (Array.isArray(value)) return value.forEach((item) => checkJsonDates(item, label));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (['datePublished', 'dateModified'].includes(key)) validateDate(item, `${label} ${key}`);
    checkJsonDates(item, label);
  }
}
if (!existsSync(join(root, 'index.html'))) throw new Error('Built pages missing. Run npm run build first.');
const htmlFiles = walk(root).filter((p) => p.endsWith('.html'));
const pages = htmlFiles.map((file) => ({ file, html: read(file), url: urlFor(file) }));
const canonicalSeen = new Set();
const titleSeen = new Set();
const descriptionSeen = new Set();
const indexable = [];

for (const { file, html, url } of pages) {
  const redirect = isRedirect(html);
  const noindex = isNoIndex(html);
  if (redirect) check(noindex, `${file}: redirect should be noindex`);
  if (redirect || noindex) continue;
  indexable.push(url.href);
  const title = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  check(title.length === 1 && !!title[0]?.[1].trim(), `${file}: expected one non-empty title`);
  if (title.length === 1) { const val = decode(title[0][1]).trim(); check(!titleSeen.has(val), `${file}: duplicate title`); titleSeen.add(val); }
  const meta = metadataTags(html, 'meta').filter((tag) => /^description$/i.test(attr(tag, 'name') ?? ''));
  const description = meta.length === 1 ? attr(meta[0], 'content')?.trim() : '';
  check(meta.length === 1 && !!description, `${file}: expected one non-empty description`);
  if (description) { check(!descriptionSeen.has(description), `${file}: duplicate description`); descriptionSeen.add(description); }
  const canonical = metadataTags(html, 'link').filter((tag) => (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const canonicalHref = canonical.length === 1 ? attr(canonical[0], 'href') : '';
  check(canonical.length === 1 && canonicalHref === url.href, `${file}: expected canonical ${url.href}, got ${canonicalHref || '(missing)'}`);
  if (canonicalHref) { check(!canonicalSeen.has(canonicalHref), `${file}: duplicate canonical`); canonicalSeen.add(canonicalHref); }
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)];
  check(headings.length === 1 && !!headings[0][1].replace(/<[^>]*>/g, '').trim(), `${file}: expected one non-empty H1`);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if ((attr(`<script ${match[1]}>`, 'type') ?? '').toLowerCase() !== 'application/ld+json') continue;
    try { checkJsonDates(JSON.parse(match[2]), `${file}: JSON-LD`); } catch (error) { errors.push(`${file}: invalid JSON-LD: ${error.message}`); }
  }
}

// Validate indexable links and fragments against generated files without network access.
for (const { file, html, url } of pages) {
  if (isRedirect(html)) continue;
  for (const tag of metadataTags(html, 'a')) {
    const href = attr(tag, 'href');
    if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    let target;
    try { target = new URL(href, url); } catch { errors.push(`${file}: invalid link ${href}`); continue; }
    if (target.origin !== site.origin) continue;
    const targetPath = targetFile(target);
    if (!existsSync(targetPath)) { errors.push(`${file}: missing internal link ${href}`); continue; }
    if (target.hash && targetPath.endsWith('.html')) {
      const fragment = decodeURIComponent(target.hash.slice(1));
      const ids = metadataTags(read(targetPath), '[a-z][a-z0-9-]*').map((item) => attr(item, 'id'));
      check(ids.includes(fragment), `${file}: missing fragment ${href}`);
    }
  }
}

const robots = read(join(root, 'robots.txt'));
check(/user-agent:\s*\*/i.test(robots), 'robots.txt: missing default crawler rule');
check(!/^\s*disallow:\s*\/\s*(?:#.*)?$/im.test(robots), 'robots.txt: blocks all crawling');
check(/^\s*sitemap:\s*https:\/\/listika\.com\/sitemap-index\.xml\s*$/im.test(robots), 'robots.txt: sitemap index missing');
const index = read(join(root, 'sitemap-index.xml'));
const sitemapFiles = [...index.matchAll(/<loc>(.*?)<\/loc>/gi)].map((m) => decode(m[1]));
check(sitemapFiles.length > 0, 'sitemap index is empty');
const sitemapURLs = [];
for (const loc of sitemapFiles) {
  let sitemapURL;
  try { sitemapURL = new URL(loc); } catch { errors.push(`sitemap index: invalid URL ${loc}`); continue; }
  check(sitemapURL.origin === site.origin, `sitemap index: wrong host ${loc}`);
  const local = targetFile(sitemapURL);
  if (!existsSync(local)) { errors.push(`sitemap index: missing ${loc}`); continue; }
  const xml = read(local);
  for (const entry of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const locs = [...entry[1].matchAll(/<loc>(.*?)<\/loc>/gi)];
    if (locs.length !== 1) { errors.push(`${local}: each URL needs one loc`); continue; }
    const value = decode(locs[0][1]);
    sitemapURLs.push(value);
    const date = entry[1].match(/<lastmod>(.*?)<\/lastmod>/i)?.[1];
    if (date) validateDate(date, `${local}: ${value} lastmod`);
  }
}
check(new Set(sitemapURLs).size === sitemapURLs.length, 'sitemap contains duplicate URLs');
for (const url of sitemapURLs) check(indexable.includes(url), `sitemap includes missing, redirect or noindex URL ${url}`);
for (const url of indexable) check(sitemapURLs.includes(url), `indexable page missing from sitemap: ${url}`);
if (errors.length) {
  console.error(`SEO audit failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`SEO audit passed for ${indexable.length} indexable pages, ${sitemapURLs.length} sitemap URLs and their local links.`);
}
