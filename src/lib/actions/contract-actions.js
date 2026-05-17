import { state } from '../core.js';
import { getWeightCutBaseline } from './career-state.js';

export function getContractPreview(event = state.career.selectedEvent, opponent = state.career.selectedOpponent) {
    if (!event || !opponent) {
        return null;
    }

    const showMoney = event.showMoney + Math.round(opponent.purse * 0.45);
    const winBonus = event.winBonus + Math.round(opponent.purse * 0.55);
    const reputationBonus = event.reputationBonus + (typeof opponent.rank === 'number' && opponent.rank <= 15 ? 1 : 0);

    return {
        id: `${event.id}:${opponent.id}`,
        eventId: event.id,
        eventName: event.name,
        venue: event.venue,
        location: event.location,
        stageLabel: event.stageLabel,
        opponentId: opponent.id,
        opponentName: opponent.name,
        opponentRank: opponent.rank,
        showMoney,
        winBonus,
        totalPotential: showMoney + winBonus,
        reputationBonus
    };
}

export function signContractState() {
    const contract = getContractPreview();
    if (!contract) {
        return false;
    }

    state.career.contract = contract;
    state.career.selectedCoach = null;
    state.career.campWeeksCompleted = 0;
    state.career.campWeeksTotal = 4;
    state.career.fatigue = 0;
    state.career.weightCutPressure = getWeightCutBaseline(state.career.selectedOpponent);
    state.career.overtrainingWarnings = 0;
    state.career.injuries = [];
    state.career.trainingHistory = [];
    return true;
}
