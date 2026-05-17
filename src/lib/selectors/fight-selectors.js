import { getOverallAverage, getWeightClassEntry, state } from '../core.js';
import { formatMoney, formatRecord, getRankLabel } from '../utils/formatters.js';

export function getFightViewModel() {
    const contract = state.career.contract || state.career.lastFightResult?.contract || null;
    const opponent = state.career.selectedOpponent || state.career.lastFightResult?.opponent;
    const result = state.career.lastFightResult;

    if (!contract || !opponent) {
        return {
            hasOpponent: false,
            headline: 'No fight booked',
            copy: 'Pick a card, sign the deal, and finish camp before the fight can run.',
            notes: [],
            canSimulate: false,
            canBackToCamp: false
        };
    }

    const resolved = Boolean(result && result.opponent.id === opponent.id);

    return {
        hasOpponent: true,
        playerName: [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter',
        playerMeta: `OVR ${getOverallAverage(state.stats)} · Fitness ${result?.playerFitness ?? state.career.fitness}% · Sharpness ${result?.playerSharpness ?? state.career.sharpness}%`,
        opponentName: opponent.name,
        opponentMeta: `OVR ${opponent.overall} · ${formatRecord(opponent.record)} · ${opponent.archetype.name}`,
        campReadout: [
            ['Event', contract.eventName],
            ['Coach', state.career.selectedCoach?.name || result?.coachName || 'No coach'],
            ['Cut', `${result?.weightCutPressure ?? state.career.weightCutPressure}%`],
            ['Fatigue', `${result?.fatigue ?? state.career.fatigue}%`],
            ['Injuries', `${result?.injuryCount ?? state.career.injuries.length}`],
            ['Rank', resolved ? getRankLabel(result.playerRankAfter) : getRankLabel(state.career.playerRankings[getWeightClassEntry(state.setup.weight).key] ?? null)],
            ['Pay', resolved ? formatMoney(result.purseEarned) : `${formatMoney(contract.showMoney)} / ${formatMoney(contract.winBonus)}`]
        ].map(([label, value]) => ({ label, value })),
        headline: resolved ? result.headline : `Fight booked vs ${opponent.name}`,
        copy: resolved
            ? result.copy
            : `${contract.eventName} is set for ${contract.venue}. Run the fight to see whether camp held up.`,
        notes: resolved
            ? result.notes
            : [
                `${contract.eventName} pays ${formatMoney(contract.showMoney)} to show and ${formatMoney(contract.winBonus)} to win.`,
                `${opponent.name} is a ${opponent.difficulty.toLowerCase()} matchup with a ${opponent.archetype.name.toLowerCase()} style.`,
                'Fight results are driven by your build plus camp condition, weight cut, and injuries.',
                'A completed camp is required before the fight can be simulated.'
            ],
        replay: resolved ? result.replay || null : null,
        canReplay: resolved && Boolean(result.replay),
        canSimulate: !resolved && state.career.campWeeksCompleted >= state.career.campWeeksTotal,
        canBackToCamp: !resolved
    };
}
