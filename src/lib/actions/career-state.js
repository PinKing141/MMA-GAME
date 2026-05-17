import { clamp, getWeightClassEntry, state } from '../core.js';

export function getPlayerRankingKey() {
    return getWeightClassEntry(state.setup.weight).key;
}

export function getWeightCutBaseline(opponent = null) {
    const weightClass = getWeightClassEntry(state.setup.weight);
    const spread = Math.max(1, weightClass.max - weightClass.min);
    const classRatio = (state.setup.weight - weightClass.min) / spread;
    const opponentAdjustment = opponent ? Math.max(0, 7 - (Math.min(opponent.rank || 30, 30) / 5)) : 0;
    return clamp(Math.round(14 + (classRatio * 18) + opponentAdjustment), 10, 48);
}

export function syncAvailableOpponents() {
    const weightClassKey = getPlayerRankingKey();
    state.career.availableOpponents = state.career.roster
        .filter(opponent => opponent.weightClassKey === weightClassKey)
        .sort((left, right) => left.rank - right.rank);
}

export function selectOpponentState(opponentId) {
    const opponent = state.career.availableOpponents.find(entry => entry.id === opponentId);
    if (!opponent) {
        return false;
    }

    state.career.selectedOpponent = opponent;
    state.career.contract = null;
    state.career.selectedCoach = null;
    state.career.campWeeksCompleted = 0;
    state.career.campWeeksTotal = 4;
    state.career.fatigue = 0;
    state.career.weightCutPressure = getWeightCutBaseline(opponent);
    state.career.overtrainingWarnings = 0;
    state.career.injuries = [];
    state.career.trainingHistory = [];
    return true;
}

export function selectCoachState(coach, relationship) {
    if (!coach || !relationship) {
        return false;
    }

    if (state.career.selectedCoach?.id === coach.id) {
        return false;
    }

    if (state.career.campWeeksCompleted > 0 && state.career.selectedCoach) {
        return false;
    }

    if (relationship.gymReputation < coach.reputationRequired || state.career.cash < coach.fee) {
        return false;
    }

    state.career.cash -= coach.fee;
    relationship.totalFeesPaid += coach.fee;

    state.career.selectedCoach = {
        id: coach.id,
        name: coach.name,
        gym: coach.gym,
        feePaid: coach.fee,
        longTermTraitLabel: coach.longTermTrait.label
    };

    return true;
}