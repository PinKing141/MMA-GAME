/**
 * Action layer for the world slice. Mutates state.career.world via
 * domain helpers. Scenes call these — they never touch the simulator
 * directly.
 */

import { state } from '../state/fighter-state.js';
import { tickWorld, evaluatePoaching, applyPoachOffer } from '../world-domain/world-simulator.js';
import { proposeOpponentsForPlayer } from '../world-domain/matchmaker.js';
import { getPromotion } from '../world-domain/promotions.js';
import { buildSystemNews } from '../world-domain/news-feed.js';
import { WEIGHT_CLASSES } from '../data/attributes.js';

function getWorld() {
    return state.career.world;
}

function getPlayerWeightClassKey() {
    const weight = state.setup?.weight || 170;
    const wc = WEIGHT_CLASSES.find(w => weight >= w.min && weight <= w.max);
    return wc?.key || 'welterweight';
}

/**
 * Run the world sim forward by N weeks. Returns the headlines
 * generated this tick so the UI can show "Since your last fight…".
 */
export function tickWorldAction(weeksToAdvance = 1) {
    const world = getWorld();
    if (!world) return [];
    return tickWorld({ world, weeksToAdvance });
}

/**
 * Look up the three opponents the matchmaker would offer right now.
 * Honors active callouts and the player's current rank.
 */
export function getOpponentProposals() {
    const world = getWorld();
    if (!world) return [];

    const promotionId = state.career.playerPromotionId;
    const weightClassKey = getPlayerWeightClassKey();
    const playerStanding = world.roster.find(f => f.id === 'PLAYER');

    return proposeOpponentsForPlayer({
        roster: world.roster,
        weightClassKey,
        promotionId,
        playerRank: playerStanding?.rank ?? null,
        streak: state.career.playerStreak || 0,
        isNumberOneContender: playerStanding?.rank === 1,
        callouts: state.career.playerCallouts || []
    });
}

/**
 * Player issues a callout. Adds the opponent id to the active
 * callouts list (which the matchmaker picks up on the next offer)
 * and posts a news headline.
 */
export function calloutOpponentAction(opponentId, quote = 'I want that fight next.') {
    const world = getWorld();
    if (!world) return false;
    const opponent = world.roster.find(f => f.id === opponentId);
    if (!opponent) return false;

    if (!state.career.playerCallouts.includes(opponentId)) {
        state.career.playerCallouts.push(opponentId);
    }

    const news = buildSystemNews({
        kind: 'CALLOUT',
        week: world.lastTickWeek,
        promotionId: opponent.promotionId,
        fighterId: 'PLAYER',
        fighterName: `${state.setup.firstName} ${state.setup.lastName}`.trim() || 'The player',
        detail: quote
    });
    if (news) world.news.unshift(news);
    return true;
}

/**
 * Clear a callout once the matchmaker has booked it (or the player
 * dismisses it).
 */
export function clearCalloutAction(opponentId) {
    state.career.playerCallouts = (state.career.playerCallouts || []).filter(id => id !== opponentId);
}

/**
 * Process automatic poach offers after a world tick. The player
 * receives an offer when their prestige crosses a tier threshold;
 * AI fighters get moved silently and a headline is posted.
 *
 * Returns the player's offer if one was generated, otherwise null.
 */
export function processPoachingAction() {
    const world = getWorld();
    if (!world) return null;

    // 1) AI poach offers — auto-apply.
    const aiOffers = evaluatePoaching(world).filter(o => o.fighterId !== 'PLAYER');
    aiOffers.forEach(offer => {
        const fighter = world.roster.find(f => f.id === offer.fighterId);
        if (!fighter) return;
        applyPoachOffer(world, offer);
        const news = buildSystemNews({
            kind: 'POACH',
            week: world.lastTickWeek,
            promotionId: offer.toPromotionId,
            fighterId: fighter.id,
            fighterName: fighter.name,
            detail: `Moves up from ${getPromotion(offer.fromPromotionId)?.shortName || 'lower tier'}.`
        });
        if (news) world.news.unshift(news);
    });

    // 2) Player offer surfaces, doesn't auto-apply — the player decides.
    const playerPrestige = state.career.world?.roster?.find?.(f => f.id === 'PLAYER')?.prestige
        ?? state.career.reputation;
    if (playerPrestige >= 55) {
        const currentTier = getPromotion(state.career.playerPromotionId)?.tier || 'CIRCUIT';
        const eligibleTiers = [];
        if (playerPrestige >= 75 && currentTier !== 'APEX') eligibleTiers.push('APEX');
        if (playerPrestige >= 55 && currentTier === 'CIRCUIT') eligibleTiers.push('FRONTIER');
        if (eligibleTiers.length > 0) {
            return {
                fromPromotionId: state.career.playerPromotionId,
                toTier: eligibleTiers[0],
                week: world.lastTickWeek
            };
        }
    }
    return null;
}

/**
 * Player accepts a promotion offer — switches their playerPromotionId
 * to a target promotion at the next tier up.
 */
export function acceptPromotionOfferAction(targetPromotionId) {
    const promo = getPromotion(targetPromotionId);
    if (!promo) return false;
    state.career.playerPromotionId = targetPromotionId;
    const world = getWorld();
    if (world) {
        const news = buildSystemNews({
            kind: 'POACH',
            week: world.lastTickWeek,
            promotionId: targetPromotionId,
            fighterId: 'PLAYER',
            fighterName: `${state.setup.firstName} ${state.setup.lastName}`.trim() || 'The player',
            detail: `Signs with ${promo.name}.`
        });
        if (news) world.news.unshift(news);
    }
    return true;
}

/**
 * After a player fight resolves, call this to update the world side:
 * tick world forward a few weeks, update player streak, clear the
 * matched callout.
 */
export function syncWorldAfterPlayerFight({ resultLabel, opponentId, weeksToAdvance = 6 }) {
    if (resultLabel === 'Win') {
        state.career.playerStreak = (state.career.playerStreak || 0) + 1;
    } else if (resultLabel === 'Loss') {
        state.career.playerStreak = 0;
    }
    // Clear callout if the player just fought the called-out opponent.
    if (opponentId) {
        clearCalloutAction(opponentId);
    }
    return tickWorldAction(weeksToAdvance);
}
