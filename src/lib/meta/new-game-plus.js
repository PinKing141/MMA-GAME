/**
 * New Game+ — carry-over progression that triggers when the player
 * finishes a career (retires after a title win, or accepts retirement).
 *
 * Each NG+ tier:
 *  - keeps achievements + leaderboards intact (those live in meta store)
 *  - grants a fresh career with a starting cash + reputation bonus
 *  - bumps opponent difficulty: NG+ AI fighters are stronger
 *  - unlocks a cosmetic ring-walk badge so the player can see they're
 *    on tier N
 */

import { getNGPlusTier, bumpNGPlusTier, recordCompletedCareer } from './meta-store.js';
import { unlockById } from './achievements.js';

const STARTING_BONUS_PER_TIER = {
    1: { cash: 5000, reputation: 6 },
    2: { cash: 12000, reputation: 12 },
    3: { cash: 25000, reputation: 20 },
    4: { cash: 50000, reputation: 30 }
};

export function getStartingBonus(tier = getNGPlusTier()) {
    if (tier <= 0) return { cash: 0, reputation: 0 };
    return STARTING_BONUS_PER_TIER[tier] || STARTING_BONUS_PER_TIER[4];
}

/**
 * Opponent stat / difficulty bias applied at NG+ tier N. Each tier
 * adds +3 to opponent overall and +1 to difficultyBias.
 */
export function getNGPlusOpponentBias(tier = getNGPlusTier()) {
    if (tier <= 0) return { overallModifier: 0, difficultyBias: 0 };
    return {
        overallModifier: tier * 3,
        difficultyBias: tier
    };
}

/**
 * Record the closing career and start NG+. Returns the new tier the
 * player is now on.
 */
export function enterNewGamePlus({ state }) {
    const career = state.career || {};
    const setup = state.setup || {};
    recordCompletedCareer({
        careerId: career.careerId || null,
        fighterName: [setup.firstName, setup.lastName].filter(Boolean).join(' ').trim() || 'Unnamed',
        countryCode: setup.country?.code || null,
        difficulty: state.difficulty || 'normal',
        ngPlusTier: state.ngPlusTier || 0,
        finalRecord: { ...(career.record || {}) },
        titleWins: career.playerTitleWins || 0,
        promotionId: career.playerPromotionId || null,
        eventHistoryLength: (career.eventHistory || []).length
    });
    const tier = bumpNGPlusTier();
    unlockById('ng-plus-one', career.careerId);
    return tier;
}

/**
 * Eligibility: a career can enter NG+ once it has either won a title
 * or amassed >= 15 wins (a long enough run to call complete).
 */
export function isEligibleForNewGamePlus(state) {
    const career = state.career || {};
    const wins = career.record?.wins || 0;
    const titles = career.playerTitleWins || 0;
    return titles >= 1 || wins >= 15;
}
