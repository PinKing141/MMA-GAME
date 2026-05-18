import { MAX_ATTRIBUTE, MIN_ATTRIBUTE } from '../data.js';
import { clamp, state } from '../core.js';

export const GYM_ACTIONS = {
    boxing: {
        label: 'Boxing Rounds',
        description: 'Sharpen hands, rhythm, and pocket reads with focused striking rounds.',
        statChanges: {
            punchSpeed: 2,
            punchPower: 1,
            accuracy: 1,
            headMovement: 1
        },
        careerChanges: {
            sharpness: 12,
            morale: 4,
            fitness: -3,
            fatigue: 9,
            weightCut: 4
        },
        injuryRisk: 18
    },
    wrestling: {
        label: 'Wrestling Grind',
        description: 'Drill entries, wall work, and top pressure until the whole body feels it.',
        statChanges: {
            takedownOffense: 2,
            takedownDefense: 1,
            topControl: 2,
            clinchOffense: 1
        },
        careerChanges: {
            sharpness: 9,
            morale: 2,
            fitness: -4,
            fatigue: 11,
            weightCut: 5
        },
        injuryRisk: 24
    },
    roadwork: {
        label: 'Roadwork',
        description: 'Conditioning and hard miles build pace, lungs, and late-round steadiness.',
        statChanges: {
            cardio: 2,
            chinStrength: 1,
            bodyStrength: 1,
            legStrength: 1
        },
        careerChanges: {
            sharpness: 5,
            morale: 1,
            fitness: 3,
            fatigue: 4,
            weightCut: -2
        },
        injuryRisk: 10
    },
    film: {
        label: 'Film Study',
        description: 'Slow the week down and upgrade reads, composure, and trap setting.',
        statChanges: {
            fightIQ: 2,
            composure: 2,
            cunning: 1,
            accuracy: 1
        },
        careerChanges: {
            sharpness: 6,
            morale: 3,
            fitness: 1,
            fatigue: 2,
            weightCut: 1
        },
        injuryRisk: 3
    },
    recovery: {
        label: 'Recovery Day',
        description: 'Reduce load, settle the body, and protect the camp from burnout.',
        statChanges: {
            cardio: 1,
            composure: 1,
            cutResistance: 1
        },
        careerChanges: {
            sharpness: 2,
            morale: 6,
            fitness: 4,
            fatigue: -10,
            weightCut: -5
        },
        injuryRisk: -8
    }
};

const ACTION_INJURIES = {
    boxing: { name: 'Bruised lead hand', penalty: 4 },
    wrestling: { name: 'Tight neck', penalty: 5 },
    roadwork: { name: 'Shin splints', penalty: 3 },
    film: { name: 'Camp migraine', penalty: 2 },
    recovery: { name: 'Lingering soreness', penalty: 2 }
};

function maybeApplyInjury(actionKey, coach) {
    const riskScore = state.career.fatigue + state.career.weightCutPressure + GYM_ACTIONS[actionKey].injuryRisk - (coach?.injuryBuffer || 0) - Math.round(state.career.fitness / 12);
    const existingInjury = ACTION_INJURIES[actionKey] && state.career.injuries.find(injury => injury.name === ACTION_INJURIES[actionKey].name);

    if (existingInjury || riskScore < 72 || Math.random() >= 0.38) {
        return null;
    }

    const injury = ACTION_INJURIES[actionKey];
    state.career.injuries.push(injury);
    state.career.fitness = clamp(state.career.fitness - injury.penalty, 45, 100);
    state.career.sharpness = clamp(state.career.sharpness - Math.max(2, injury.penalty - 1), 20, 100);
    return injury;
}

function maybeApplyOvertrainingPenalty() {
    if (state.career.fatigue < 82) {
        return false;
    }

    state.career.overtrainingWarnings += 1;
    state.career.morale = clamp(state.career.morale - 4, 40, 100);
    state.career.sharpness = clamp(state.career.sharpness - 5, 20, 100);

    if (state.career.fatigue > 90) {
        state.career.fitness = clamp(state.career.fitness - 3, 45, 100);
    }

    return true;
}

export function applyCampWeekState(actionKey, coach) {
    const action = GYM_ACTIONS[actionKey];
    const { career } = state;
    const coachBonus = coach?.actionBonuses[actionKey] || { stats: {}, career: {} };
    const multiplier = coach?.disciplineMultipliers?.[actionKey] ?? 1.0;

    if (!action || !career.selectedOpponent || !coach || career.campWeeksCompleted >= career.campWeeksTotal) {
        return false;
    }

    /**
     * Discipline multiplier rounds with directional bias: bonuses ceil
     * (so 1.6× of +2 lands as +4, not +3), penalties floor (so 0.85× of
     * +2 lands as +1, not +2). Keeps gym identity visible at low deltas.
     */
    const scaleDelta = (delta) => {
        const scaled = delta * multiplier;
        return multiplier >= 1 ? Math.ceil(scaled) : Math.floor(scaled);
    };

    Object.entries(action.statChanges).forEach(([key, delta]) => {
        const scaled = scaleDelta(delta);
        const currentValue = state.stats[key] || MIN_ATTRIBUTE;
        state.stats[key] = clamp(currentValue + scaled, MIN_ATTRIBUTE, MAX_ATTRIBUTE);
    });

    Object.entries(coachBonus.stats).forEach(([key, delta]) => {
        const currentValue = state.stats[key] || MIN_ATTRIBUTE;
        state.stats[key] = clamp(currentValue + delta, MIN_ATTRIBUTE, MAX_ATTRIBUTE);
    });

    career.fitness = clamp(career.fitness + action.careerChanges.fitness + (coachBonus.career.fitness || 0), 45, 100);
    career.morale = clamp(career.morale + action.careerChanges.morale + (coachBonus.career.morale || 0), 40, 100);
    career.sharpness = clamp(career.sharpness + action.careerChanges.sharpness + (coachBonus.career.sharpness || 0), 20, 100);
    career.fatigue = clamp(career.fatigue + action.careerChanges.fatigue + coach.fatigueModifier, 0, 100);
    career.weightCutPressure = clamp(career.weightCutPressure + action.careerChanges.weightCut + coach.weightCutModifier, 0, 100);
    career.campWeeksCompleted += 1;
    career.reputation = Math.max(career.reputation, Math.floor(career.campWeeksCompleted / 2));

    const injury = maybeApplyInjury(actionKey, coach);
    const overtraining = maybeApplyOvertrainingPenalty();
    const multiplierNote = multiplier > 1.05
        ? `${coach.gym} ran it at ${multiplier.toFixed(2)}× — gains hit harder than baseline.`
        : multiplier < 0.95
            ? `${coach.gym} is weak here (${multiplier.toFixed(2)}×) — pick this less often.`
            : '';
    const noteSuffix = [
        Object.keys(coachBonus.stats).length ? `${coach.name} added a gym-specific bonus.` : '',
        multiplierNote,
        injury ? `Injury suffered: ${injury.name}.` : '',
        overtraining ? 'Overtraining penalty hit the week.' : '',
        career.weightCutPressure >= 65 ? 'The weight cut is becoming a problem.' : ''
    ].filter(Boolean).join(' ');

    career.trainingHistory.push({
        week: career.campWeeksCompleted,
        label: action.label,
        note: noteSuffix ? `${action.description} ${noteSuffix}` : action.description
    });

    return true;
}