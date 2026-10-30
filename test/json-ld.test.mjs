import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeJsonLd } from '../src/utils/json-ld.mjs';

test('JSON-LD safely round trips text that could terminate a script', () => {
  const value = { name: '</script><script>alert(1)</script> & café' };
  const serialized = serializeJsonLd(value);
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), value);
});
