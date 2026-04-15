import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { hashString, mulberry32, rollFrom, roll, rollRandom } from '../dist/shared/companion.js';

const DIST = new URL('../dist', import.meta.url).pathname;

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

// ─── roll (pure seed function) ────────────────────────────────────────────────

test('roll is deterministic — same seed produces same bones', () => {
  const a = roll('seed-abc-123');
  const b = roll('seed-abc-123');
  assert.deepEqual(a, b);
});

test('roll produces different bones for different seeds', () => {
  const a = roll('seed-abc-123');
  const b = roll('seed-xyz-456');
  const same = a.species === b.species && a.eye === b.eye
    && a.rarity === b.rarity && a.hat === b.hat;
  assert.ok(!same, 'Different seeds should produce different bones');
});

test('roll produces valid bones for any string seed', () => {
  const bones = roll('some-uuid-value');
  assert.ok(VALID_SPECIES.has(bones.species));
  assert.ok(VALID_EYES.has(bones.eye));
  assert.ok(VALID_RARITY.has(bones.rarity));
});

// ─── rollRandom ───────────────────────────────────────────────────────────────

test('rollRandom returns valid rarity and species', () => {
  // Structure correctness is already covered by rollFrom tests.
  // This verifies the crypto → mulberry32 → rollFrom path doesn't break.
  const bones = rollRandom();
  assert.ok(VALID_RARITY.has(bones.rarity));
  assert.ok(VALID_SPECIES.has(bones.species));
});

test('rollRandom produces different results on repeated calls', () => {
  const results = new Set();
  for (let i = 0; i < 20; i++) {
    const b = rollRandom();
    results.add(`${b.species}-${b.rarity}-${b.eye}`);
  }
  // 20 rolls should not all be identical (astronomically unlikely)
  assert.ok(results.size > 1, 'rollRandom should produce varied results');
});

// ─── readStoredBones / saveStoredBones ────────────────────────────────────────

function runScript(stateDir, script) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      encoding: 'utf-8',
      env: { ...process.env, CLAUDE_BUDDY_STATE_DIR: stateDir },
      timeout: 5000,
    }
  );
}

test('saveStoredBones persists bones, readStoredBones reads them back', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-bones-'));
  try {
    const result = runScript(dir, `
      import { rollRandom, saveStoredBones, readStoredBones } from 'file://${join(DIST, 'shared/companion.js')}';
      const bones = rollRandom();
      saveStoredBones(bones);
      const loaded = readStoredBones();
      process.stdout.write(JSON.stringify({ original: bones, loaded }));
    `);
    assert.equal(result.status, 0, result.stderr);
    const { original, loaded } = JSON.parse(result.stdout);
    assert.deepEqual(original, loaded, 'Loaded bones should match saved bones');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadCompanion auto-rolls and saves on first run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-bones-'));
  try {
    const result = runScript(dir, `
      import { loadCompanion, readStoredBones } from 'file://${join(DIST, 'shared/companion.js')}';
      const { bones } = loadCompanion();
      const stored = readStoredBones();
      process.stdout.write(JSON.stringify({ bones, stored }));
    `);
    assert.equal(result.status, 0, result.stderr);
    const { bones, stored } = JSON.parse(result.stdout);
    assert.deepEqual(bones, stored, 'Auto-rolled bones should be saved to disk');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('loadCompanion returns same bones on repeated calls', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buddy-bones-'));
  try {
    const result = runScript(dir, `
      import { loadCompanion } from 'file://${join(DIST, 'shared/companion.js')}';
      const a = loadCompanion();
      const b = loadCompanion();
      process.stdout.write(JSON.stringify({ a: a.bones, b: b.bones }));
    `);
    assert.equal(result.status, 0, result.stderr);
    const { a, b } = JSON.parse(result.stdout);
    assert.deepEqual(a, b, 'Same bones should be returned on repeated loadCompanion calls');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
