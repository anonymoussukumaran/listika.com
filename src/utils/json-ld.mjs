/** Serialize JSON-LD safely into an HTML script element. */
export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
