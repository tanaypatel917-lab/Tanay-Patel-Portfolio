import assert from 'node:assert/strict';
import { advanceIntro, createIntroState, INTRO_DEADLINE_MS, isIntroEligible } from './intro';

const fresh = { reduced: false, seen: false, hash: '', navigationType: 'navigate', scrollY: 0, ageMs: 200, visible: true, replay: false };
assert.equal(isIntroEligible(fresh), true);
for (const patch of [
  { reduced: true }, { seen: true }, { hash: '#work' }, { navigationType: 'back_forward' },
  { scrollY: 50 }, { ageMs: 1600 }, { visible: false },
]) assert.equal(isIntroEligible({ ...fresh, ...patch }), false);
assert.equal(isIntroEligible({ ...fresh, seen: true, hash: '#top', replay: true }), true);
assert.equal(isIntroEligible({ ...fresh, reduced: true, replay: true }), false);

const started = createIntroState(100);
assert.equal(started.phase, 'preparing');
const playing = advanceIntro(started, 'prepared', 200);
assert.equal(playing.phase, 'performing');
const docking = advanceIntro(playing, 'dock', 1800);
assert.equal(docking.phase, 'docking');
const complete = advanceIntro(docking, 'finish', 2450);
assert.equal(complete.phase, 'complete');
assert.equal(advanceIntro(complete, 'prepared', 2500), complete);
assert.equal(advanceIntro(complete, 'skip', 2600), complete);
assert.equal(advanceIntro(started, 'prepared', 100 + INTRO_DEADLINE_MS).reason, 'timeout');
for (const reason of ['skip', 'hidden', 'resize', 'error', 'reduced', 'timeout', 'unmount'] as const) {
  assert.equal(advanceIntro(playing, reason, 300).phase, 'complete');
}
console.log('Intro eligibility, deadlines, and terminal-state checks passed.');
