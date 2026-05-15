import { COACHES, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from '../lib/data.js';
import { state } from '../lib/core.js';

const GYM_ACTIONS = {
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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

function getCurrentRankLabel() {
    const weightClassKey = state.career.selectedOpponent?.weightClassKey;
    if (!weightClassKey) {
        return 'NR';
    }

    const rank = state.career.playerRankings[weightClassKey] ?? null;
    return rank ? `#${rank}` : 'NR';
}

function getCoach() {
    return state.career.selectedCoach ? COACHES.find(coach => coach.id === state.career.selectedCoach.id) || null : null;
}

function getCoachRelationship(coachId) {
    return state.career.coachRelationships[coachId];
}

function getCoachBonus(actionKey) {
    const coach = getCoach();
    return coach?.actionBonuses[actionKey] || { stats: {}, career: {} };
}

function getCampStatus() {
    const { career } = state;
    if (!career.selectedOpponent) {
        return 'No opponent is booked. Go back and lock the fight before trying to build a camp.';
    }

    if (!career.selectedCoach) {
        return 'Pick a coach first. The gym bonus layer now shapes every week of camp.';
    }

    if (career.campWeeksCompleted >= career.campWeeksTotal) {
        return 'Camp complete. The opponent is booked and the fight scene is ready.';
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

function renderCoachCards() {
    return COACHES.map(coach => {
        const relationship = getCoachRelationship(coach.id);
        const reputationLocked = relationship.gymReputation < coach.reputationRequired;
        const cashLocked = state.career.cash < coach.fee;
        const switchLocked = state.career.campWeeksCompleted > 0 && state.career.selectedCoach?.id !== coach.id;
        const disabled = switchLocked || reputationLocked || cashLocked;
        const statusLabel = reputationLocked
            ? `Need ${coach.reputationRequired} gym rep`
            : cashLocked
                ? `Need ${formatMoney(coach.fee)}`
                : `Fee ${formatMoney(coach.fee)}`;

        return `
        <button class="coach-card ${state.career.selectedCoach?.id === coach.id ? 'selected' : ''}" data-coach-id="${coach.id}" ${disabled ? 'disabled' : ''}>
            <div class="coach-card-head">
                <div>
                    <div class="coach-card-name">${coach.name}</div>
                    <div class="coach-card-sub">${coach.gym} · ${statusLabel}</div>
                </div>
            </div>
            <p class="coach-card-copy">${coach.specialty}</p>
            <div class="coach-card-meta-row">
                <span>Gym Rep ${relationship.gymReputation}</span>
                <span>Camps ${relationship.campsCompleted}</span>
            </div>
            <div class="coach-card-trait">
                <strong>${coach.longTermTrait.label}</strong>
                <span>${coach.longTermTrait.description}</span>
            </div>
        </button>
    `;
    }).join('');
}

function renderOpponentSummary() {
    const opponent = state.career.selectedOpponent;

    if (!opponent) {
        return '<div class="gym-log-empty">No opponent booked yet.</div>';
    }

    return `
        <div class="opponent-summary-name">${opponent.name}</div>
        <div class="opponent-summary-meta">${opponent.nickname} · ${opponent.record.wins}-${opponent.record.losses}-${opponent.record.draws} · ${opponent.archetype.name}</div>
        <p class="opponent-summary-copy">${opponent.blurb}</p>
    `;
}

function renderCampActions() {
    const campComplete = state.career.campWeeksCompleted >= state.career.campWeeksTotal;
    const coachLocked = Boolean(state.career.selectedCoach);

    return Object.entries(GYM_ACTIONS).map(([key, action]) => `
        <button class="gym-action-card" data-gym-action="${key}" ${campComplete || !coachLocked ? 'disabled' : ''}>
            <div class="gym-action-head">
                <span class="gym-action-label">${action.label}</span>
                <span class="gym-action-week">Week ${Math.min(state.career.campWeeksCompleted + 1, state.career.campWeeksTotal)}</span>
            </div>
            <p class="gym-action-copy">${action.description}</p>
        </button>
    `).join('');
}

function renderHistory() {
    if (!state.career.trainingHistory.length) {
        return '<div class="gym-log-empty">No training logged yet. Pick the first week focus.</div>';
    }

    return state.career.trainingHistory.slice().reverse().map(entry => `
        <div class="gym-log-row">
            <span class="gym-log-week">Week ${entry.week}</span>
            <div>
                <div class="gym-log-title">${entry.label}</div>
                <p class="gym-log-note">${entry.note}</p>
            </div>
        </div>
    `).join('');
}

function renderFocusSummary() {
    const focusStats = [
        ['Cash', formatMoney(state.career.cash)],
        ['Rank', getCurrentRankLabel()],
        ['Fitness', `${state.career.fitness}%`],
        ['Morale', `${state.career.morale}%`],
        ['Sharpness', `${state.career.sharpness}%`],
        ['Fatigue', `${state.career.fatigue}%`],
        ['Cut', `${state.career.weightCutPressure}%`],
        ['Warnings', `${state.career.overtrainingWarnings}`]
    ];

    return focusStats.map(([label, value]) => `
        <div class="gym-metric">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
        </div>
    `).join('');
}

function renderCoachEconomyNote() {
    const coach = getCoach();
    if (!coach) {
        return `Bankroll ${formatMoney(state.career.cash)}. Hire a coach to pay the camp fee and start building gym reputation.`;
    }

    const relationship = getCoachRelationship(coach.id);
    return `${coach.name} is signed for ${formatMoney(state.career.selectedCoach.feePaid)}. Gym reputation is ${relationship.gymReputation}, and ${coach.longTermTrait.label} has triggered ${relationship.longTermBoosts} time(s).`;
}

function renderInjuries() {
    if (!state.career.injuries.length) {
        return '<div class="gym-log-empty">No active camp injuries.</div>';
    }

    return state.career.injuries.map(injury => `
        <div class="injury-pill">
            <span>${injury.name}</span>
            <strong>-${injury.penalty}</strong>
        </div>
    `).join('');
}

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

export function renderGymScene() {
    const { setup, career } = state;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter';
    const campComplete = career.campWeeksCompleted >= career.campWeeksTotal;

    document.getElementById('gym-name').textContent = fullName;
    document.getElementById('gym-week').textContent = campComplete
        ? `Camp complete · ${career.campWeeksTotal}/${career.campWeeksTotal} weeks`
        : `Week ${career.campWeeksCompleted + 1} of ${career.campWeeksTotal}`;
    document.getElementById('gym-status').textContent = getCampStatus();
    document.getElementById('gym-opponent-summary').innerHTML = renderOpponentSummary();
    document.getElementById('gym-coaches').innerHTML = renderCoachCards();
    document.getElementById('gym-metrics').innerHTML = renderFocusSummary();
    document.getElementById('gym-coach-note').textContent = renderCoachEconomyNote();
    document.getElementById('gym-injuries').innerHTML = renderInjuries();
    document.getElementById('gym-actions').innerHTML = renderCampActions();
    document.getElementById('gym-history').innerHTML = renderHistory();
    document.getElementById('gym-complete-note').textContent = campComplete
        ? 'Camp wrapped. The fight scene is unlocked for the booked opponent.'
        : `${career.campWeeksTotal - career.campWeeksCompleted} training weeks remain.`;
    document.getElementById('btn-fight-night').disabled = !campComplete;
}

export function selectCoach(coachKey) {
    const coach = COACHES.find(entry => entry.id === coachKey);
    const relationship = coach ? getCoachRelationship(coach.id) : null;

    if (!coach || !relationship) {
        return;
    }

    if (state.career.selectedCoach?.id === coach.id) {
        return;
    }

    if (state.career.campWeeksCompleted > 0 && state.career.selectedCoach) {
        return;
    }

    if (relationship.gymReputation < coach.reputationRequired || state.career.cash < coach.fee) {
        return;
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
    renderGymScene();
}

export function applyGymAction(actionKey) {
    const action = GYM_ACTIONS[actionKey];
    const { career } = state;
    const coach = getCoach();
    const coachBonus = getCoachBonus(actionKey);

    if (!action || !career.selectedOpponent || !coach || career.campWeeksCompleted >= career.campWeeksTotal) {
        return;
    }

    Object.entries(action.statChanges).forEach(([key, delta]) => {
        const currentValue = state.stats[key] || MIN_ATTRIBUTE;
        state.stats[key] = clamp(currentValue + delta, MIN_ATTRIBUTE, MAX_ATTRIBUTE);
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
    const noteSuffix = [
        coachBonus.stats && Object.keys(coachBonus.stats).length ? `${coach.name} added a gym-specific bonus.` : '',
        injury ? `Injury suffered: ${injury.name}.` : '',
        overtraining ? 'Overtraining penalty hit the week.' : '',
        career.weightCutPressure >= 65 ? 'The weight cut is becoming a problem.' : ''
    ].filter(Boolean).join(' ');
    career.trainingHistory.push({
        week: career.campWeeksCompleted,
        label: action.label,
        note: noteSuffix ? `${action.description} ${noteSuffix}` : action.description
    });

    renderGymScene();
}