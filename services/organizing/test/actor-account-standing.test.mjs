import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readAgency, withToldHands, bearersHandedBy, toldBearersOf } from '../src/agency/index.mjs';

test('runtime standing replaces only its account/Actor pair, without resurrecting authored aliases', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'actor-account-standing-'));
  try {
    for (const [pool, records] of Object.entries({
      characters: { alice: { name: 'Alice' }, bob: { name: 'Bob' } },
      organs: {
        shared: { of: ['alice', 'bob'], platform: 'hive', account: 'hive:shared', handedness: { recv: 'potential', send: 'potential' } },
        separate: { of: ['alice'], platform: 'hive', account: 'hive:separate', handedness: { recv: 'potential', send: 'potential' } },
      },
    })) {
      const dir = path.join(root, 'lib/agency', pool); mkdirSync(dir, { recursive: true });
      for (const [id, record] of Object.entries(records)) writeFileSync(path.join(dir, id + '.json'), JSON.stringify(record));
    }
    const nested = path.join(root, 'services/other-services-section/lib/agency/characters');
    mkdirSync(nested, { recursive: true });
    writeFileSync(path.join(nested, 'alice.json'), JSON.stringify({ name: 'Other Alice' }));
    const agency = readAgency(root, { acts: [] });
    assert.deepEqual(bearersHandedBy(agency, 'hive:shared').toSorted(), ['alice', 'bob']);
    for (const reading of ['denied', 'contested', 'unknown']) {
      const view = withToldHands(agency, [{ account: 'hive:shared', character: '#alice', reading }]);
      assert.deepEqual(bearersHandedBy(view, 'hive:shared'), ['bob']);
      assert.deepEqual(bearersHandedBy(view, 'hive:separate'), ['alice']);
      assert.deepEqual(bearersHandedBy(agency, 'hive:shared').toSorted(), ['alice', 'bob']);
    }
    const admitted = withToldHands(agency, [{ account: 'hive:shared', character: 'alice', reading: 'held' }]);
    assert.deepEqual(bearersHandedBy(admitted, 'hive:shared').toSorted(), ['alice', 'bob']);
    assert.deepEqual(toldBearersOf(admitted, 'hive:shared'), ['alice']);
    const scoped = withToldHands(agency, [{ account: 'hive:scoped', character: 'services/other-services-section#alice', reading: 'held' }]);
    assert.deepEqual(toldBearersOf(scoped, 'hive:scoped'), ['services/other-services-section#alice']);
    const contradictory = withToldHands(agency, [
      { account: 'hive:shared', character: 'alice', reading: 'held' },
      { account: 'hive:shared', character: '#alice', reading: 'denied' },
    ]);
    assert.deepEqual(bearersHandedBy(contradictory, 'hive:shared'), ['bob']);
    assert.deepEqual(toldBearersOf(contradictory, 'hive:shared'), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
