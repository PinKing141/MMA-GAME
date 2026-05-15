import { ATTRIBUTE_GROUPS, COACHES } from '../lib/data.js';
import { getAttributeAverage, getOverallAverage, getWeightClassEntry, state } from '../lib/core.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

function formatRecord(record) {
    return `${record.wins}-${record.losses}-${record.draws}`;
}

function getPlayerRankKey() {
    return getWeightClassEntry(state.setup.weight).key;
}

function getRankLabel(rank) {
    return rank ? `#${rank}` : 'NR';
}

function getInjuryPenalty() {
    return state.career.injuries.reduce((sum, injury) => sum + injury.penalty, 0);
}

function getCompositeScore(stats, conditionAdjustment = 0) {
    const standup = getAttributeAverage(stats, 'standup', ATTRIBUTE_GROUPS);
    const grappling = getAttributeAverage(stats, 'grappling', ATTRIBUTE_GROUPS);
    const health = getAttributeAverage(stats, 'health', ATTRIBUTE_GROUPS);
    const mind = getAttributeAverage(stats, 'mind', ATTRIBUTE_GROUPS);

    return (standup * 0.31) + (grappling * 0.27) + (health * 0.22) + (mind * 0.2) + conditionAdjustment;
}

function getPlayerConditionAdjustment() {
    const { career } = state;
    return ((career.fitness - 80) * 0.12)
        + ((career.sharpness - 55) * 0.18)
        + ((career.morale - 55) * 0.08)
        - (career.fatigue * 0.11)
        - (career.weightCutPressure * 0.08)
        - (career.overtrainingWarnings * 2.1)
        - getInjuryPenalty();
}

function getOpponentConditionAdjustment(opponent) {
    return 4 + opponent.difficultyBias;
}

function getMethod(winnerStats, loserStats, scoreGap) {
    const strikingThreat = (winnerStats.punchPower + winnerStats.kickPower + winnerStats.accuracy) / 3;
    const grapplingThreat = (winnerStats.submissionOffense + winnerStats.chokeSubmission + winnerStats.jointSubmission) / 3;
    const loserDurability = (loserStats.chinStrength + loserStats.bodyStrength + loserStats.composure) / 3;

    if (scoreGap >= 10 && grapplingThreat > strikingThreat + 3) {
        return {
            method: 'Submission',
            round: 1 + Math.floor(Math.random() * 2)
        };
    }

    if (scoreGap >= 8 && strikingThreat > loserDurability) {
        return {
            method: 'TKO',
            round: 1 + Math.floor(Math.random() * 3)
        };
    }

    return {
        method: scoreGap >= 5 ? 'Unanimous Decision' : 'Split Decision',
        round: null
    };
}

