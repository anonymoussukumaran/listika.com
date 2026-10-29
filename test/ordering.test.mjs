import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderEntries, validateOrdering } from '../src/data/ordering.mjs';

const names = (entries) => entries.map((entry) => entry.name);

test('editorial ordering preserves the authored sequence', () => {
  const entries = [{ name: 'Zed' }, { name: 'Apple' }];
  assert.deepEqual(names(orderEntries(entries, 'editorial')), ['Zed', 'Apple']);
});

test('alphabetical ordering sorts names without changing source entries', () => {
  const entries = [{ name: 'Zed' }, { name: 'apple' }, { name: 'Beta' }];
  assert.deepEqual(names(orderEntries(entries, 'alphabetical')), ['apple', 'Beta', 'Zed']);
  assert.deepEqual(names(entries), ['Zed', 'apple', 'Beta']);
});

test('grouped ordering uses the group first and name within each group', () => {
  const entries = [{ name: 'Zed', sortGroup: 'Kochi' }, { name: 'Beta', sortGroup: 'Bengaluru' }, { name: 'Apple', sortGroup: 'Kochi' }];
  assert.deepEqual(names(orderEntries(entries, 'grouped-alphabetical')), ['Beta', 'Apple', 'Zed']);
});

test('date ordering is chronological, keeps ties in authored order and puts unknown dates last', () => {
  const entries = [
    { name: 'Unknown' }, { name: 'Later', date: '2027-02-01' },
    { name: 'Early Z', date: '2026-11-01' }, { name: 'Early A', date: '2026-11-01' },
  ];
  assert.deepEqual(names(orderEntries(entries, 'date')), ['Early Z', 'Early A', 'Later', 'Unknown']);
});

test('validation rejects missing explanations, unknown methods and missing group keys', () => {
  assert.throws(() => validateOrdering(undefined, [], 'test'), /invalid or missing ordering/);
  assert.throws(() => validateOrdering({ method: 'popularity', explanation: 'Votes' }, [], 'test'), /invalid or missing ordering/);
  assert.throws(() => validateOrdering({ method: 'date', explanation: '  ' }, [], 'test'), /invalid or missing ordering/);
  assert.throws(() => validateOrdering({ method: 'grouped-alphabetical', explanation: 'By city' }, [{ name: 'Test' }], 'test'), /needs a sort group/);
  assert.doesNotThrow(() => validateOrdering({ method: 'grouped-alphabetical', explanation: 'By city' }, [{ name: 'Test', sortGroup: 'Kochi' }], 'test'));
});
