import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressBar,
  progressionFromAge,
  renderCharacter,
  SPRITES, FACE_INLINE, RARITY_STARS, RARITY_COLORS, EYE_ALT,
  renderSprite, renderFaceInline,
  MOOD_KAOMOJI, hungerGauge,
} from '../dist/shared/render.js';

const ALL_SPECIES = [
  'duck','goose','blob','cat','dragon','octopus',
  'owl','penguin','turtle','snail','ghost','axolotl',
  'capybara','cactus','robot','rabbit','mushroom','chonk',
];

const mockBones = {
  rarity: 'common',
  species: 'blob',
  eye: '◉',
  hat: 'none',
  shiny: false,
  stats: { DEBUGGING: 10, PATIENCE: 10, CHAOS: 10, WISDOM: 10, SNARK: 10 },
};

const mockConfig = {
  id: 'test-uuid',
  name: 'Buddy',
  createdAt: Date.now(),
};

// ─── progressBar ─────────────────────────────────────────────────────────────

test('progressBar: 0 → all empty', () => {
  assert.equal(progressBar(0), '░░░░░░░░░░');
});

test('progressBar: 0.5 → half filled', () => {
  assert.equal(progressBar(0.5), '█████░░░░░');
});

test('progressBar: 1 → all filled', () => {
  assert.equal(progressBar(1), '██████████');
});

test('progressBar clamps out-of-range inputs', () => {
  assert.equal(progressBar(-1), '░░░░░░░░░░');
  assert.equal(progressBar(2),  '██████████');
});

test('progressBar always returns 10 visual cells', () => {
  for (const p of [0, 0.1, 0.33, 0.5, 0.99, 1]) {
    assert.equal([...progressBar(p)].length, 10);
  }
});

// ─── progressionFromAge ──────────────────────────────────────────────────────

test('progressionFromAge: brand new buddy is Lv.1 with 0 progress', () => {
  const now = Date.now();
  const { level, progress } = progressionFromAge(now, now);
  assert.equal(level, 1);
  assert.equal(progress, 0);
});

test('progressionFromAge: 7 days old → Lv.2', () => {
  const now = 1_700_000_000_000;
  const week = 7 * 24 * 60 * 60 * 1000;
  const { level } = progressionFromAge(now - week, now);
  assert.equal(level, 2);
});

test('progressionFromAge: 3.5 days old → Lv.1, ~0.5 progress', () => {
  const now = 1_700_000_000_000;
  const halfWeek = 3.5 * 24 * 60 * 60 * 1000;
  const { level, progress } = progressionFromAge(now - halfWeek, now);
  assert.equal(level, 1);
  assert.ok(progress > 0.49 && progress < 0.51);
});

test('progressionFromAge: future createdAt clamps to Lv.1', () => {
  const now = 1_700_000_000_000;
  const { level, progress } = progressionFromAge(now + 1_000_000, now);
  assert.equal(level, 1);
  assert.equal(progress, 0);
});

// ─── SPRITES & FACE_INLINE ────────────────────────────────────────────────────

test('SPRITES has all 18 species, each with 4 lines', () => {
  assert.equal(Object.keys(SPRITES).length, 18);
  for (const s of ALL_SPECIES) assert.equal(SPRITES[s].length, 4, s);
});

test('FACE_INLINE has all 18 species', () => {
  for (const s of ALL_SPECIES) assert.ok(FACE_INLINE[s], s);
});

test('RARITY_STARS spans common→legendary', () => {
  assert.equal(RARITY_STARS.common,    '★');
  assert.equal(RARITY_STARS.legendary, '★★★★★');
});

// ─── renderSprite ─────────────────────────────────────────────────────────────

test('renderSprite returns 4 lines for hatless and 5 with hat', () => {
  assert.equal(renderSprite(mockBones).length, 4);
  assert.equal(renderSprite({ ...mockBones, hat: 'crown' }).length, 5);
});

test('renderSprite substitutes {E} with eye', () => {
  const out = renderSprite({ ...mockBones, eye: '✦' }).join('\n');
  assert.ok(out.includes('✦'));
  assert.ok(!out.includes('{E}'));
});

test('renderFaceInline substitutes {E}', () => {
  const face = renderFaceInline({ ...mockBones, eye: '@' });
  assert.ok(face.includes('@'));
  assert.ok(!face.includes('{E}'));
});

// ─── renderCharacter ──────────────────────────────────────────────────────────

test('renderCharacter: returns sprite lines + info line', () => {
  const lines = renderCharacter(mockBones, mockConfig);
  // sprite (4) + info (1) = 5
  assert.equal(lines.length, 5);
});

test('renderCharacter: includes name, level, stars', () => {
  const lines = renderCharacter(mockBones, { ...mockConfig, name: 'Voidwarp' });
  const info = lines[lines.length - 1];
  assert.ok(info.includes('Voidwarp'));
  assert.ok(info.includes('Lv.'));
  assert.ok(info.includes('★'));
});

