/**
 * Achievement catalog + checker.
 *
 * Each achievement defines:
 *  - id: stable string key
 *  - title / description: display strings
 *  - tier: bronze / silver / gold / platinum (affects badge color)
 *  - hidden: true => only show after unlock
 *  - check(ctx): function returning true when ctx satisfies the
 *    condition. ctx = { state, lastFight, action }
 *
 * Achievements are checked after every meaningful action (fight
 * resolution, rank update, career milestone). Already-unlocked
 * achievements are skipped.
 */

import { unlockAchievement, isAchievementUnlocked, getUnlockedAchievements } from './meta-store.js';

export const ACHIEVEMENTS = [
    {
        id: 'first-fight',
        title: 'First Walk',
        description: 'Walk to the cage for the first time.',
        tier: 'bronze',
        check: ({ state }) => (state?.career?.record?.wins || 0) + (state?.career?.record?.losses || 0) + (state?.career?.record?.draws || 0) >= 1
    },
    {
        id: 'first-win',
        title: 'Hand Raised',
        description: 'Win your debut fight.',
        tier: 'bronze',
        check: ({ state, lastFight }) => lastFight?.result === 'Win' && state?.career?.record?.wins === 1
    },
    {
        id: 'first-finish',
        title: 'Statement Win',
        description: 'Score your first KO/TKO/submission finish.',
        tier: 'bronze',
        check: ({ lastFight }) => lastFight?.result === 'Win' && lastFight?.method && !lastFight.method.includes('Decision')
    },
    {
        id: 'first-ko',
        title: 'Lights Out',
        description: 'Land your first knockout.',
        tier: 'silver',
        check: ({ lastFight }) => lastFight?.result === 'Win' && lastFight?.method === 'KO'
    },
    {
        id: 'first-sub',
        title: 'Forces the Tap',
        description: 'Lock in a submission finish.',
        tier: 'silver',
        check: ({ lastFight }) => lastFight?.result === 'Win' && (lastFight?.method || '').toLowerCase().includes('sub')
    },
    {
        id: 'three-finish-streak',
        title: 'Hot Hands',
        description: 'Finish three fights in a row.',
        tier: 'silver',
        check: ({ state }) => {
            const history = state?.career?.eventHistory || [];
            if (history.length < 3) return false;
            return history.slice(0, 3).every(h => h.result === 'Win');
        }
    },
    {
        id: 'top-15',
        title: 'Crack the Rankings',
        description: 'Enter your division\'s published top-15.',
        tier: 'silver',
        check: ({ state }) => {
            const ranks = state?.career?.playerRankings || {};
            return Object.values(ranks).some(r => r !== null && r <= 15);
        }
    },
    {
        id: 'top-5',
        title: 'Contender',
        description: 'Climb into the divisional top-5.',
        tier: 'gold',
        check: ({ state }) => {
            const ranks = state?.career?.playerRankings || {};
            return Object.values(ranks).some(r => r !== null && r <= 5);
        }
    },
    {
        id: 'number-one',
        title: '#1 Contender',
        description: 'Earn the #1 ranking in a division.',
        tier: 'gold',
        check: ({ state }) => {
            const ranks = state?.career?.playerRankings || {};
            return Object.values(ranks).some(r => r === 1);
        }
    },
    {
        id: 'champion',
        title: 'World Champion',
        description: 'Win a title.',
        tier: 'platinum',
        check: ({ state }) => (state?.career?.playerTitleWins || 0) >= 1
    },
    {
        id: 'two-division',
        title: 'Two-Division Star',
        description: 'Hold rankings in two different weight classes.',
        tier: 'gold',
        check: ({ state }) => {
            const ranks = state?.career?.playerRankings || {};
            return Object.values(ranks).filter(r => r !== null && r <= 15).length >= 2;
        }
    },
    {
        id: 'comeback-win',
        title: 'Late Mountain',
        description: 'Win a fight after losing your previous one.',
        tier: 'silver',
        check: ({ state, lastFight }) => {
            const history = state?.career?.eventHistory || [];
            return lastFight?.result === 'Win' && history.length >= 2 && history[1]?.result === 'Loss';
        }
    },
    {
        id: 'hundred-k',
        title: 'Six-Figure Purse',
        description: 'Earn $100,000 from a single fight.',
        tier: 'gold',
        check: ({ lastFight }) => (lastFight?.purseEarned || 0) >= 100000
    },
    {
        id: 'iron-chin',
        title: 'Iron Chin',
        description: 'Survive a knockdown and still win the fight.',
        tier: 'silver',
        check: ({ lastFight }) => false // Set externally on knockdown-survive events.
    },
    {
        id: 'rivalry-trilogy',
        title: 'Trilogy Settled',
        description: 'Fight the same opponent three times.',
        tier: 'gold',
        check: ({ state }) => {
            const rivalries = state?.career?.rivalries || {};
            return Object.values(rivalries).some(r => (r.totalFights || 0) >= 3);
        }
    },
    {
        id: 'undefeated-prospect',
        title: 'Undefeated Prospect',
        description: 'Reach 5-0 without a loss.',
        tier: 'silver',
        check: ({ state }) => {
            const r = state?.career?.record || {};
            return r.wins >= 5 && (r.losses || 0) === 0;
        }
    },
    {
        id: 'ten-wins',
        title: 'Ten in the Books',
        description: 'Reach ten career wins.',
        tier: 'gold',
        check: ({ state }) => (state?.career?.record?.wins || 0) >= 10
    },
    {
        id: 'twentyfive-wins',
        title: 'Quarter-Century',
        description: 'Reach 25 career wins.',
        tier: 'platinum',
        check: ({ state }) => (state?.career?.record?.wins || 0) >= 25
    },
    {
        id: 'ng-plus-one',
        title: 'New Game+',
        description: 'Complete a career and start New Game+.',
        tier: 'gold',
        hidden: true,
        check: () => false // Unlocked manually on NG+ entry.
    }
];

const ACHIEVEMENT_LOOKUP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/**
 * Run every achievement check against the supplied context and
 * unlock newly-satisfied ones. Returns the array of just-unlocked
 * achievement records (full definitions, not just ids).
 */
export function checkAchievements(ctx) {
    const unlocked = [];
    for (const def of ACHIEVEMENTS) {
        if (isAchievementUnlocked(def.id)) continue;
        try {
            if (def.check(ctx)) {
                const careerId = ctx?.state?.career?.careerId || null;
                if (unlockAchievement(def.id, careerId)) {
                    unlocked.push(def);
                }
            }
        } catch {
            // A bad check shouldn't crash the action pipeline.
        }
    }
    return unlocked;
}

export function getAchievementDefinition(id) {
    return ACHIEVEMENT_LOOKUP[id] || null;
}

/**
 * Build a view-model for the achievements UI: every catalog entry
 * with its unlocked flag and timestamp.
 */
export function getAchievementsViewModel() {
    const unlocked = getUnlockedAchievements();
    return ACHIEVEMENTS.map(def => ({
        ...def,
        unlocked: Boolean(unlocked[def.id]),
        unlockedAt: unlocked[def.id]?.unlockedAt || null
    }));
}

/**
 * Manually unlock an achievement (used by external triggers like
 * "Iron Chin" which depends on intra-fight state).
 */
export function unlockById(id, careerId = null) {
    return unlockAchievement(id, careerId);
}
