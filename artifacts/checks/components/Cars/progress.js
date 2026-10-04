"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressSource = createProgressSource;
function clamp(value, fallback = 0) {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
function createProgressSource(initial = 0) {
    const listeners = new Set();
    let current = clamp(initial);
    return {
        get current() {
            return current;
        },
        set(value) {
            const next = clamp(value, current);
            if (next === current)
                return;
            current = next;
            listeners.forEach((listener) => listener());
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}
