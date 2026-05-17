import { COUNTRIES } from '../data/countries.js';
import { ARCHETYPE_LOOKUP } from '../data/archetypes.js';
import { ALL_ATTRIBUTES, MIN_ATTRIBUTE, POINTS_BUDGET } from '../data/attributes.js';
import { COACHES } from '../data/coaches.js';
import { ROSTER } from '../data/roster.js';
import { buildPresetStats, clamp, getOverallAverage } from '../utils/calculations.js';

const MIN_AGE = 18;
const MAX_AGE = 60;

export const SCENE_NAMES = ['setup', 'frame', 'allocate', 'profile', 'opponent', 'contract', 'gym-picker', 'gym', 'fight'];

function createDefaultSetupState() {
    return {
        firstName: '',
        lastName: '',
        country: COUNTRIES.find(country => country.code === 'US') || COUNTRIES[0],
        age: 20,
        feet: 5,
        inches: 10,
        weight: 170,
        reach: 71,
        hand: 'right'
    };
}

export const state = {
    currentScene: 'setup',
    setup: createDefaultSetupState(),
    stats: {},
    archetype: null,
    pointsTotal: POINTS_BUDGET,
    pointsRemaining: POINTS_BUDGET,
    selectedStat: null,
    selectedPreset: 'all-rounder',
    career: createDefaultCareerState()
};

function createCountryLookup() {
    return Object.fromEntries(COUNTRIES.map(country => [country.code, country]));
}

function getDifficultyLabel(difficultyBias) {
    if (difficultyBias >= 7) {
        return 'High Risk';
    }

    if (difficultyBias >= 4) {
        return 'Ranked Test';
    }

    if (difficultyBias >= 1) {
        return 'Competitive';
    }

    return 'Manageable';
}

function createCoachRelationships() {
    return Object.fromEntries(COACHES.map(coach => [coach.id, {
        coachId: coach.id,
        gym: coach.gym,
        gymReputation: 0,
        campsCompleted: 0,
        totalFeesPaid: 0,
        longTermBoosts: 0
    }]));
}

function createRosterState() {
    const countryLookup = createCountryLookup();

    return ROSTER.map(entry => {
        const archetype = ARCHETYPE_LOOKUP[entry.archetypeKey];
        const baseStats = buildPresetStats(archetype);
        const stats = Object.fromEntries(Object.entries(baseStats).map(([key, value]) => {
            const weightedBonus = archetype.weights[key] >= 8 ? 1 : 0;
            return [key, clamp(value + entry.overallModifier + weightedBonus, MIN_ATTRIBUTE, 99)];
        }));

        return {
            ...entry,
            country: countryLookup[entry.countryCode] || COUNTRIES[0],
            archetype,
            stats,
            overall: getOverallAverage(stats),
            difficulty: getDifficultyLabel(entry.difficultyBias)
        };
    });
}

function createPlayerRankings() {
    return {};
}

function createDefaultCareerState() {
    return {
        cash: 6500,
        fitness: 100,
        morale: 100,
        sharpness: 35,
        reputation: 0,
        campWeeksCompleted: 0,
        campWeeksTotal: 4,
        fatigue: 0,
        weightCutPressure: 22,
        overtrainingWarnings: 0,
        injuries: [],
        trainingHistory: [],
        availableEvents: [],
        selectedEvent: null,
        contract: null,
        eventHistory: [],
        selectedCoach: null,
        selectedOpponent: null,
        availableOpponents: [],
        roster: createRosterState(),
        playerRankings: createPlayerRankings(),
        coachRelationships: createCoachRelationships(),
        record: {
            wins: 0,
            losses: 0,
            draws: 0,
            finishes: 0
        },
        lastFightResult: null
    };
}

export function resetSetup() {
    state.setup = createDefaultSetupState();
}

export function resetCareer() {
    state.career = createDefaultCareerState();
}

export function resetCampProgress() {
    state.career.campWeeksCompleted = 0;
    state.career.campWeeksTotal = 4;
    state.career.fatigue = 0;
    state.career.weightCutPressure = 22;
    state.career.overtrainingWarnings = 0;
    state.career.injuries = [];
    state.career.trainingHistory = [];
    state.career.selectedCoach = null;
    state.career.selectedOpponent = null;
    state.career.availableOpponents = [];
}

