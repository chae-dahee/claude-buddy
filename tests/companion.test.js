import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32, rollFrom, roll } from '../dist/shared/companion.js';

const VALID_SPECIES = new Set([
  'duck','goose','blob','cat','dragon','octopus',
  'owl','penguin','turtle','snail','ghost','axolotl',
  'capybara','cactus','robot','rabbit','mushroom','chonk',
]);
const VALID_EYES   = new Set(['·','✦','×','◉','@','°']);
const VALID_HATS   = new Set(['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck']);
const VALID_RARITY = new Set(['common','uncommon','rare','epic','legendary']);
const VALID_STATS  = ['DEBUGGING','PATIENCE','CHAOS','WISDOM','SNARK'];

// ─── hashString ───────────────────────────────────────────────────────────────

test('hashString is deterministic', () => {
  assert.equal(hashString('hello'), hashString('hello'));
  assert.equal(hashString('' + VALID_EYES), hashString('' + VALID_EYES));
});

test('hashString returns distinct values for distinct inputs', () => {
  assert.notEqual(hashString('hello'), hashString('world'));
  assert.notEqual(hashString('user-abc'), hashString('user-xyz'));
});

test('hashString returns a non-negative 32-bit integer', () => {
  for (const s of ['', 'a', 'hello', 'friend-2026-401', 'anon']) {
    const h = hashString(s);
    assert.ok(h >= 0, `hash('${s}') should be >= 0`);
    assert.ok(h < 2 ** 32, `hash('${s}') should be < 2^32`);
    assert.ok(Number.isInteger(h), `hash('${s}') should be integer`);
  }
});

// ─── mulberry32 ───────────────────────────────────────────────────────────────

test('mulberry32 produces values in [0, 1)', () => {
  const rng = mulberry32(12345);
  for (let i = 0; i < 200; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `Value ${v} out of [0,1)`);
  }
});

test('mulberry32 is deterministic — same seed produces same sequence', () => {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  for (let i = 0; i < 30; i++) {
    assert.equal(rng1(), rng2());
  }
});

test('mulberry32 different seeds produce different sequences', () => {
  const rng1 = mulberry32(1);
  const rng2 = mulberry32(2);
  assert.notEqual(rng1(), rng2());
});

// ─── rollFrom ─────────────────────────────────────────────────────────────────

test('rollFrom produces valid bones structure', () => {
  const rng = mulberry32(99999);
  const bones = rollFrom(rng);
  assert.ok(VALID_RARITY.has(bones.rarity),  `Invalid rarity: ${bones.rarity}`);
  assert.ok(VALID_SPECIES.has(bones.species), `Invalid species: ${bones.species}`);
  assert.ok(VALID_EYES.has(bones.eye),        `Invalid eye: ${bones.eye}`);
  assert.ok(VALID_HATS.has(bones.hat),        `Invalid hat: ${bones.hat}`);
  assert.equal(typeof bones.shiny, 'boolean');
  for (const stat of VALID_STATS) {
    assert.ok(typeof bones.stats[stat] === 'number', `Stat ${stat} should be number`);
    assert.ok(bones.stats[stat] >= 1 && bones.stats[stat] <= 100, `Stat ${stat} out of range`);
  }
});

test('rollFrom: common rarity always yields hat=none', () => {
  // Any seed that produces a common roll must have hat=none
  for (let seed = 0; seed < 300; seed++) {
    const bones = rollFrom(mulberry32(seed));
    if (bones.rarity === 'common') {
      assert.equal(bones.hat, 'none', `Seed ${seed}: common should have no hat`);
    }
  }
});

test('rollFrom: non-common rarities may have a hat', () => {
  let foundHat = false;
  for (let seed = 0; seed < 5000 && !foundHat; seed++) {
    const bones = rollFrom(mulberry32(seed));
    if (bones.rarity !== 'common' && bones.hat !== 'none') foundHat = true;
  }
  assert.ok(foundHat, 'Should find at least one non-common roll with a hat');
});

test('rollFrom: all 5 stats are present', () => {
  const bones = rollFrom(mulberry32(1234));
  for (const stat of VALID_STATS) {
    assert.ok(stat in bones.stats, `Missing stat: ${stat}`);
  }
});

test('rollFrom: rarity distribution matches weights across 1000 rolls', () => {
  const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < 1000; i++) {
    const bones = rollFrom(mulberry32(i * 7 + 13));
    counts[bones.rarity]++;
  }
  assert.ok(counts.common   > counts.uncommon,  'common > uncommon');
  assert.ok(counts.uncommon > counts.rare,       'uncommon > rare');
  assert.ok(counts.rare     > counts.epic,       'rare > epic');
  // legendary may or may not appear in 1000 rolls (~10 expected), just check ordering if nonzero
  if (counts.legendary > 0) {
    assert.ok(counts.epic >= counts.legendary, 'epic >= legendary');
  }
});

// ─── roll ─────────────────────────────────────────────────────────────────────

test('roll is deterministic — same userId produces same bones', () => {
  const a = roll('user-abc-123');
  const b = roll('user-abc-123');
  assert.deepEqual(a, b);
});

test('roll produces different bones for different userIds', () => {
  const a = roll('user-abc-123');
  const b = roll('user-xyz-456');
  // At least one field must differ (probability of collision is astronomically low)
  const same = a.species === b.species && a.eye === b.eye
    && a.rarity === b.rarity && a.hat === b.hat;
  assert.ok(!same, 'Different userIds should produce different bones');
});

test('roll produces valid bones for anon fallback', () => {
  const bones = roll('anon');
  assert.ok(VALID_SPECIES.has(bones.species));
  assert.ok(VALID_EYES.has(bones.eye));
  assert.ok(VALID_RARITY.has(bones.rarity));
});
