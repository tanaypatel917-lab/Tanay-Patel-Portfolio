"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const intro_1 = require("./intro");
const fresh = { reduced: false, seen: false, hash: '', navigationType: 'navigate', scrollY: 0, ageMs: 200, visible: true, replay: false };
strict_1.default.equal((0, intro_1.isIntroEligible)(fresh), true);
for (const patch of [
    { reduced: true }, { seen: true }, { hash: '#work' }, { navigationType: 'back_forward' },
    { scrollY: 50 }, { ageMs: 1600 }, { visible: false },
])
    strict_1.default.equal((0, intro_1.isIntroEligible)({ ...fresh, ...patch }), false);
strict_1.default.equal((0, intro_1.isIntroEligible)({ ...fresh, seen: true, hash: '#top', replay: true }), true);
strict_1.default.equal((0, intro_1.isIntroEligible)({ ...fresh, reduced: true, replay: true }), false);
const started = (0, intro_1.createIntroState)(100);
strict_1.default.equal(started.phase, 'preparing');
const playing = (0, intro_1.advanceIntro)(started, 'prepared', 200);
strict_1.default.equal(playing.phase, 'performing');
const docking = (0, intro_1.advanceIntro)(playing, 'dock', 1800);
strict_1.default.equal(docking.phase, 'docking');
const complete = (0, intro_1.advanceIntro)(docking, 'finish', 2450);
strict_1.default.equal(complete.phase, 'complete');
strict_1.default.equal((0, intro_1.advanceIntro)(complete, 'prepared', 2500), complete);
strict_1.default.equal((0, intro_1.advanceIntro)(complete, 'skip', 2600), complete);
strict_1.default.equal((0, intro_1.advanceIntro)(started, 'prepared', 100 + intro_1.INTRO_DEADLINE_MS).reason, 'timeout');
for (const reason of ['skip', 'hidden', 'resize', 'error', 'reduced', 'timeout', 'unmount']) {
    strict_1.default.equal((0, intro_1.advanceIntro)(playing, reason, 300).phase, 'complete');
}
console.log('Intro eligibility, deadlines, and terminal-state checks passed.');
