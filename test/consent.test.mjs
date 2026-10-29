import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/consent.js', import.meta.url), 'utf8');
const key = 'listika-analytics-choice-v1';
function page({ stored, gpc = false, blocked = false, writeBlocked = false, removeBlocked = false, sessionData, pathname = '/' } = {}) {
  const values = new Map(stored ? [[key, stored]] : []);
  const elements = Object.fromEntries(['privacy-choice', 'privacy-choice-title', 'privacy-choice-message', 'privacy-accept', 'privacy-reject', 'privacy-settings', 'privacy-storage-warning'].map((id) => [id, {
    hidden: true, open: false, disabled: false, textContent: '', events: {},
    showModal() { this.open = true; },
    close() { this.open = false; },
    addEventListener(name, fn) { this.events[name] = fn; },
    focus() { this.focused = true; },
  }]));
  const scripts = [], deletions = [], listeners = {};
  const document = {
    getElementById(id) { return elements[id]; },
    createElement() { return {}; },
    head: { appendChild(script) { scripts.push(script); } },
    get cookie() { return '_ga=old; _ga_ABC=old; _gid=old; unrelated=keep'; },
    set cookie(value) { deletions.push(value); },
  };
  const localStorage = {
    getItem(k) { if (blocked) throw new Error('blocked'); return values.get(k) || null; },
    setItem(k,v) { if (blocked || writeBlocked) throw new Error('blocked'); values.set(k,v); },
    removeItem(k) { if (blocked || removeBlocked) throw new Error('blocked'); values.delete(k); },
  };
  const sessionValues = sessionData || new Map();
  const sessionStorage = { getItem(k) { return sessionValues.get(k) || null; }, setItem(k,v) { sessionValues.set(k,v); }, removeItem(k) { sessionValues.delete(k); } };
  const window = { addEventListener(name, fn) { listeners[name] = fn; } };
  const location = { hostname: 'listika.com', pathname, reload() { this.reloaded = true; } };
  const navigator = { globalPrivacyControl: gpc };
  runInNewContext(source, { window, document, localStorage, sessionStorage, navigator, location, Date, JSON, Number });
  return { elements, scripts, deletions, listeners, values, sessionValues, window, location, navigator };
}
function click(p, id) { p.elements[id].events.click(); }
const valid = (analytics) => {
  const savedAt = Date.now();
  return JSON.stringify({ version: 1, analytics, savedAt, expiresAt: savedAt + 180 * 24 * 60 * 60 * 1000 });
};

test('fresh visit never loads Google and displays a choice', () => {
  const p = page();
  assert.equal(p.scripts.length, 0);
  assert.equal(p.elements['privacy-choice'].open, true);
  assert.equal(p.window['ga-disable-G-YEXHBBHKEC'], true);
});

