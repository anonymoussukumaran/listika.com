export interface Entry {
  name: string;
  description: string;
  source: string;
  checked: string;
  details?: string;
  address?: string;
  addressSource?: string;
  mapUrl?: string;
  date?: string;
  timezone?: string;
  venue?: string;
  distances?: string[];
  registrationUrl?: string;
  registrationStatus?: 'open' | 'closed' | 'sold-out' | 'unknown';
  eventStatus?: 'scheduled' | 'postponed' | 'cancelled';
}
export interface List {
  slug: string;
  title: string;
  description: string;
  intro: string;
  checked: string;
  entries: Entry[];
  related?: string[];
  collections?: string[];
  expires?: string;
  timezone?: string;
}
const source = import.meta.glob('./lists/*.json', { eager: true, import: 'default' });
function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function isUrl(value: unknown): value is string {
  if (!isNonEmpty(value)) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
function isTimezone(value: unknown): value is string {
  if (!isNonEmpty(value)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}
function validate(value: unknown, file: string): List {
  if (!value || typeof value !== 'object') throw new Error(`${file}: list must be an object`);
  const list = value as Partial<List>;
  if (!isNonEmpty(list.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(list.slug) ||
      !isNonEmpty(list.title) || !isNonEmpty(list.description) || !isNonEmpty(list.intro) ||
      !isDate(list.checked) || !Array.isArray(list.entries)) throw new Error(`${file}: invalid list fields`);
  if (list.related !== undefined && (!Array.isArray(list.related) || !list.related.every(isNonEmpty))) throw new Error(`${file}: invalid related slugs`);
  if (list.collections !== undefined && (!Array.isArray(list.collections) || !list.collections.every((slug) => isNonEmpty(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))) throw new Error(`${file}: invalid collection slugs`);
  if (list.expires !== undefined && !isDate(list.expires)) throw new Error(`${file}: invalid expiry date`);
  if (list.timezone !== undefined && !isTimezone(list.timezone)) throw new Error(`${file}: invalid timezone`);
  if (list.expires && !list.timezone) throw new Error(`${file}: expiring list needs a timezone`);
  list.entries.forEach((entry, i) => {
    if (!entry || !isNonEmpty(entry.name) || !isNonEmpty(entry.description) || !isUrl(entry.source) || !isDate(entry.checked) || (entry.details !== undefined && !isNonEmpty(entry.details)) || (entry.date !== undefined && !isDate(entry.date))) throw new Error(`${file}: invalid entry ${i + 1}`);
    if (entry.timezone !== undefined && !isTimezone(entry.timezone)) throw new Error(`${file}: invalid entry timezone ${i + 1}`);
    if (entry.date && !entry.timezone && !list.timezone) throw new Error(`${file}: dated entry ${i + 1} needs a timezone`);
    if (entry.venue !== undefined && !isNonEmpty(entry.venue)) throw new Error(`${file}: invalid entry venue ${i + 1}`);
    if (entry.address !== undefined && !isNonEmpty(entry.address)) throw new Error(`${file}: invalid entry address ${i + 1}`);
    if (entry.addressSource !== undefined && !isUrl(entry.addressSource)) throw new Error(`${file}: invalid entry address source ${i + 1}`);
    if (entry.mapUrl !== undefined && !isUrl(entry.mapUrl)) throw new Error(`${file}: invalid entry map URL ${i + 1}`);
    if (entry.distances !== undefined && (!Array.isArray(entry.distances) || !entry.distances.length || !entry.distances.every(isNonEmpty))) throw new Error(`${file}: invalid entry distances ${i + 1}`);
    if (entry.registrationUrl !== undefined && !isUrl(entry.registrationUrl)) throw new Error(`${file}: invalid registration URL ${i + 1}`);
    if (entry.registrationStatus !== undefined && !['open', 'closed', 'sold-out', 'unknown'].includes(entry.registrationStatus)) throw new Error(`${file}: invalid registration status ${i + 1}`);
    if (entry.eventStatus !== undefined && !['scheduled', 'postponed', 'cancelled'].includes(entry.eventStatus)) throw new Error(`${file}: invalid event status ${i + 1}`);
  });
  return list as List;
}
function todayIn(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export const lists: List[] = Object.entries(source).map(([file, data]) => validate(data, file))
  .filter((list) => !list.expires || list.expires >= todayIn(list.timezone!))
  .map((list) => ({ ...list, entries: list.entries.filter((entry) => !entry.date || entry.date >= todayIn((entry.timezone ?? list.timezone)!)) }))
  .sort((a, b) => a.title.localeCompare(b.title));
if (new Set(lists.map((list) => list.slug)).size !== lists.length) throw new Error('Duplicate list slug');
export const getList = (slug: string) => lists.find((list) => list.slug === slug);
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
