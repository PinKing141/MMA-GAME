/**
 * Matchmaker / booking logic.
 *
 * Drives every opponent offer the player sees and the AI-vs-AI fight
 * cards the world simulator generates. The matchmaker considers:
 *
 *  - divisional ranking: prefer opponents within a window of the
 *    fighter's current rank (top-15 fighters fight other top-15s)
 *  - title-shot eligibility: a ranked #1 contender with the requisite
 *    streak gets a championship offer instead
 *  - callouts: a fighter the player explicitly called out gets
 *    elevated, even if the matchmaker would have offered someone else
 *  - draw cards: promotions weight in box-office: a fighter with high
 *    prestige (recent finishes, callouts, hype) gets booked into
 *    higher-paying co-mains and main events
 *  - event-tier matchmaking: APEX main events need top-5 vs top-5;
 *    APEX prelims pair top-15 with #15+; CIRCUIT shows are free-form
 *
 * The booking reasoning is exposed on each offer so the UI can
 * surface "why" the matchmaker thinks the fight makes sense.
 */

import { PROMOTION_TIERS } from './promotions.js';

const RANK_WINDOWS = {
    APEX_MAIN: 5,       // top-5 vs top-5
    APEX_COMAIN: 8,     // top-8 vs top-10
    APEX_PRELIM: 15,    // any ranked, with similar pairings
    BANNER_MAIN: 6,
    BANNER_COMAIN: 10,
    FRONTIER_MAIN: 8,
    FRONTIER_COMAIN: 12,
    CIRCUIT: 99         // no ranking constraints
};

function getDrawScore(fighter) {
    if (!fighter) return 0;
    const finishRate = fighter.record.wins > 0
        ? (fighter.record.finishes || 0) / fighter.record.wins
        : 0;
    const titleBonus = fighter.titleHolder ? 40 : 0;
    const rankBonus = fighter.rank !== null && fighter.rank <= 15
        ? (16 - fighter.rank) * 2
        : 0;
    const recordBonus = (fighter.record.wins || 0) * 0.6 - (fighter.record.losses || 0) * 0.4;
    return titleBonus + rankBonus + recordBonus + finishRate * 8;
}

function getBookingReason({ playerRank, opponent, slotType, eventTier, callout }) {
    if (callout) {
        return `${opponent.name} accepts the callout — the promotion likes the heat.`;
    }
    if (opponent.titleHolder) {
        return `Championship opportunity: ${opponent.name} defending the strap.`;
    }
    if (slotType === 'TITLE_ELIMINATOR') {
        return `Title eliminator — winner gets the next shot at the belt.`;
    }
    if (playerRank !== null && opponent.rank !== null && Math.abs(playerRank - opponent.rank) <= 3) {
        return `Direct ranking match — #${playerRank} vs #${opponent.rank} is exactly the fight the division needs.`;
    }
    if (slotType === 'MAIN_EVENT') {
        return `Main event slot — the matchmaker is selling tickets on draw and storyline.`;
    }
    if (slotType === 'COMAIN') {
        return `Co-main pairing — a competitive fight that sets up the headline storyline.`;
    }
    if (eventTier === 'CIRCUIT') {
        return `Regional show booking — competitive matchup, opportunity to build a record.`;
    }
    return `Promotion sees a competitive matchup at this stage of both careers.`;
}

/**
 * Compute the rank window allowed for a (promotion tier, slot type)
 * combination. Falls back to the loosest window if no rule applies.
 */
function getRankWindow(tier, slotType) {
    const key = `${tier}_${slotType}`;
    return RANK_WINDOWS[key] || RANK_WINDOWS[tier] || RANK_WINDOWS.CIRCUIT;
}

/**
 * Title-shot eligibility check. A fighter earns a title shot when:
 *  - they're top-5 in the division
 *  - they're on a 3+ win streak
 *  - or they're the explicit #1 contender
 */
export function isEligibleForTitleShot({ rank, streak, isNumberOneContender }) {
    if (isNumberOneContender) return true;
    if (rank === null || rank > 5) return false;
    return streak >= 3;
}

/**
 * Pick a candidate opponent pool for a player from a promotion's
 * roster. Filters by:
 *  - same weight class
 *  - same promotion
 *  - excludes player themselves
 *  - rank within window for the slot type
 *  - excludes already-booked opponents (callers can pass `excludeIds`)
 */
export function selectCandidatePool({
    roster,
    weightClassKey,
    promotionId,
    playerRank = null,
    slotType = 'PRELIM',
    eventTier = 'APEX',
    excludeIds = []
}) {
    const window = getRankWindow(eventTier, slotType);
    const exclude = new Set(excludeIds);

    return roster.filter(f => {
        if (exclude.has(f.id)) return false;
        if (f.weightClassKey !== weightClassKey) return false;
        if (f.promotionId !== promotionId) return false;
        if (f.titleHolder && slotType !== 'TITLE_SHOT') return false;

        if (slotType === 'TITLE_SHOT') {
            return f.titleHolder;
        }

        if (playerRank !== null && f.rank !== null) {
            return Math.abs(playerRank - f.rank) <= window;
        }
        // Player unranked → match against any unranked or barely-ranked.
        if (playerRank === null) {
            return f.rank === null || f.rank > 12;
        }
        return f.rank === null && playerRank > 10;
    });
}

/**
 * Propose 3 opponents for a player given their current standing.
 * Always returns up to 3 distinct candidates ranked by booking
 * desirability. Each entry includes a `reason` string the UI can
 * surface alongside the offer.
 */
