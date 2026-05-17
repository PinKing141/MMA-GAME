import { ALL_ATTRIBUTES, ARCHETYPE_LOOKUP, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from '../data.js';
import { buildPresetStats, resetStats, state } from '../core.js';
import { scheduleGameSave } from '../persistence.js';

export function incrementStatAction(statKey) {
    if (state.pointsRemaining <= 0 || state.stats[statKey] >= MAX_ATTRIBUTE) {
        return false;
    }

    state.stats[statKey] += 1;
    state.pointsRemaining -= 1;
    state.selectedPreset = null;
    scheduleGameSave();
    return true;
}

export function decrementStatAction(statKey) {
    if (state.stats[statKey] <= MIN_ATTRIBUTE) {
        return false;
    }

    state.stats[statKey] -= 1;
    state.pointsRemaining += 1;
    state.selectedPreset = null;
    scheduleGameSave();
    return true;
}

export function applyPresetAction(presetKey) {
    const archetype = ARCHETYPE_LOOKUP[presetKey];
    if (!archetype) {
        return false;
    }

    const presetStats = buildPresetStats(archetype);
    ALL_ATTRIBUTES.forEach(attribute => {
        state.stats[attribute.key] = presetStats[attribute.key];
    });

    const totalSpent = ALL_ATTRIBUTES.reduce((sum, attribute) => sum + (state.stats[attribute.key] - MIN_ATTRIBUTE), 0);
    state.pointsRemaining = state.pointsTotal - totalSpent;
    state.selectedPreset = presetKey;
    state.archetype = archetype;
    scheduleGameSave();
    return true;
}

export function resetBuildAction() {
    resetStats();
    scheduleGameSave();
    return true;
}