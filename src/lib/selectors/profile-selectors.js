import {
    detectArchetype,
    feetInchesString,
    getOverallAverage,
    getStance,
    getWeightClass,
    inchesToFeetInchesString,
    state
} from '../core.js';
import { formatMoney, formatRecord, getRankLabel } from '../utils/formatters.js';
import { getPlayerRank } from './career-selectors.js';

function getProfileProgressCopy(career) {
    if (career.lastFightResult && !career.contract) {
        return {
            heading: 'Next: Find Another Fight',
            copy: `Last result: ${career.lastFightResult.result} vs ${career.lastFightResult.opponent.name} by ${career.lastFightResult.method}. Pick the next card and matchup before camp starts.`,
            buttonLabel: 'Fight Offers'
        };
    }

    if (!career.contract) {
        if (career.selectedEvent && career.selectedOpponent) {
            return {
                heading: `Next: Sign ${career.selectedOpponent.name} For ${career.selectedEvent.name}`,
                copy: 'The matchup is lined up. Sign the deal to lock the money and start camp.',
                buttonLabel: 'Fight Offers'
            };
        }

        return {
            heading: 'Next: Pick A Card And Opponent',
            copy: 'Choose the event first, then pick the matchup and sign the deal before camp opens.',
            buttonLabel: 'Fight Offers'
        };
    }

    if (career.campWeeksCompleted >= career.campWeeksTotal) {
        return {
            heading: `Next: Fight Night At ${career.contract.eventName}`,
            copy: `${career.contract.opponentName} is locked in. Camp is done and the fight is ready.`,
            buttonLabel: 'Go To Fight'
        };
    }

    return {
        heading: `Next: Camp For ${career.contract.opponentName}`,
        copy: `${career.contract.eventName} is booked. Pick a coach, stay healthy, and finish camp.`,
        buttonLabel: 'Continue Camp'
    };
}

function getProfileCareerStory(career, rankLabel) {
    if (career.lastFightResult) {
        return `Last fight: ${career.lastFightResult.result} vs ${career.lastFightResult.opponent.name} by ${career.lastFightResult.method}${career.lastFightResult.round ? ` in round ${career.lastFightResult.round}` : ''} at ${career.lastFightResult.eventName}. Bankroll ${formatMoney(career.cash)} · Rank ${rankLabel}.`;
    }

    if (career.contract) {
        const coachName = career.selectedCoach ? career.selectedCoach.name : 'No coach selected';
        return `Signed for ${career.contract.eventName} vs ${career.contract.opponentName}. Coach: ${coachName}. Show money ${formatMoney(career.contract.showMoney)} · Win bonus ${formatMoney(career.contract.winBonus)}.`;
    }

    if (career.selectedEvent || career.selectedOpponent) {
        const eventName = career.selectedEvent ? career.selectedEvent.name : 'No card picked yet';
        const opponentName = career.selectedOpponent ? career.selectedOpponent.name : 'No opponent picked yet';
        return `Shortlist: ${eventName} · ${opponentName}. Bankroll ${formatMoney(career.cash)} · Rank ${rankLabel}.`;
    }

    return `No fight booked yet. Bankroll ${formatMoney(career.cash)} · Division rank ${rankLabel}. Build the fighter, then build the run.`;
}

export function getProfileViewModel() {
    const { setup, career } = state;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter';
    const archetype = detectArchetype(state.stats);
    const rankLabel = getRankLabel(getPlayerRank());
    const progressCopy = getProfileProgressCopy(career);

    return {
        fullName,
        archetype,
        weightClass: getWeightClass(setup.weight),
        country: setup.country,
        ageLabel: `${setup.age} y/o`,
        stanceLabel: getStance(setup.hand),
        recordLabel: career.record.wins + career.record.losses + career.record.draws > 0
            ? `${formatRecord(career.record)} (${career.record.finishes} finishes)`
            : `${formatRecord(career.record)} (Debut Pending)`,
        heightLabel: feetInchesString(setup.feet, setup.inches),
        weightValue: setup.weight,
        reachLabel: inchesToFeetInchesString(setup.reach),
        reachValue: setup.reach,
        overall: getOverallAverage(state.stats),
        fitness: career.fitness,
        morale: career.morale,
        sharpness: career.sharpness,
        reputation: career.reputation,
        careerDay: career.contract
            ? (career.campWeeksCompleted >= career.campWeeksTotal ? 'Fight Week' : `Week ${career.campWeeksCompleted + 1}`)
            : 'No Fight Booked',
        careerStory: getProfileCareerStory(career, rankLabel),
        progressCopy
    };
}