test('acceptance loads analytics only after choice, with advertising denied', () => {
  const p = page();
  click(p, 'privacy-accept');
  assert.equal(JSON.parse(p.values.get(key)).analytics, 'accepted');
  assert.equal(p.scripts.length, 1);
  assert.equal(p.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-YEXHBBHKEC');
  const commands = p.window.dataLayer.map((args) => Array.from(args));
  assert.equal(commands[0][0], 'consent');
  assert.equal(commands[0][2].ad_storage, 'denied');
  assert.equal(commands[0][2].ad_user_data, 'denied');
  assert.equal(commands[0][2].ad_personalization, 'denied');
  assert.equal(commands[2][2].allow_google_signals, false);
  assert.equal(commands[2][2].allow_ad_personalization_signals, false);
  assert.equal(p.elements['privacy-choice'].open, false);
});

test('withdrawal stops analytics, clears first-party cookies and saves rejection', () => {
  const p = page({ stored: valid('accepted') });
  assert.equal(p.scripts.length, 1);
  click(p, 'privacy-settings');
  click(p, 'privacy-reject');
  assert.equal(p.window['ga-disable-G-YEXHBBHKEC'], true);
  assert.equal(JSON.parse(p.values.get(key)).analytics, 'rejected');
  assert.equal(p.location.reloaded, true);
  assert.ok(p.deletions.some((cookie) => cookie.startsWith('_ga=')));
  assert.ok(p.deletions.some((cookie) => cookie.startsWith('_ga_ABC=')));
  assert.ok(!p.deletions.some((cookie) => cookie.startsWith('unrelated=')));
  const later = page({ stored: p.values.get(key) });
  assert.equal(later.scripts.length, 0);
  assert.equal(later.elements['privacy-choice'].open, false);
});

test('GPC prevents loading even with saved consent and disables opt-in', () => {
  const p = page({ stored: valid('accepted'), gpc: true });
  assert.equal(p.scripts.length, 0);
  assert.equal(p.elements['privacy-accept'].disabled, true);
  assert.match(p.elements['privacy-choice-message'].textContent, /Global Privacy Control/);
  click(p, 'privacy-accept');
  assert.equal(p.scripts.length, 0);
});

test('unavailable, expired or invalid storage fails closed', () => {
  for (const p of [page({ blocked: true }), page({ stored: '{bad json' }), page({ stored: JSON.stringify({ version: 1, analytics: 'accepted', savedAt: 1, expiresAt: 2 }) })]) {
    assert.equal(p.scripts.length, 0);
    assert.equal(p.elements['privacy-choice'].open, true);
  }
  const blocked = page({ blocked: true });
  click(blocked, 'privacy-accept');
  assert.equal(blocked.scripts.length, 0);
  assert.match(blocked.elements['privacy-choice-message'].textContent, /could not be saved/);
});

test('withdrawal in another tab disables an already loaded tag before reload', () => {
  const p = page({ stored: valid('accepted') });
  p.values.set(key, valid('rejected'));
  p.listeners.storage({ key });
  assert.equal(p.window['ga-disable-G-YEXHBBHKEC'], true);
  assert.equal(p.location.reloaded, true);
});


test('failed rejection cannot reactivate stale consent in the same tab', () => {
  const p = page({ stored: valid('accepted'), writeBlocked: true, removeBlocked: true });
  assert.equal(p.scripts.length, 1);
  click(p, 'privacy-reject');
  assert.equal(p.window['ga-disable-G-YEXHBBHKEC'], true);
  assert.equal(p.location.reloaded, undefined);
  assert.equal(p.elements['privacy-storage-warning'].hidden, false);
  assert.equal(p.elements['privacy-choice'].open, false);
  const after = page({ stored: p.values.get(key), sessionData: p.sessionValues });
  assert.equal(after.scripts.length, 0);
  assert.equal(after.elements['privacy-choice'].open, true);
});


test('dialog blocks implicit dismissal while allowing an explicit rejection', () => {
  const p = page();
  let prevented = false;
  p.elements['privacy-choice'].events.cancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(p.elements['privacy-choice'].open, true);
  click(p, 'privacy-reject');
  assert.equal(p.elements['privacy-choice'].open, false);
  assert.equal(p.scripts.length, 0);
  click(p, 'privacy-settings');
  assert.equal(p.elements['privacy-choice'].open, true);
  assert.equal(p.elements['privacy-choice-title'].focused, true);
});

test('privacy notice remains accessible without a choice or analytics', () => {
  const p = page({ pathname: '/privacy/' });
  assert.equal(p.elements['privacy-choice'].open, false);
  assert.equal(p.scripts.length, 0);
  click(p, 'privacy-settings');
  assert.equal(p.elements['privacy-choice'].open, true);
});

test('when storage is blocked, rejection still lets the reader continue', () => {
  const p = page({ blocked: true });
  assert.equal(p.elements['privacy-choice'].open, true);
  click(p, 'privacy-reject');
  assert.equal(p.elements['privacy-choice'].open, false);
  assert.equal(p.elements['privacy-storage-warning'].hidden, false);
  assert.equal(p.scripts.length, 0);
  assert.equal(p.window['ga-disable-G-YEXHBBHKEC'], true);
});