test('renderCharacter: shiny adds sparkle line', () => {
  const lines = renderCharacter({ ...mockBones, shiny: true }, mockConfig);
  assert.ok(lines[lines.length - 1].includes('✨'));
});

test('renderCharacter: withMessage:false suppresses one-liner', () => {
  const lines = renderCharacter(mockBones, mockConfig, { withMessage: false });
  const info = lines[lines.length - 1];
  assert.ok(!info.includes(' · '), `info should not have message separator: "${info}"`);
});

test('renderCharacter: withMessage default includes " · "', () => {
  const lines = renderCharacter(mockBones, mockConfig, { rng: () => 0 });
  const info = lines[lines.length - 1];
  assert.ok(info.includes(' · '));
});

test('renderCharacter: rng/now overrides yield deterministic output', () => {
  const fixed = new Date('2026-01-01T08:00:00Z');
  const a = renderCharacter(mockBones, mockConfig, { now: fixed, rng: () => 0.42 });
  const b = renderCharacter(mockBones, mockConfig, { now: fixed, rng: () => 0.42 });
  assert.deepEqual(a, b);
});

// ─── RARITY_COLORS ────────────────────────────────────────────────────────────

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

test('RARITY_COLORS: common has no color code', () => {
  assert.equal(RARITY_COLORS.common, '');
});

test('RARITY_COLORS: non-common rarities have ANSI escape codes', () => {
  for (const r of ['uncommon', 'rare', 'epic', 'legendary']) {
    assert.ok(RARITY_COLORS[r].startsWith('\x1b['), `${r} should have ANSI color`);
  }
});

test('renderCharacter: epic output contains ANSI color codes', () => {
  const epicBones = { ...mockBones, rarity: 'epic' };
  const lines = renderCharacter(epicBones, mockConfig, { withMessage: false });
  const raw = lines.join('\n');
  assert.ok(raw.includes('\x1b['), 'epic output should contain ANSI escape');
});

test('renderCharacter: common output has no ANSI color codes', () => {
  const lines = renderCharacter(mockBones, mockConfig, { withMessage: false });
  const raw = lines.join('\n');
  assert.ok(!raw.includes('\x1b['), 'common output should have no ANSI escape');
});

test('renderCharacter: info line contains rarity name for non-common', () => {
  for (const r of ['uncommon', 'rare', 'epic', 'legendary']) {
    const bones = { ...mockBones, rarity: r };
    const lines = renderCharacter(bones, mockConfig, { withMessage: false });
    const info = stripAnsi(lines[lines.length - 1]);
    assert.ok(info.includes(r), `info line should include rarity name "${r}"`);
  }
});

// ─── Frame toggle (EYE_ALT) ────────────────────────────────────────────────────

test('EYE_ALT covers all 6 eye types', () => {
  for (const e of ['·','✦','×','◉','@','°']) {
    assert.ok(typeof EYE_ALT[e] === 'string' && EYE_ALT[e].length > 0, e);
  }
});

test('renderSprite frame:1 substitutes EYE_ALT character', () => {
  const f0 = renderSprite({ ...mockBones, eye: '✦' }, 0).join('\n');
  const f1 = renderSprite({ ...mockBones, eye: '✦' }, 1).join('\n');
  assert.ok(f0.includes('✦'));
  assert.ok(!f0.includes(EYE_ALT['✦']));
  assert.ok(f1.includes(EYE_ALT['✦']));
});

test('renderCharacter frame:1 propagates to sprite', () => {
  const f0 = renderCharacter({ ...mockBones, eye: '◉' }, mockConfig, { withMessage: false, frame: 0 });
  const f1 = renderCharacter({ ...mockBones, eye: '◉' }, mockConfig, { withMessage: false, frame: 1 });
  assert.notDeepEqual(f0, f1);
});

test('renderCharacter default frame matches frame:0', () => {
  const def = renderCharacter(mockBones, mockConfig, { withMessage: false });
  const f0  = renderCharacter(mockBones, mockConfig, { withMessage: false, frame: 0 });
  assert.deepEqual(def, f0);
});

// ─── State-based rendering regression ─────────────────────────────────────────

test('renderCharacter: stateLevel/stateProgress override progressionFromAge', () => {
  // A config that would give level 1 from age, but we pass stateLevel=5
  const config = { id: 'x', name: 'Buddy', createdAt: Date.now() };
  const lines = renderCharacter(mockBones, config, {
    withMessage: false,
    stateLevel: 5,
    stateProgress: 0.5,
  });
  const infoLine = lines.find((l) => l.includes('Lv.'));
  assert.ok(infoLine.includes('Lv.5'), `Expected Lv.5 in: ${infoLine}`);
});

