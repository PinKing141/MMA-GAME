/**
 * Meta-level actions: weight-class switch, difficulty change, NG+
 * entry, fresh career start.
 */

import { state, resetGame } from '../core.js';
import { WEIGHT_CLASSES } from '../data/attributes.js';
import { setDifficulty } from '../meta/meta-store.js';
import { enterNewGamePlus, isEligibleForNewGamePlus } from '../meta/new-game-plus.js';
import { scheduleGameSave } from '../persistence.js';

/**
 * Switch the player's competing weight class. Updates state.setup.weight
 * to the midpoint of the new class so weigh-ins and frame math stay
 * consistent. Rankings carry over per-division (the existing ranking
 * dictionary is keyed by class key, so prior divisions stay banked).
 */
export function switchWeightClassAction(weightClassKey) {
    const wc = WEIGHT_CLASSES.find(w => w.key === weightClassKey);
    if (!wc) return false;
    const currentKey = getCurrentWeightClassKey();
    if (currentKey === weightClassKey) return false;

    // Use the midpoint of the new weight class — keeps weigh-ins inside
    // the legal window without forcing the player to pick an exact figure.
    state.setup.weight = Math.round((wc.min + wc.max) / 2);

    // Record the switch on the career so the news feed / post-fight
    // copy can reference it.
    if (!state.career.weightClassHistory) state.career.weightClassHistory = [];
    state.career.weightClassHistory.push({
        fromKey: currentKey,
        toKey: weightClassKey,
        switchedAt: new Date().toISOString(),
        afterFights: (state.career.eventHistory || []).length
    });
    scheduleGameSave();
    return true;
}

function getCurrentWeightClassKey() {
    const w = state.setup?.weight || 170;
    const wc = WEIGHT_CLASSES.find(c => w >= c.min && w <= c.max);
    return wc?.key || 'welterweight';
}

/**
 * Change the difficulty setting. Persists to meta store so NG+ and
 * new careers default to the player's last choice.
 */
export function setDifficultyAction(level) {
    if (!['easy', 'normal', 'hard', 'insane'].includes(level)) return false;
    state.difficulty = level;
    setDifficulty(level);
    scheduleGameSave();
    return true;
}

/**
 * Start a brand-new career. Resets everything except the meta store
 * (achievements, leaderboards, NG+ tier survive).
 */
export function startNewCareerAction() {
    resetGame();
    scheduleGameSave();
    return true;
}

/**
 * Enter New Game+. Records the current career as completed, bumps
 * the NG+ tier, then resets into a fresh career which picks up the
 * tier's starting cash/reputation bonus.
 */
export function enterNewGamePlusAction() {
    if (!isEligibleForNewGamePlus(state)) return false;
    enterNewGamePlus({ state });
    resetGame();
    scheduleGameSave();
    return true;
}

export { isEligibleForNewGamePlus };