export function proposeOpponentsForPlayer({
    roster,
    weightClassKey,
    promotionId,
    playerRank = null,
    streak = 0,
    isNumberOneContender = false,
    callouts = [],
    rng = Math.random
}) {
    const promo = roster.find(f => f.promotionId === promotionId);
    const eventTier = promo?.promotionTier || 'CIRCUIT';
    const proposals = [];

    // 1) Title shot, if eligible.
    if (isEligibleForTitleShot({ rank: playerRank, streak, isNumberOneContender })) {
        const champPool = selectCandidatePool({
            roster, weightClassKey, promotionId,
            slotType: 'TITLE_SHOT', eventTier
        });
        if (champPool.length > 0) {
            const champion = champPool[0];
            proposals.push({
                opponent: champion,
                slotType: 'TITLE_SHOT',
                reason: getBookingReason({ playerRank, opponent: champion, slotType: 'TITLE_SHOT', eventTier }),
                eventTier
            });
        }
    }

    // 2) Honor active callouts first — the matchmaker likes heat.
    callouts.forEach(calloutId => {
        const opponent = roster.find(f => f.id === calloutId);
        if (opponent && opponent.weightClassKey === weightClassKey && opponent.promotionId === promotionId) {
            const alreadyProposed = proposals.some(p => p.opponent.id === opponent.id);
            if (!alreadyProposed) {
                proposals.push({
                    opponent,
                    slotType: 'CALLOUT',
                    reason: getBookingReason({ playerRank, opponent, slotType: 'COMAIN', eventTier, callout: true }),
                    eventTier
                });
            }
        }
    });

    // 3) Main / co-main slot — closest ranking match.
    const mainPool = selectCandidatePool({
        roster, weightClassKey, promotionId, playerRank,
        slotType: 'MAIN_EVENT', eventTier,
        excludeIds: proposals.map(p => p.opponent.id)
    });
    const mainPick = mainPool.sort((a, b) => {
        const rankDiffA = playerRank !== null && a.rank !== null ? Math.abs(playerRank - a.rank) : 99;
        const rankDiffB = playerRank !== null && b.rank !== null ? Math.abs(playerRank - b.rank) : 99;
        return rankDiffA - rankDiffB;
    })[0];
    if (mainPick) {
        proposals.push({
            opponent: mainPick,
            slotType: 'MAIN_EVENT',
            reason: getBookingReason({ playerRank, opponent: mainPick, slotType: 'MAIN_EVENT', eventTier }),
            eventTier
        });
    }

    // 4) Filler — a draw-card pick to round out the offers.
    const fillerPool = selectCandidatePool({
        roster, weightClassKey, promotionId, playerRank,
        slotType: 'PRELIM', eventTier,
        excludeIds: proposals.map(p => p.opponent.id)
    });
    const fillerPick = fillerPool.sort((a, b) => getDrawScore(b) - getDrawScore(a))[0];
    if (fillerPick) {
        proposals.push({
            opponent: fillerPick,
            slotType: 'PRELIM',
            reason: getBookingReason({ playerRank, opponent: fillerPick, slotType: 'PRELIM', eventTier }),
            eventTier
        });
    }

    return proposals.slice(0, 3);
}

/**
 * AI-vs-AI matchmaker. Builds a believable fight card for a single
 * event night: the matchmaker pairs ranked fighters at the top, fills
 * out the mid-card with neighboring ranks, and slots draw-cards
 * (high-finish-rate fighters) into the co-main.
 *
 * Returns an array of pairings: { red, blue, weightClass, slotType }.
 */
export function buildAIFightCard({
    promotion,
    roster,
    weightClassPool,
    rng = Math.random
}) {
    const tier = PROMOTION_TIERS[promotion.tier];
    const cardSize = tier.prestige >= 70 ? 12 : tier.prestige >= 55 ? 9 : 6;
    const pairings = [];
    const used = new Set();

    // Pick a featured weight class for the main event.
    const featuredWC = weightClassPool[Math.floor(rng() * weightClassPool.length)];
    const featuredDivision = roster.filter(f =>
        f.promotionId === promotion.id && f.weightClassKey === featuredWC
    );

    // Main event: top-3 vs top-5 if possible.
    const topRanked = featuredDivision
        .filter(f => f.rank !== null && f.rank <= 10 && !f.titleHolder)
        .sort((a, b) => (a.rank || 99) - (b.rank || 99));
    if (topRanked.length >= 2) {
        pairings.push({
            red: topRanked[0],
            blue: topRanked[1],
            weightClassKey: featuredWC,
            slotType: 'MAIN_EVENT'
        });
        used.add(topRanked[0].id);
        used.add(topRanked[1].id);
    }

    // Fill remaining slots with adjacent-ranked pairs across divisions.
    while (pairings.length < cardSize) {
        const wc = weightClassPool[Math.floor(rng() * weightClassPool.length)];
        const division = roster.filter(f =>
            f.promotionId === promotion.id &&
            f.weightClassKey === wc &&
            !used.has(f.id) &&
            !f.titleHolder
        ).sort((a, b) => (a.rank || 99) - (b.rank || 99));
        if (division.length < 2) break;

        // Pair adjacent fighters in the depth chart.
        const red = division[0];
        const blue = division[1 + Math.floor(rng() * Math.min(2, division.length - 1))];
        if (!blue) break;

        pairings.push({
            red,
            blue,
            weightClassKey: wc,
            slotType: pairings.length === 1 ? 'COMAIN' : 'PRELIM'
        });
        used.add(red.id);
        used.add(blue.id);
    }

    return pairings;
}
