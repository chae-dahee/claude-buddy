import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpBar,
  SPRITES, HAT_LINES, FACE_INLINE, RARITY_STARS, RARITY_BORDERS,
  renderSprite, renderFaceInline,
  renderSpeechBubble, renderStatusLine, renderLevelUp,
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

const baseState = {
  name: 'Buddy', mood: 'neutral', xp: 45, level: 1,
  lastReaction: '', lastUpdated: Date.now(),
};

// ─── xpBar ───────────────────────────────────────────────────────────────────

test('xpBar: 0 XP = all empty', () => {
  assert.equal(xpBar(0), '░░░░░░░░░░');
});

test('xpBar: 50 XP = half filled', () => {
  assert.equal(xpBar(50), '█████░░░░░');
});

test('xpBar: 100 XP wraps to 0 progress (level reset)', () => {
  assert.equal(xpBar(100), '░░░░░░░░░░');
});

test('xpBar: 95 XP = 9 filled', () => {
  assert.equal(xpBar(95), '█████████░');
});

test('xpBar: always returns exactly 10 characters', () => {
  for (const xp of [0, 1, 50, 99, 100, 150, 999]) {
    assert.equal([...xpBar(xp)].length, 10, `xpBar(${xp}) should be 10 chars`);
  }
});

// ─── SPRITES ─────────────────────────────────────────────────────────────────

test('SPRITES has all 18 species', () => {
  assert.equal(Object.keys(SPRITES).length, 18);
  for (const s of ALL_SPECIES) {
    assert.ok(SPRITES[s], `Missing sprite for: ${s}`);
  }
});

test('every sprite has exactly 4 lines', () => {
  for (const s of ALL_SPECIES) {
    assert.equal(SPRITES[s].length, 4, `${s} should have 4 lines`);
  }
});

// ─── FACE_INLINE ─────────────────────────────────────────────────────────────

test('FACE_INLINE has all 18 species', () => {
  assert.equal(Object.keys(FACE_INLINE).length, 18);
  for (const s of ALL_SPECIES) {
    assert.ok(FACE_INLINE[s], `Missing inline face for: ${s}`);
  }
});

// ─── RARITY_STARS ─────────────────────────────────────────────────────────────

test('RARITY_STARS has all 5 rarities', () => {
  const rarities = ['common','uncommon','rare','epic','legendary'];
  for (const r of rarities) {
    assert.ok(RARITY_STARS[r], `Missing stars for: ${r}`);
  }
  assert.equal(RARITY_STARS['legendary'], '★★★★★');
  assert.equal(RARITY_STARS['common'], '★');
});

// ─── renderSprite ─────────────────────────────────────────────────────────────

test('renderSprite returns 4 lines for no-hat species', () => {
  assert.equal(renderSprite(mockBones).length, 4);
});

test('renderSprite returns 5 lines when hat is equipped', () => {
  const bones = { ...mockBones, rarity: 'uncommon', hat: 'crown' };
  const lines = renderSprite(bones);
  assert.equal(lines.length, 5);
  assert.ok(lines[0].includes('^'), 'Crown hat line should contain ^');
});

test('renderSprite replaces {E} with the eye character', () => {
  const bones = { ...mockBones, species: 'blob', eye: '✦' };
  const result = renderSprite(bones).join('\n');
  assert.ok(result.includes('✦'), 'Should contain eye char');
  assert.ok(!result.includes('{E}'), 'Should not contain {E} placeholder');
});

test('renderSprite differs across species', () => {
  const blob = renderSprite({ ...mockBones, species: 'blob' });
  const cat  = renderSprite({ ...mockBones, species: 'cat'  });
  assert.notDeepEqual(blob, cat);
});

test('renderSprite differs across eye styles', () => {
  const a = renderSprite({ ...mockBones, eye: '·' }).join('');
  const b = renderSprite({ ...mockBones, eye: '×' }).join('');
  assert.notEqual(a, b);
});

// ─── renderFaceInline ─────────────────────────────────────────────────────────

test('renderFaceInline substitutes {E} with eye', () => {
  const face = renderFaceInline({ ...mockBones, eye: '@' });
  assert.ok(face.includes('@'));
  assert.ok(!face.includes('{E}'));
});

test('renderFaceInline differs across species', () => {
  const duck = renderFaceInline({ ...mockBones, species: 'duck' });
  const owl  = renderFaceInline({ ...mockBones, species: 'owl'  });
  assert.notEqual(duck, owl);
});

// ─── renderSpeechBubble ───────────────────────────────────────────────────────

test('renderSpeechBubble contains message, name, level, XP', () => {
  const out = renderSpeechBubble(baseState, 'Hello!', mockBones, 'Voidwarp');
  assert.ok(out.includes('Hello!'));
  assert.ok(out.includes('Voidwarp'));
  assert.ok(out.includes('Lv.1'));
  assert.ok(out.includes('XP'));
});

