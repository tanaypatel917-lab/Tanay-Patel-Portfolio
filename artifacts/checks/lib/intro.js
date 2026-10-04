"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTRO_DURATION = exports.INTRO_DEADLINE_MS = exports.INTRO_PREPARE_MS = exports.INTRO_KEY = void 0;
exports.isIntroEligible = isIntroEligible;
exports.createIntroState = createIntroState;
exports.advanceIntro = advanceIntro;
exports.hasSeenIntro = hasSeenIntro;
exports.rememberIntro = rememberIntro;
exports.INTRO_KEY = 'tp-intro-v2';
exports.INTRO_PREPARE_MS = 250;
exports.INTRO_DEADLINE_MS = 3000;
exports.INTRO_DURATION = 2.3;
function isIntroEligible(input) {
    if (input.reduced || !input.visible || !Number.isFinite(input.scrollY))
        return false;
    if (input.replay)
        return input.scrollY <= 4;
    return !input.seen && !input.hash && input.navigationType !== 'back_forward' && input.scrollY <= 4 && input.ageMs <= 1200;
}
function createIntroState(now) {
    return { phase: 'preparing', startedAt: now, reason: null };
}
function advanceIntro(state, event, now) {
    if (state.phase === 'complete')
        return state;
    if (now - state.startedAt >= exports.INTRO_DEADLINE_MS || event === 'timeout')
        return { ...state, phase: 'complete', reason: 'timeout' };
    if (event === 'prepared')
        return state.phase === 'preparing' ? { ...state, phase: 'performing' } : state;
    if (event === 'dock')
        return state.phase === 'performing' ? { ...state, phase: 'docking' } : state;
    return { ...state, phase: 'complete', reason: event };
}
function hasSeenIntro() {
    try {
        return sessionStorage.getItem(exports.INTRO_KEY) === '1';
    }
    catch {
        return false;
    }
}
function rememberIntro() {
    try {
        sessionStorage.setItem(exports.INTRO_KEY, '1');
    }
    catch { }
}
