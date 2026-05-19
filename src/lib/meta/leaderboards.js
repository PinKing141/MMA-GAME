/**
 * Cross-save leaderboards. Submitted to whenever a career achieves
 * a milestone (title win, fastest title run, longest finish streak,
 * total earnings).
 */

import { submitLeaderboardEntry, getLeaderboard, getAllLeaderboards } from './meta-store.js';

export const LEADERBOARDS = [
    {
        key: 'most-wins',
        title: 'Most Career Wins',
        valueLabel: 'Wins'
    },
    {
        key: 'most-finishes',
        title: 'Most Finishes',
        valueLabel: 'Finishes'
    },
    {
        key: 'fastest-title',
        title: 'Fastest Title Run',
        valueLabel: 'Fights to Belt',
        lowerIsBetter: true
    },
    {
        key: 'longest-streak',
        title: 'Longest Win Streak',
        valueLabel: 'Streak'
    },
    {
        key: 'career-earnings',
        title: 'Career Earnings',
        valueLabel: '$'
    },
    {
        key: 'title-defenses',
        title: 'Most Title Defenses',
        valueLabel: 'Defenses'
    }
];

const BOARD_LOOKUP = Object.fromEntries(LEADERBOARDS.map(b => [b.key, b]));

function buildEntry(state, value) {
    const setup = state.setup || {};
    const career = state.career || {};
    return {
        fighterName: [setup.firstName, setup.lastName].filter(Boolean).join(' ').trim() || 'Unnamed',
        countryCode: setup.country?.code || null,
        record: `${career.record?.wins || 0}-${career.record?.losses || 0}-${career.record?.draws || 0}`,
        difficulty: state.difficulty || 'normal',
        ngPlusTier: state.ngPlusTier || 0,
        careerId: career.careerId || null,
        value
    };
}

/**
 * Submit every applicable leaderboard from the current state. Idempotent
 * for the same value — duplicates are fine since the board is sorted +
 * capped.
 */
export function submitLeaderboards({ state, lastFight }) {
    const career = state.career || {};
    const record = career.record || {};
    const totalWins = record.wins || 0;
    const finishes = record.finishes || 0;
    const streak = career.playerStreak || 0;
    const earnings = (career.eventHistory || []).reduce((s, h) => s + (h.purseEarned || 0), 0);
    const titleWins = career.playerTitleWins || 0;

    if (totalWins > 0) submitLeaderboardEntry('most-wins', buildEntry(state, totalWins));
    if (finishes > 0) submitLeaderboardEntry('most-finishes', buildEntry(state, finishes));
    if (streak > 0) submitLeaderboardEntry('longest-streak', buildEntry(state, streak));
    if (earnings > 0) submitLeaderboardEntry('career-earnings', buildEntry(state, earnings));

    // Title-shot specific boards.
    if (titleWins >= 1 && career.firstTitleFightIndex !== undefined) {
        submitLeaderboardEntry(
            'fastest-title',
            buildEntry(state, career.firstTitleFightIndex),
            { lowerIsBetter: true }
        );
    }
    if (titleWins >= 1) {
        submitLeaderboardEntry('title-defenses', buildEntry(state, career.titleDefenseCount || 0));
    }
}

export function getLeaderboardsViewModel() {
    const all = getAllLeaderboards();
    return LEADERBOARDS.map(board => ({
        ...board,
        entries: (all[board.key] || []).slice(0, 10)
    }));
}

export { getLeaderboard, BOARD_LOOKUP };
