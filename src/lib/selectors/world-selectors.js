/**
 * Selectors for the world slice. Read-only views suitable for UI
 * consumption — divisional rankings tables, news feed entries,
 * promotion summaries.
 */

import { state } from '../state/fighter-state.js';
import { PROMOTIONS, PROMOTION_TIERS, getPromotion } from '../world-domain/promotions.js';
import { WEIGHT_CLASSES } from '../data/attributes.js';

function getWorld() {
    return state.career.world || { roster: [], publishedRankings: {}, news: [], events: [] };
}

export function selectPromotions() {
    return PROMOTIONS.map(p => ({
        ...p,
        tier: PROMOTION_TIERS[p.tier]
    }));
}

export function selectPlayerPromotion() {
    return getPromotion(state.career.playerPromotionId) || PROMOTIONS[PROMOTIONS.length - 1];
}

/**
 * Return the top-15 view for one division. Each entry is enriched
 * with the fighter's record + nickname for display.
 */
export function selectDivisionTop15(promotionId, weightClassKey) {
    const world = getWorld();
    const slots = world.publishedRankings?.[promotionId]?.[weightClassKey] || [];
    const byId = Object.fromEntries((world.roster || []).map(f => [f.id, f]));
    return slots.map(slot => {
        const fighter = byId[slot.fighterId];
        return {
            ...slot,
            nickname: fighter?.nickname || '',
            promotionId,
            weightClassKey,
            countryName: fighter?.country?.name || '',
            titleDefenses: fighter?.titleDefenses || 0
        };
    });
}

/**
 * Return all divisions for a promotion (ready for a sectioned UI).
 */
export function selectPromotionRankings(promotionId) {
    return WEIGHT_CLASSES
        .map(wc => ({
            weightClassKey: wc.key,
            weightClassName: wc.name,
            top15: selectDivisionTop15(promotionId, wc.key)
        }))
        .filter(division => division.top15.length > 0);
}

/**
 * Latest N news headlines, newest first. Decorated with promotion
 * shortName so the UI doesn't have to look it up.
 */
export function selectNewsFeed(limit = 12) {
    const world = getWorld();
    const promoLookup = Object.fromEntries(PROMOTIONS.map(p => [p.id, p]));
    return (world.news || []).slice(0, limit).map(item => ({
        ...item,
        promotionShortName: promoLookup[item.promotionId]?.shortName || '',
        promotionName: promoLookup[item.promotionId]?.name || ''
    }));
}

/**
 * Recent event log for a single promotion, useful for a "results"
 * view in the UI.
 */
export function selectPromotionEvents(promotionId, limit = 8) {
    const world = getWorld();
    return (world.events || [])
        .filter(e => e.promotionId === promotionId)
        .slice(-limit)
        .reverse();
}

/**
 * Player's current standing across the world: promotion, division
 * rank, streak, eligibility flags. The UI uses this for the career
 * dashboard.
 */
export function selectPlayerStanding() {
    const promo = selectPlayerPromotion();
    const tier = PROMOTION_TIERS[promo.tier];
    const weightClassKey = getPlayerWeightClassKey();
    const ranking = selectDivisionTop15(promo.id, weightClassKey);
    const playerEntry = ranking.find(e => e.fighterId === 'PLAYER');
    return {
        promotion: promo,
        tier,
        weightClassKey,
        rank: playerEntry?.rank ?? null,
        streak: state.career.playerStreak || 0,
        titleWins: state.career.playerTitleWins || 0,
        callouts: state.career.playerCallouts || []
    };
}

function getPlayerWeightClassKey() {
    const weight = state.setup?.weight || 170;
    const wc = WEIGHT_CLASSES.find(w => weight >= w.min && weight <= w.max);
    return wc?.key || 'welterweight';
}

/**
 * Active callouts (opponent ids the player has called out). Includes
 * the opponent's name + promotion for display.
 */
export function selectActiveCallouts() {
    const callouts = state.career.playerCallouts || [];
    const world = getWorld();
    const byId = Object.fromEntries((world.roster || []).map(f => [f.id, f]));
    return callouts.map(id => {
        const f = byId[id];
        if (!f) return null;
        const promo = getPromotion(f.promotionId);
        return {
            fighterId: id,
            name: f.name,
            nickname: f.nickname,
            promotionId: f.promotionId,
            promotionName: promo?.name || '',
            weightClassKey: f.weightClassKey,
            rank: f.rank
        };
    }).filter(Boolean);
}
