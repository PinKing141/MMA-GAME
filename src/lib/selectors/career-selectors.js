import { COACHES } from '../data.js';
import { getWeightClassEntry, state } from '../core.js';
import { formatMoney, formatRecord, getRankLabel } from '../utils/formatters.js';
import { GYM_ACTIONS } from '../actions/camp-state.js';

export function getPlayerRank() {
    const weightClassKey = getWeightClassEntry(state.setup.weight).key;
    return state.career.playerRankings[weightClassKey] ?? null;
}

function getCurrentGymRankLabel() {
    const weightClassKey = state.career.selectedOpponent?.weightClassKey;
    if (!weightClassKey) {
        return 'NR';
    }

    const rank = state.career.playerRankings[weightClassKey] ?? null;
    return getRankLabel(rank);
}

function getCampStatus() {
    const { career } = state;
    if (!career.contract) {
        return 'No fight is signed. Go back and lock in the deal before camp starts.';
    }

    if (!career.selectedCoach) {
        return 'Pick a coach first. The right camp should match the fight you booked.';
    }

    if (career.campWeeksCompleted >= career.campWeeksTotal) {
        return 'Camp is done. Fight night is ready.';
    }

    if (career.fatigue >= 75) {
        return 'Fatigue is climbing fast. A lighter recovery week would protect the build.';
    }

    if (career.weightCutPressure >= 60) {
        return 'The cut is getting ugly. Conditioning or recovery is safer than another hard grind.';
    }

    if (career.sharpness < 55) {
        return 'Sharpness is still low. Live work or high-focus drilling should come next.';
    }

    if (career.fitness < 85) {
        return 'Fitness dipped. Conditioning is the cleanest way to steady the camp.';
    }

    return 'Camp is balanced. Stack the last weeks around the style you already built.';
}

export function getGymViewModel() {
    const { setup, career } = state;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter';
    const campComplete = career.campWeeksCompleted >= career.campWeeksTotal;
    const selectedCoach = career.selectedCoach ? COACHES.find(entry => entry.id === career.selectedCoach.id) || null : null;
    const coachRelationship = selectedCoach ? state.career.coachRelationships[selectedCoach.id] : null;

    return {
        fullName,
        weekLabel: campComplete
            ? `Camp complete · ${career.campWeeksTotal}/${career.campWeeksTotal} weeks`
            : `Week ${career.campWeeksCompleted + 1} of ${career.campWeeksTotal}`,
        status: getCampStatus(),
        opponentSummary: career.selectedOpponent
            ? {
                name: career.selectedOpponent.name,
                meta: `${career.selectedOpponent.nickname} · ${formatRecord(career.selectedOpponent.record)} · ${career.selectedOpponent.archetype.name}${career.contract ? ` · ${career.contract.eventName}` : ''}`,
                blurb: career.selectedOpponent.blurb
            }
            : null,
        coachCards: COACHES.map(coach => {
            const relationship = state.career.coachRelationships[coach.id];
            const reputationLocked = relationship.gymReputation < coach.reputationRequired;
            const cashLocked = state.career.cash < coach.fee;
            const switchLocked = state.career.campWeeksCompleted > 0 && state.career.selectedCoach?.id !== coach.id;
            return {
                id: coach.id,
                selected: state.career.selectedCoach?.id === coach.id,
                disabled: switchLocked || reputationLocked || cashLocked,
                name: coach.name,
                sub: reputationLocked
                    ? `${coach.gym} · Need ${coach.reputationRequired} gym rep`
                    : cashLocked
                        ? `${coach.gym} · Need ${formatMoney(coach.fee)}`
                        : `${coach.gym} · Fee ${formatMoney(coach.fee)}`,
                specialty: coach.specialty,
                gymReputation: relationship.gymReputation,
                campsCompleted: relationship.campsCompleted,
                traitLabel: coach.longTermTrait.label,
                traitDescription: coach.longTermTrait.description
            };
        }),
        metrics: [
            ['Cash', formatMoney(career.cash)],
            ['Rank', getCurrentGymRankLabel()],
            ['Fitness', `${career.fitness}%`],
            ['Morale', `${career.morale}%`],
            ['Sharpness', `${career.sharpness}%`],
            ['Fatigue', `${career.fatigue}%`],
            ['Cut', `${career.weightCutPressure}%`],
            ['Warnings', `${career.overtrainingWarnings}`]
        ].map(([label, value]) => ({ label, value })),
        coachNote: selectedCoach && coachRelationship
            ? `${selectedCoach.name} is signed for ${formatMoney(career.selectedCoach.feePaid)}. Gym reputation is ${coachRelationship.gymReputation}, and ${selectedCoach.longTermTrait.label} has triggered ${coachRelationship.longTermBoosts} time(s).`
            : career.contract
                ? `${career.contract.eventName} is booked. Bankroll ${formatMoney(career.cash)}. Hire a coach and get camp moving.`
                : `Bankroll ${formatMoney(career.cash)}. Sign a fight first, then hire the coach.`,
        injuries: career.injuries.slice(),
        actionCards: Object.entries(GYM_ACTIONS).map(([key, action]) => ({
            key,
            label: action.label,
            week: `Week ${Math.min(career.campWeeksCompleted + 1, career.campWeeksTotal)}`,
            copy: action.description,
            disabled: campComplete || !career.selectedCoach
        })),
        history: career.trainingHistory.slice().reverse(),
        completeNote: campComplete
            ? `${career.contract?.eventName || 'Fight night'} is ready. The fight scene is unlocked.`
            : `${career.campWeeksTotal - career.campWeeksCompleted} training weeks remain.`,
        canFight: campComplete && Boolean(career.contract)
    };
}
