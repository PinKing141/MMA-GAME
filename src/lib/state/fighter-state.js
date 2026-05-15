import { COUNTRIES } from '../data/countries.js';
import { ARCHETYPE_LOOKUP } from '../data/archetypes.js';
import { ALL_ATTRIBUTES, MIN_ATTRIBUTE, POINTS_BUDGET } from '../data/attributes.js';
import { COACHES } from '../data/coaches.js';
import { ROSTER } from '../data/roster.js';
import { buildPresetStats, getOverallAverage } from '../utils/calculations.js';

export const state = {
    setup: {
        firstName: '',
        lastName: '',
        country: COUNTRIES.find(country => country.code === 'US') || COUNTRIES[0],
        age: 20,
        feet: 5,
        inches: 10,
        weight: 170,
        reach: 71,
        hand: 'right'
    },
    stats: {},
    archetype: null,
    pointsTotal: POINTS_BUDGET,
    pointsRemaining: POINTS_BUDGET,
    selectedStat: null,
    selectedPreset: 'all-rounder',
    career: createDefaultCareerState()
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

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
    state.pointsRemaining = state.pointsTotal;
    state.selectedStat = ALL_ATTRIBUTES[0]?.key || null;
    resetCareer();
}

resetStats();
