import { COACHES } from '../data.js';
import { clamp, getWeightClassEntry, state } from '../core.js';
import { simulateCareerFight } from '../fight-domain/simulate-career-fight.js';
import { resolveRankingUpdate } from '../ranking-domain/update-rankings.js';
import { formatMoney, getRankLabel } from '../utils/formatters.js';

function getPlayerRankKey() {
    return getWeightClassEntry(state.setup.weight).key;
}

function updateOpponentRecord(opponent, resultLabel) {
    if (resultLabel === 'Win') {
        opponent.record.losses += 1;
        return;
    }

    if (resultLabel === 'Loss') {
        opponent.record.wins += 1;
        return;
    }

    opponent.record.draws += 1;
}

function updateRankings(resultLabel, opponent) {
    const rankingKey = getPlayerRankKey();
    const currentRank = state.career.playerRankings[rankingKey] ?? null;
    const { nextPlayerRank, opponentRankIncrement } = resolveRankingUpdate({
        currentRank,
        opponentRank: opponent.rank,
        resultLabel
    });

    state.career.playerRankings[rankingKey] = nextPlayerRank;
    if (opponentRankIncrement && typeof opponent.rank === 'number') {
        opponent.rank += opponentRankIncrement;
    }

    return {
        before: currentRank,
        after: nextPlayerRank
    };
}

function applyCoachProgress(resultLabel) {
    const selectedCoach = state.career.selectedCoach;
    if (!selectedCoach) {
        return null;
    }

    const coach = COACHES.find(entry => entry.id === selectedCoach.id);
    const relationship = coach ? state.career.coachRelationships[coach.id] : null;
    if (!coach || !relationship) {
        return null;
    }

    relationship.campsCompleted += 1;
    relationship.gymReputation = clamp(relationship.gymReputation + coach.gymReputationGain + (resultLabel === 'Win' ? 2 : 1), 0, 100);
    relationship.longTermBoosts += 1;

    Object.entries(coach.longTermTrait.statGrowth).forEach(([key, delta]) => {
        state.stats[key] = clamp((state.stats[key] || 10) + delta, 10, 99);
    });

    return {
        coach,
        relationship
    };
}

function clearCampAfterFight() {
    state.career.availableEvents = [];
    state.career.availableOpponents = [];
    state.career.selectedEvent = null;
    state.career.contract = null;
    state.career.selectedOpponent = null;
    state.career.selectedCoach = null;
    state.career.campWeeksCompleted = 0;
    state.career.campWeeksTotal = 4;
    state.career.trainingHistory = [];
    state.career.injuries = [];
    state.career.weightCutPressure = 22;
    state.career.overtrainingWarnings = 0;
    state.career.fatigue = clamp(Math.round(state.career.fatigue * 0.35), 0, 20);
    state.career.sharpness = clamp(Math.round(state.career.sharpness * 0.72), 35, 88);
}

export function simulateFightState() {
    const opponent = state.career.selectedOpponent;
    const contract = state.career.contract;

    if (!opponent || !contract || state.career.campWeeksCompleted < state.career.campWeeksTotal) {
        return false;
    }

    const fightNightSnapshot = {
        fitness: state.career.fitness,
        sharpness: state.career.sharpness,
        weightCutPressure: state.career.weightCutPressure,
        fatigue: state.career.fatigue,
        injuryCount: state.career.injuries.length
    };

    const simulation = simulateCareerFight({
        player: {
            name: [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter',
            country: state.setup.country,
            age: state.setup.age,
            hand: state.setup.hand,
            weight: state.setup.weight,
            stats: state.stats,
            record: state.career.record
        },
        opponent,
        contract,
        fightNight: {
            fitness: state.career.fitness,
            sharpness: state.career.sharpness,
            morale: state.career.morale,
            weightCutPressure: state.career.weightCutPressure,
            fatigue: state.career.fatigue,
            overtrainingWarnings: state.career.overtrainingWarnings,
            injuries: state.career.injuries
        }
    });

    if (simulation.result === 'Draw') {
        state.career.record.draws += 1;
    } else if (simulation.result === 'Win') {
        state.career.record.wins += 1;
    } else {
        state.career.record.losses += 1;
    }

    state.career.reputation = clamp(state.career.reputation + simulation.reputationDelta, 0, 999);
    if (simulation.scoredFinish) {
        state.career.record.finishes += 1;
    }

    updateOpponentRecord(opponent, simulation.result);
    const rankingUpdate = updateRankings(simulation.result, opponent);
    const purseEarned = simulation.purseEarned;
    state.career.cash += purseEarned;
    const coachProgress = applyCoachProgress(simulation.result);

    state.career.eventHistory.unshift({
        eventName: contract.eventName,
        opponentName: opponent.name,
        result: simulation.result,
        purseEarned
    });

    state.career.lastFightResult = {
        contract,
        eventName: contract.eventName,
        venue: contract.venue,
        location: contract.location,
        opponent,
        result: simulation.result,
        method: simulation.method,
        round: simulation.round,
        finishTime: simulation.finishTime,
        headline: simulation.headline,
        copy: simulation.copy,
        notes: [...simulation.notes],
        coachName: state.career.selectedCoach?.name || 'No coach',
        playerFitness: fightNightSnapshot.fitness,
        playerSharpness: fightNightSnapshot.sharpness,
        weightCutPressure: fightNightSnapshot.weightCutPressure,
        fatigue: fightNightSnapshot.fatigue,
        injuryCount: fightNightSnapshot.injuryCount,
        showMoney: contract.showMoney,
        winBonus: contract.winBonus,
        purseEarned,
        replay: simulation.replay,
        venueTier: simulation.venueTier,
        allowedVenueTiers: simulation.allowedVenueTiers,
        playerRankBefore: rankingUpdate.before,
        playerRankAfter: rankingUpdate.after,
        coachProgressText: coachProgress
            ? `${coachProgress.coach.longTermTrait.label} triggered again. ${coachProgress.coach.gym} rep is now ${coachProgress.relationship.gymReputation}.`
            : 'No coach relationship progressed from this camp.'
    };

    state.career.lastFightResult.notes.push(
        `${contract.eventName} · ${contract.venue}, ${contract.location}.`,
        `Purse earned: ${formatMoney(purseEarned)}. Player rank is now ${getRankLabel(rankingUpdate.after)}.`,
        state.career.lastFightResult.coachProgressText
    );

    clearCampAfterFight();
    return true;
}