test('renderCharacter: progress bar reflects stateProgress', () => {
  const config = { id: 'x', name: 'Buddy', createdAt: Date.now() };
  const full = renderCharacter(mockBones, config, {
    withMessage: false,
    stateLevel: 1,
    stateProgress: 1.0,
  });
  const empty = renderCharacter(mockBones, config, {
    withMessage: false,
    stateLevel: 1,
    stateProgress: 0.0,
  });
  const fullBar = full.find((l) => l.includes('['));
  const emptyBar = empty.find((l) => l.includes('['));
  assert.ok(fullBar.includes('██████████'), `Full bar expected: ${fullBar}`);
  assert.ok(emptyBar.includes('░░░░░░░░░░'), `Empty bar expected: ${emptyBar}`);
});

// ─── hungerGauge ─────────────────────────────────────────────────────────────

test('hungerGauge(0) = ●●●● (만복)', () => {
  assert.equal(hungerGauge(0), '●●●●');
});

test('hungerGauge(4) = ○○○○ (배고픔)', () => {
  assert.equal(hungerGauge(4), '○○○○');
});

test('hungerGauge(2) = ●●○○ (중간)', () => {
  assert.equal(hungerGauge(2), '●●○○');
});

test('hungerGauge(1) = ●●●○', () => {
  assert.equal(hungerGauge(1), '●●●○');
});

test('hungerGauge(3) = ●○○○', () => {
  assert.equal(hungerGauge(3), '●○○○');
});

test('hungerGauge: 음수는 0으로 클램프', () => {
  assert.equal(hungerGauge(-1), '●●●●');
});

test('hungerGauge: 4 초과는 4로 클램프', () => {
  assert.equal(hungerGauge(10), '○○○○');
});

test('hungerGauge: 항상 4글자', () => {
  for (const h of [0, 1, 2, 3, 4]) {
    assert.equal([...hungerGauge(h)].length, 4);
  }
});

// ─── MOOD_KAOMOJI ─────────────────────────────────────────────────────────────

test('MOOD_KAOMOJI: happy = (^_^)', () => {
  assert.equal(MOOD_KAOMOJI.happy, '(^_^)');
});

test('MOOD_KAOMOJI: neutral = (-_-)', () => {
  assert.equal(MOOD_KAOMOJI.neutral, '(-_-)');
});

test('MOOD_KAOMOJI: sad = (;_;)', () => {
  assert.equal(MOOD_KAOMOJI.sad, '(;_;)');
});

// ─── renderCharacter mood/hunger 통합 ────────────────────────────────────────

test('renderCharacter: mood+hunger 제공 시 head에 카오모지와 게이지 포함', () => {
  const lines = renderCharacter(mockBones, mockConfig, {
    withMessage: false,
    stateLevel: 3,
    stateProgress: 0.5,
    mood: 'sad',
    hunger: 2,
  });
  const info = lines[lines.length - 1];
  assert.ok(info.includes('(;_;)'), `head should include sad kaomoji: "${info}"`);
  assert.ok(info.includes('●●○○'), `head should include hunger gauge: "${info}"`);
});

test('renderCharacter: mood=happy hunger=0 → (^_^) ●●●●', () => {
  const lines = renderCharacter(mockBones, mockConfig, {
    withMessage: false,
    stateLevel: 1,
    stateProgress: 0,
    mood: 'happy',
    hunger: 0,
  });
  const info = lines[lines.length - 1];
  assert.ok(info.includes('(^_^)'));
  assert.ok(info.includes('●●●●'));
});

test('renderCharacter: mood/hunger 미전달 시 카오모지 없음 (하위호환)', () => {
  const lines = renderCharacter(mockBones, mockConfig, { withMessage: false });
  const info = lines[lines.length - 1];
  assert.ok(!info.includes('(^_^)') && !info.includes('(-_-)') && !info.includes('(;_;)'),
    `info should have no kaomoji: "${info}"`);
});

test('renderCharacter: mood만 전달하고 hunger 미전달 시 카오모지 없음', () => {
  const lines = renderCharacter(mockBones, mockConfig, {
    withMessage: false,
    mood: 'happy',
  });
  const info = lines[lines.length - 1];
  assert.ok(!info.includes('(^_^)'), `info should have no kaomoji without hunger: "${info}"`);
});

// ─── State-based rendering regression ─────────────────────────────────────────

test('renderCharacter: migration regression — 200-day buddy stays Lv.29 via state', () => {
  // Simulate migration: 200 days = floor(200/7)+1 = 29
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const createdAt = Date.now() - 200 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - createdAt;
  const migratedLevel = Math.floor(elapsed / WEEK_MS) + 1;
  assert.equal(migratedLevel, 29);

  const config = { id: 'x', name: 'Buddy', createdAt };
  const lines = renderCharacter(mockBones, config, {
    withMessage: false,
    stateLevel: migratedLevel,
    stateProgress: 0,
  });
  const infoLine = lines.find((l) => l.includes('Lv.'));
  assert.ok(infoLine.includes('Lv.29'), `Expected Lv.29 in: ${infoLine}`);
});
