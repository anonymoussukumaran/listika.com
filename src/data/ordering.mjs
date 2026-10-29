/** @typedef {import('./index').Entry} Entry */

/** @param {unknown} value */
const isNonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * @param {unknown} value
 * @param {Entry[]} entries
 * @param {string} file
 */
export function validateOrdering(value, entries, file) {
  if (!value || typeof value !== 'object' || !('method' in value) ||
      !['editorial', 'alphabetical', 'grouped-alphabetical', 'date'].includes(value.method) ||
      !('explanation' in value) || !isNonEmpty(value.explanation)) {
    throw new Error(`${file}: invalid or missing ordering`);
  }
  if (value.method === 'grouped-alphabetical') {
    entries.forEach((entry, index) => {
      if (!isNonEmpty(entry.sortGroup)) throw new Error(`${file}: entry ${index + 1} needs a sort group`);
    });
  }
}

/** @param {Entry[]} entries @param {'editorial'|'alphabetical'|'grouped-alphabetical'|'date'} method */
export function orderEntries(entries, method) {
  // Editorial order is authored. Copy before sorting; JS sort preserves ties.
  if (method === 'editorial') return entries;
  const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
  return [...entries].sort((a, b) => {
    if (method === 'date') {
      if (!a.date) return b.date ? 1 : 0;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    }
    if (method === 'grouped-alphabetical') {
      return a.sortGroup.localeCompare(b.sortGroup, 'en', { sensitivity: 'base', numeric: true }) || byName(a, b);
    }
    return byName(a, b);
  });
}