function getResultNotes(opponent, scoreGap, resultLabel) {
    const playerGroupEdges = Object.keys(ATTRIBUTE_GROUPS).map(groupKey => ({
        label: ATTRIBUTE_GROUPS[groupKey].label,
        edge: Math.round(getAttributeAverage(state.stats, groupKey, ATTRIBUTE_GROUPS) - getAttributeAverage(opponent.stats, groupKey, ATTRIBUTE_GROUPS))
    }));
    const bestEdge = playerGroupEdges.sort((left, right) => right.edge - left.edge)[0];
    const injuryNote = state.career.injuries.length
        ? `Camp carried ${state.career.injuries.length} injury issue${state.career.injuries.length > 1 ? 's' : ''} into the fight.`
        : 'Camp reached fight night without a listed injury carrying over.';
    const cutNote = state.career.weightCutPressure >= 55
        ? 'The weight cut was heavy and it showed in the conditioning readout.'
        : 'The weight cut stayed manageable and the gas tank held up.';

    return [
        `${resultLabel} came from the ${bestEdge.label.toLowerCase()} edge swinging the matchup by ${Math.abs(bestEdge.edge)} points.`,
        injuryNote,
        scoreGap >= 0 ? cutNote : 'The opponent handled the pace better and kept the cleaner reads under pressure.'
    ];
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
    let nextRank = currentRank;

    if (resultLabel === 'Win') {
        if (typeof opponent.rank === 'number') {
            nextRank = currentRank === null
                ? Math.min(25, opponent.rank + 1)
                : Math.min(currentRank, opponent.rank);

            if (nextRank <= opponent.rank) {
                opponent.rank += 1;
            }
        } else if (currentRank !== null) {
            nextRank = Math.max(1, currentRank - 1);
        }
    } else if (resultLabel === 'Loss') {
        nextRank = currentRank === null ? null : (currentRank >= 24 ? null : currentRank + 2);
    }

    state.career.playerRankings[rankingKey] = nextRank;
    return {
        before: currentRank,
        after: nextRank
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
    state.career.availableOpponents = [];
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

function renderFightNotes(notes) {
    return notes.map(note => `<div class="fight-note">${note}</div>`).join('');
}

export function renderFightScene() {
    const opponent = state.career.selectedOpponent || state.career.lastFightResult?.opponent;
    const result = state.career.lastFightResult;

    if (!opponent) {
        document.getElementById('fight-result-headline').textContent = 'No fight booked';
        document.getElementById('fight-result-copy').textContent = 'Select an opponent and finish camp before the fight scene can run.';
        document.getElementById('fight-result-notes').innerHTML = '';
        document.getElementById('btn-simulate-fight').disabled = true;
        document.getElementById('btn-back-gym').disabled = true;
        return;
    }

    document.getElementById('fight-player-name').textContent = [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter';
    document.getElementById('fight-player-meta').textContent = `OVR ${getOverallAverage(state.stats)} · Fitness ${state.career.fitness}% · Sharpness ${state.career.sharpness}%`;
    document.getElementById('fight-opponent-name').textContent = opponent.name;
    document.getElementById('fight-opponent-meta').textContent = `OVR ${opponent.overall} · ${formatRecord(opponent.record)} · ${opponent.archetype.name}`;
    document.getElementById('fight-camp-readout').innerHTML = `
        <div class="career-row">
            <div class="career-stat">
                <div class="label">Coach</div>
                <div class="value fight-small-copy">${state.career.selectedCoach?.name || result?.coachName || 'No coach'}</div>
            </div>
            <div class="career-stat">
                <div class="label">Cut</div>
                <div class="value">${result?.weightCutPressure ?? state.career.weightCutPressure}<span class="unit">%</span></div>
            </div>
            <div class="career-stat">
                <div class="label">Fatigue</div>
                <div class="value">${result?.fatigue ?? state.career.fatigue}<span class="unit">%</span></div>
            </div>
            <div class="career-stat">
                <div class="label">Injuries</div>
                <div class="value">${result?.injuryCount ?? state.career.injuries.length}</div>
            </div>
            <div class="career-stat">
                <div class="label">Rank</div>
                <div class="value">${result ? getRankLabel(result.playerRankAfter) : getRankLabel(state.career.playerRankings[getPlayerRankKey()] ?? null)}</div>
            </div>
            <div class="career-stat">
                <div class="label">Purse</div>
                <div class="value fight-small-copy">${result ? formatMoney(result.purseEarned) : formatMoney(opponent.purse)}</div>
            </div>
        </div>
    `;

    if (result && result.opponent.id === opponent.id) {
        document.getElementById('fight-result-headline').textContent = result.headline;
        document.getElementById('fight-result-copy').textContent = result.copy;
        document.getElementById('fight-result-notes').innerHTML = renderFightNotes(result.notes);
        document.getElementById('btn-simulate-fight').disabled = true;
        document.getElementById('btn-back-gym').disabled = true;
        return;
    }

    document.getElementById('fight-result-headline').textContent = `Booked fight vs ${opponent.name}`;
    document.getElementById('fight-result-copy').textContent = 'Camp is done. Run the bout to see whether the prep held up under real pressure.';
    document.getElementById('fight-result-notes').innerHTML = renderFightNotes([
        `${opponent.name} is a ${opponent.difficulty.toLowerCase()} debut matchup with a ${opponent.archetype.name.toLowerCase()} profile.`,
        'Fight results are driven by the built stats plus camp condition, weight cut, and injuries.',
        'A completed camp is required before the fight can be simulated.'
    ]);
    document.getElementById('btn-simulate-fight').disabled = state.career.campWeeksCompleted < state.career.campWeeksTotal;
    document.getElementById('btn-back-gym').disabled = false;
}

export function simulateFight() {
    const opponent = state.career.selectedOpponent;

    if (!opponent || state.career.campWeeksCompleted < state.career.campWeeksTotal) {
        return;
    }

    const playerScore = getCompositeScore(state.stats, getPlayerConditionAdjustment()) + ((Math.random() * 6) - 3);
    const opponentScore = getCompositeScore(opponent.stats, getOpponentConditionAdjustment(opponent)) + ((Math.random() * 6) - 3);
    const scoreGap = Math.abs(playerScore - opponentScore);

    let headline;
    let copy;
    let resultLabel;
    let methodInfo;

    if (scoreGap < 1.5 && Math.random() < 0.15) {
        state.career.record.draws += 1;
        state.career.reputation += 1;
        resultLabel = 'Draw';
        headline = `Draw vs ${opponent.name}`;
        copy = 'Neither side separated itself clearly enough. The debut ends level after a tight fight.';
        methodInfo = {
            method: 'Majority Draw',
            round: null
        };
    } else if (playerScore >= opponentScore) {
        state.career.record.wins += 1;
        state.career.reputation += 4;
        methodInfo = getMethod(state.stats, opponent.stats, scoreGap);
        if (methodInfo.method !== 'Unanimous Decision' && methodInfo.method !== 'Split Decision') {
            state.career.record.finishes += 1;
        }
        resultLabel = 'Win';
        headline = `${resultLabel} vs ${opponent.name}`;
        copy = methodInfo.round
            ? `The camp paid off. ${methodInfo.method} arrived in round ${methodInfo.round}.`
            : `The debut goes in the book as a ${methodInfo.method.toLowerCase()}.`;
    } else {
        state.career.record.losses += 1;
        state.career.reputation = Math.max(0, state.career.reputation - 1);
        methodInfo = getMethod(opponent.stats, state.stats, scoreGap);
        resultLabel = 'Loss';
        headline = `${resultLabel} vs ${opponent.name}`;
        copy = methodInfo.round
            ? `${opponent.name} broke through for a ${methodInfo.method.toLowerCase()} in round ${methodInfo.round}.`
            : `The opponent took the debut on the cards by ${methodInfo.method.toLowerCase()}.`;
    }

    updateOpponentRecord(opponent, resultLabel);
    const rankingUpdate = updateRankings(resultLabel, opponent);
    const purseEarned = resultLabel === 'Win'
        ? opponent.purse
        : resultLabel === 'Draw'
            ? Math.round(opponent.purse * 0.6)
            : Math.round(opponent.purse * 0.35);
    state.career.cash += purseEarned;
    const coachProgress = applyCoachProgress(resultLabel);

    state.career.lastFightResult = {
        opponent,
        result: resultLabel,
        method: methodInfo.method,
        round: methodInfo.round,
        headline,
        copy,
        notes: getResultNotes(opponent, playerScore - opponentScore, resultLabel),
        coachName: state.career.selectedCoach?.name || 'No coach',
        weightCutPressure: state.career.weightCutPressure,
        fatigue: state.career.fatigue,
        injuryCount: state.career.injuries.length,
        purseEarned,
        playerRankBefore: rankingUpdate.before,
        playerRankAfter: rankingUpdate.after,
        coachProgressText: coachProgress
            ? `${coachProgress.coach.longTermTrait.label} triggered again. ${coachProgress.coach.gym} rep is now ${coachProgress.relationship.gymReputation}.`
            : 'No coach relationship progressed from this camp.'
    };

    state.career.lastFightResult.notes.push(
        `Purse earned: ${formatMoney(purseEarned)}. Player rank is now ${getRankLabel(rankingUpdate.after)}.`,
        state.career.lastFightResult.coachProgressText
    );

    clearCampAfterFight();
    renderFightScene();
}