/**
 * Divisional ranking computation and Top-15 publication.
 *
 * Rankings live per (promotion, weightClass) pair. Each promotion's
 * media ranking system uses:
 *  - record (winning percentage + recent form)
 *  - opposition quality (sum of opponents' overall when known)
 *  - finish quality (a TKO over a ranked fighter weighs more than a
 *    split decision)
 *  - activity (a fighter on a long layoff drops a couple of slots)
 *  - title-holder lock (champion sits at #0, contenders start at #1)
 *
 * The output is a publishedRankings object the UI can read directly:
 *  { promotionId: { weightClassKey: [{ fighterId, rank, change }] } }
 */

import { PROMOTIONS, PROMOTION_TIERS } from './promotions.js';
import { WEIGHT_CLASSES } from '../data/attributes.js';
import { getOverallAverage } from '../utils/calculations.js';

const PUBLISHED_DEPTH = 15;

function computeRankingScore(fighter) {
    if (!fighter || !fighter.record) return 0;
    const wins = fighter.record.wins || 0;
    const losses = fighter.record.losses || 0;
    const draws = fighter.record.draws || 0;
    const finishes = fighter.record.finishes || 0;
    const fights = wins + losses + draws;
    const winRate = fights > 0 ? wins / fights : 0;

    const overall = getOverallAverage(fighter.stats || {});
    const recordPoints = (wins * 6) - (losses * 4) + (finishes * 2);
    const skillPoints = (overall - 65) * 1.2;
    const winRateBonus = winRate * 10;
    const activityPenalty = fighter.layoffWeeks ? Math.min(15, fighter.layoffWeeks * 0.4) : 0;
    const titlePoints = fighter.titleHolder ? 60 + (fighter.titleDefenses || 0) * 6 : 0;
    const tierBonus = (PROMOTION_TIERS[fighter.promotionTier]?.prestige || 30) * 0.2;

    return recordPoints + skillPoints + winRateBonus + titlePoints + tierBonus - activityPenalty;
}

/**
 * Recompute every promotion's divisional rankings from a flat fighter
 * roster. Returns the published rankings object plus per-fighter
 * rank updates (so the action layer can apply them back).
 */
export function publishRankings(fighters, previousRankings = {}) {
    const grouped = {};
    fighters.forEach(f => {
        if (!grouped[f.promotionId]) grouped[f.promotionId] = {};
        if (!grouped[f.promotionId][f.weightClassKey]) grouped[f.promotionId][f.weightClassKey] = [];
        grouped[f.promotionId][f.weightClassKey].push(f);
    });

    const published = {};
    const fighterRankUpdates = {};

    PROMOTIONS.forEach(promo => {
        const tier = PROMOTION_TIERS[promo.tier];
        if (!tier.publishesTop15) return;
        published[promo.id] = {};
        WEIGHT_CLASSES.forEach(wc => {
            const division = grouped[promo.id]?.[wc.key] || [];
            if (division.length === 0) return;

            // Sort: champion first, then by score.
            const sorted = [...division].sort((a, b) => {
                if (a.titleHolder && !b.titleHolder) return -1;
                if (!a.titleHolder && b.titleHolder) return 1;
                return computeRankingScore(b) - computeRankingScore(a);
            });

            const prevSlots = previousRankings[promo.id]?.[wc.key] || [];
            const prevSlotMap = Object.fromEntries(
                prevSlots.map(entry => [entry.fighterId, entry.rank])
            );

            const slots = sorted.slice(0, PUBLISHED_DEPTH).map((fighter, idx) => {
                const rank = fighter.titleHolder ? 0 : idx + (sorted[0]?.titleHolder ? 0 : 1);
                const prevRank = prevSlotMap[fighter.id];
                const change = prevRank === undefined
                    ? null
                    : prevRank - rank;
                fighterRankUpdates[fighter.id] = rank;
                return {
                    fighterId: fighter.id,
                    rank,
                    change,
                    titleHolder: !!fighter.titleHolder,
                    name: fighter.name,
                    record: fighter.record,
                    countryCode: fighter.countryCode
                };
            });

            published[promo.id][wc.key] = slots;
        });
    });

    return { published, fighterRankUpdates };
}

/**
 * Apply rank updates back to the flat fighter list. Mutates in place
 * (the action layer wraps this so callers don't have to).
 */
export function applyRankUpdates(fighters, fighterRankUpdates) {
    fighters.forEach(f => {
        if (fighterRankUpdates[f.id] !== undefined) {
            f.rank = fighterRankUpdates[f.id] || null;
        } else if (f.promotionTier === 'CIRCUIT') {
            // Circuit promotions don't publish — keep their slot null.
            f.rank = null;
        } else if (f.rank !== null && f.rank > PUBLISHED_DEPTH) {
            f.rank = null;
        }
    });
}

/**
 * Look up a single fighter's published rank within their promotion's
 * division (or null if unranked).
 */
export function getPublishedRank(published, promotionId, weightClassKey, fighterId) {
    const division = published?.[promotionId]?.[weightClassKey] || [];
    const slot = division.find(s => s.fighterId === fighterId);
    return slot ? slot.rank : null;
}

/**
 * Public helper: return the top-15 view for a (promotion, weight
 * class) — already structured for direct UI consumption.
 */
export function getDivisionTop15(published, promotionId, weightClassKey) {
    return published?.[promotionId]?.[weightClassKey] || [];
}