export function resetStats() {
    ALL_ATTRIBUTES.forEach(attribute => {
        state.stats[attribute.key] = MIN_ATTRIBUTE;
    });
    state.archetype = null;
    state.pointsRemaining = state.pointsTotal;
    state.selectedStat = ALL_ATTRIBUTES[0]?.key || null;
    state.selectedPreset = 'all-rounder';
}

export function resetGame() {
    state.currentScene = 'setup';
    resetSetup();
    resetStats();
    resetCareer();
}

export function hydrateState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return false;
    }

    const defaultSetup = createDefaultSetupState();
    const setupSnapshot = snapshot.setup || {};
    const countryCode = setupSnapshot.country?.code || setupSnapshot.countryCode || defaultSetup.country.code;

    state.currentScene = SCENE_NAMES.includes(snapshot.currentScene) ? snapshot.currentScene : 'setup';
    state.setup = {
        ...defaultSetup,
        ...setupSnapshot,
        country: COUNTRIES.find(country => country.code === countryCode) || defaultSetup.country,
        age: clamp(parseInt(setupSnapshot.age, 10) || defaultSetup.age, MIN_AGE, MAX_AGE)
    };

    const statsSnapshot = snapshot.stats || {};
    state.stats = {};
    ALL_ATTRIBUTES.forEach(attribute => {
        state.stats[attribute.key] = clamp(Number(statsSnapshot[attribute.key] ?? MIN_ATTRIBUTE), MIN_ATTRIBUTE, 99);
    });

    const spentPoints = ALL_ATTRIBUTES.reduce((sum, attribute) => sum + (state.stats[attribute.key] - MIN_ATTRIBUTE), 0);
    state.pointsTotal = POINTS_BUDGET;
    state.pointsRemaining = clamp(
        Number.isFinite(snapshot.pointsRemaining)
            ? Number(snapshot.pointsRemaining)
            : POINTS_BUDGET - spentPoints,
        0,
        POINTS_BUDGET
    );
    state.selectedStat = ALL_ATTRIBUTES.some(attribute => attribute.key === snapshot.selectedStat)
        ? snapshot.selectedStat
        : ALL_ATTRIBUTES[0]?.key || null;
    state.selectedPreset = typeof snapshot.selectedPreset === 'string' ? snapshot.selectedPreset : 'all-rounder';
    state.archetype = snapshot.archetype || null;

    const defaultCareer = createDefaultCareerState();
    const careerSnapshot = snapshot.career || {};
    state.career = {
        ...defaultCareer,
        ...careerSnapshot,
        injuries: Array.isArray(careerSnapshot.injuries) ? careerSnapshot.injuries : [],
        trainingHistory: Array.isArray(careerSnapshot.trainingHistory) ? careerSnapshot.trainingHistory : [],
        availableEvents: Array.isArray(careerSnapshot.availableEvents) ? careerSnapshot.availableEvents : [],
        eventHistory: Array.isArray(careerSnapshot.eventHistory) ? careerSnapshot.eventHistory : [],
        availableOpponents: Array.isArray(careerSnapshot.availableOpponents) ? careerSnapshot.availableOpponents : [],
        roster: Array.isArray(careerSnapshot.roster) ? careerSnapshot.roster : defaultCareer.roster,
        playerRankings: {
            ...defaultCareer.playerRankings,
            ...(careerSnapshot.playerRankings || {})
        },
        coachRelationships: {
            ...defaultCareer.coachRelationships,
            ...(careerSnapshot.coachRelationships || {})
        },
        record: {
            ...defaultCareer.record,
            ...(careerSnapshot.record || {})
        },
        selectedEvent: careerSnapshot.selectedEvent || null,
        contract: careerSnapshot.contract || null,
        selectedCoach: careerSnapshot.selectedCoach || null,
        selectedOpponent: careerSnapshot.selectedOpponent || null,
        lastFightResult: careerSnapshot.lastFightResult || null
    };

    return true;
}

resetGame();