test('renderSpeechBubble shows rarity stars', () => {
  const out = renderSpeechBubble(baseState, 'Hi', mockBones);
  assert.ok(out.includes('★'));
});

test('renderSpeechBubble shows ✨ for shiny companion', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, shiny: true });
  assert.ok(out.includes('✨'));
});

test('renderSpeechBubble does not show ✨ for non-shiny', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, shiny: false });
  // levelUp marker ✨ won't appear either since we're testing renderSpeechBubble directly
  assert.ok(!out.includes('✨'));
});

test('renderSpeechBubble is multi-line', () => {
  const out = renderSpeechBubble(baseState, 'Hi', mockBones);
  assert.ok(out.includes('\n'));
});

test('renderSpeechBubble falls back to state.name if no companionName', () => {
  const out = renderSpeechBubble(baseState, 'Hi', mockBones);
  assert.ok(out.includes('Buddy'));
});

// ─── renderStatusLine ─────────────────────────────────────────────────────────

test('renderStatusLine is a single line', () => {
  const out = renderStatusLine(baseState, mockBones);
  assert.ok(!out.includes('\n'));
});

test('renderStatusLine includes name and level', () => {
  const out = renderStatusLine(baseState, mockBones, 'Voidwarp');
  assert.ok(out.includes('Voidwarp'));
  assert.ok(out.includes('Lv.1'));
});

test('renderStatusLine uses state.name as fallback', () => {
  const out = renderStatusLine(baseState, mockBones);
  assert.ok(out.includes('Buddy'));
});

test('renderStatusLine differs across species', () => {
  const blob = renderStatusLine(baseState, { ...mockBones, species: 'blob' });
  const duck = renderStatusLine(baseState, { ...mockBones, species: 'duck' });
  assert.notEqual(blob, duck);
});

// ─── renderLevelUp ────────────────────────────────────────────────────────────

test('renderLevelUp contains new level', () => {
  const out = renderLevelUp({ ...baseState, level: 3 });
  assert.ok(out.includes('Lv.3'));
  assert.ok(out.includes('LEVEL UP'));
});

// ─── RARITY_BORDERS ──────────────────────────────────────────────────────────

test('RARITY_BORDERS has entries for all 5 rarities', () => {
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  for (const r of rarities) {
    assert.ok(RARITY_BORDERS[r], `Missing border def for: ${r}`);
  }
});

// ─── rarity bubble borders ────────────────────────────────────────────────────

test('common/uncommon bubble uses rounded corners ╭╮╰╯', () => {
  for (const rarity of ['common', 'uncommon']) {
    const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity });
    assert.ok(out.includes('╭'), `${rarity}: should have ╭`);
    assert.ok(out.includes('╰'), `${rarity}: should have ╰`);
  }
});

test('rare bubble uses double-line corners ╔╗╚╝', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity: 'rare' });
  assert.ok(out.includes('╔'), 'rare: should have ╔');
  assert.ok(out.includes('╚'), 'rare: should have ╚');
  assert.ok(!out.includes('╭'), 'rare: should not have ╭');
});

test('epic bubble uses double-line border with ★ accents', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity: 'epic' });
  assert.ok(out.includes('╔'), 'epic: should have ╔');
  // The top line should contain ★ accent
  const topLine = out.split('\n')[0];
  assert.ok(topLine.includes('★'), `epic: top border should contain ★, got: ${topLine}`);
});

test('legendary bubble uses double-line border with ✦ accents', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity: 'legendary' });
  assert.ok(out.includes('╔'), 'legendary: should have ╔');
  const topLine = out.split('\n')[0];
  assert.ok(topLine.includes('✦'), `legendary: top border should contain ✦, got: ${topLine}`);
});

test('bubble border differs between common and rare', () => {
  const common = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity: 'common' });
  const rare   = renderSpeechBubble(baseState, 'Hi', { ...mockBones, rarity: 'rare' });
  const commonTop = common.split('\n')[0];
  const rareTop   = rare.split('\n')[0];
  assert.notEqual(commonTop, rareTop, 'common and rare should have different top borders');
});

// ─── shiny sparkle line ───────────────────────────────────────────────────────

test('shiny companion shows sparkle decoration line', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, shiny: true });
  assert.ok(out.includes('✦'), 'shiny should show ✦ sparkle line');
  assert.ok(out.includes('✨'), 'shiny should show ✨ in sparkle line');
});

test('non-shiny companion does not show sparkle decoration line', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, shiny: false });
  assert.ok(!out.includes('✨'), 'non-shiny should not show ✨');
});

test('shiny sparkle line appears after sprite info line', () => {
  const out = renderSpeechBubble(baseState, 'Hi', { ...mockBones, shiny: true });
  const lines = out.split('\n');
  const sparkleIdx = lines.findIndex((l) => l.includes('✦') && l.includes('✨'));
  const infoIdx    = lines.findIndex((l) => l.includes('Lv.') && l.includes('XP'));
  assert.ok(sparkleIdx > infoIdx, 'sparkle line should appear after info line');
});
