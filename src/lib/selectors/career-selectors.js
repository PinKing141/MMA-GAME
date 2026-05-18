import { getWeightClassEntry, state } from '../core.js';

export function getPlayerRank() {
    const weightClassKey = getWeightClassEntry(state.setup.weight).key;
    return state.career.playerRankings[weightClassKey] ?? null;
}
