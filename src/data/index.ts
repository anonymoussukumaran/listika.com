export interface Entry {
  name: string;
  description: string;
  source: string;
  checked: string;
  details?: string;
  date?: string;
}
export interface List {
  slug: string;
  title: string;
  description: string;
  intro: string;
  checked: string;
  entries: Entry[];
  related?: string[];
  expires?: string;
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
function validate(value: unknown, file: string): List {
  if (!value || typeof value !== 'object') throw new Error(`${file}: list must be an object`);
  const list = value as Partial<List>;
  if (!isNonEmpty(list.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(list.slug) ||
      !isNonEmpty(list.title) || !isNonEmpty(list.description) || !isNonEmpty(list.intro) ||
      !isDate(list.checked) || !Array.isArray(list.entries)) throw new Error(`${file}: invalid list fields`);
  if (list.related !== undefined && (!Array.isArray(list.related) || !list.related.every(isNonEmpty))) throw new Error(`${file}: invalid related slugs`);
  if (list.expires !== undefined && !isDate(list.expires)) throw new Error(`${file}: invalid expiry date`);
  list.entries.forEach((entry, i) => {
    if (!entry || !isNonEmpty(entry.name) || !isNonEmpty(entry.description) || !isUrl(entry.source) || !isDate(entry.checked) || (entry.details !== undefined && !isNonEmpty(entry.details)) || (entry.date !== undefined && !isDate(entry.date))) throw new Error(`${file}: invalid entry ${i + 1}`);
  });
  return list as List;
}
const localParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const localValue = (type: Intl.DateTimeFormatPartTypes) => localParts.find((part) => part.type === type)?.value ?? '';
export const todayInKolkata = `${localValue('year')}-${localValue('month')}-${localValue('day')}`;
export const lists: List[] = Object.entries(source).map(([file, data]) => validate(data, file))
  .filter((list) => !list.expires || list.expires >= todayInKolkata)
  .map((list) => ({ ...list, entries: list.entries.filter((entry) => !entry.date || entry.date >= todayInKolkata) }))
  .sort((a, b) => a.title.localeCompare(b.title));
if (new Set(lists.map((list) => list.slug)).size !== lists.length) throw new Error('Duplicate list slug');
export const getList = (slug: string) => lists.find((list) => list.slug === slug);
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
