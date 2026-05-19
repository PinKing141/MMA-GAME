/**
 * Autonomous world simulator. Runs AI-vs-AI events across every
 * promotion in the background so the world stays alive while the
 * player is on their own arc.
 *
 * Each call to `tickWorld` advances simulated time by some number of
 * weeks. For each promotion whose cadence elapses, the simulator:
 *  1. Picks weight classes to feature.
 *  2. Asks the matchmaker for a card.
 *  3. Resolves each AI-vs-AI fight via a lightweight stats-only model.
 *     (Full simulate-career-fight is overkill for cards the player
 *     never watches.)
 *  4. Updates fighter records, finishes, rank trail, and prestige.
 *  5. Posts headlines to the news feed.
 *  6. Republishes rankings.
 *
 * The simulator is deterministic given an RNG, so save games can
 * reproduce world state if the seed is preserved.
 */

import { PROMOTIONS, PROMOTION_TIERS, computeFighterPrestige } from './promotions.js';
import { buildAIFightCard } from './matchmaker.js';
import { publishRankings, applyRankUpdates } from './rankings.js';
import { generateHeadline } from './news-feed.js';
import { WEIGHT_CLASSES } from '../data/attributes.js';
import { getOverallAverage } from '../utils/calculations.js';

const METHODS = ['Decision', 'TKO', 'KO', 'Submission'];

/**
 * Resolve an AI-vs-AI fight using stats only — fast, no timeline.
 * Returns a result the world updater can apply.
 */
function resolveAIFight(red, blue, rng = Math.random) {
    const redOverall = getOverallAverage(red.stats || {});
    const blueOverall = getOverallAverage(blue.stats || {});
    const redScore = redOverall + (rng() * 12 - 6) - (red.layoffWeeks || 0) * 0.1;
    const blueScore = blueOverall + (rng() * 12 - 6) - (blue.layoffWeeks || 0) * 0.1;
    const gap = Math.abs(redScore - blueScore);

    const isDraw = gap < 1.5 && rng() < 0.08;
    if (isDraw) {
        return { winner: null, loser: null, method: 'Draw', round: 3, time: '5:00' };
    }

    const winner = redScore >= blueScore ? red : blue;
    const loser = winner === red ? blue : red;

    // Method probability: large skill gap → more likely to finish.
    let method;
    if (gap > 12) {
        method = rng() < 0.55 ? (rng() < 0.6 ? 'TKO' : 'KO')
            : (rng() < 0.5 ? 'Submission' : 'Decision');
    } else if (gap > 6) {
        method = rng() < 0.4 ? METHODS[Math.floor(rng() * 4)] : 'Decision';
    } else {
        method = rng() < 0.7 ? 'Decision' : METHODS[Math.floor(rng() * 4)];
    }
    const round = method === 'Decision' ? 3 : 1 + Math.floor(rng() * 3);
    return { winner, loser, method, round, time: '4:50' };
}

function applyFightResult({ pairing, result, weekStamp }) {
    const { red, blue, weightClassKey, slotType } = pairing;
    const isDraw = result.method === 'Draw';

    [red, blue].forEach(f => {
        f.layoffWeeks = 0;
        f.lastFightWeek = weekStamp;
    });

    if (isDraw) {
        red.record.draws += 1;
        blue.record.draws += 1;
    } else {
        result.winner.record.wins += 1;
        result.loser.record.losses += 1;
        result.winner.streak = (result.winner.streak || 0) + 1;
        result.loser.streak = 0;
        if (result.method !== 'Decision') {
            result.winner.record.finishes = (result.winner.record.finishes || 0) + 1;
        }
        // Title fight bookkeeping: a title shot was booked when one of
        // the fighters was the existing titleHolder.
        if (red.titleHolder || blue.titleHolder) {
            if (result.winner === red && blue.titleHolder) {
                red.titleHolder = true;
                red.titleDefenses = 0;
                blue.titleHolder = false;
            } else if (result.winner === blue && red.titleHolder) {
                blue.titleHolder = true;
                blue.titleDefenses = 0;
                red.titleHolder = false;
            } else if (result.winner.titleHolder) {
                result.winner.titleDefenses = (result.winner.titleDefenses || 0) + 1;
            }
        }
    }
    return { weightClassKey, slotType };
}

/**
 * Advance the world by `weeksToAdvance` weeks. Each elapsed week may
 * trigger one or more promotion event nights based on cadence.
 *
 * @param {object} world  Current world state (mutated).
 * @returns {Array} Array of headlines generated this tick.
 */
export function tickWorld({ world, weeksToAdvance = 1, rng = Math.random }) {
    if (!world.lastTickWeek) world.lastTickWeek = 0;
    const headlines = [];

    for (let w = 1; w <= weeksToAdvance; w += 1) {
        const currentWeek = world.lastTickWeek + w;

        PROMOTIONS.forEach(promo => {
            // Cadence: a promotion holds an event every N weeks.
            if (currentWeek % promo.eventCadenceWeeks !== 0) return;

            // Bump layoff counters for everyone in this promotion.
            world.roster
                .filter(f => f.promotionId === promo.id)
                .forEach(f => { f.layoffWeeks = (f.layoffWeeks || 0) + promo.eventCadenceWeeks; });

            // Pick which weight classes feature this card.
            const wcPool = WEIGHT_CLASSES
                .map(w => w.key)
                .filter(key => world.roster.some(f => f.promotionId === promo.id && f.weightClassKey === key));
            const featuredCount = Math.min(wcPool.length, promo.tier === 'APEX' ? 5 : 3);
            const featured = [...wcPool].sort(() => rng() - 0.5).slice(0, featuredCount);

            const card = buildAIFightCard({
                promotion: promo,
                roster: world.roster,
                weightClassPool: featured,
                rng
            });

            const cardResults = [];
            card.forEach(pairing => {
                const result = resolveAIFight(pairing.red, pairing.blue, rng);
                applyFightResult({ pairing, result, weekStamp: currentWeek });
                cardResults.push({ pairing, result });
            });

            // Build event log entry + headlines.
            if (cardResults.length > 0) {
                world.events.push({
                    promotionId: promo.id,
                    week: currentWeek,
                    card: cardResults.map(({ pairing, result }) => ({
                        red: pairing.red.id,
                        blue: pairing.blue.id,
                        winnerId: result.winner?.id || null,
                        method: result.method,
                        round: result.round,
                        slotType: pairing.slotType,
                        weightClassKey: pairing.weightClassKey
                    }))
                });
                // Cap history so saves don't balloon.
                if (world.events.length > 120) {
                    world.events.splice(0, world.events.length - 120);
                }

                // Headlines: main event + any upset / title change.
                cardResults.forEach(({ pairing, result }) => {
                    if (pairing.slotType === 'MAIN_EVENT' || result.method !== 'Decision') {
                        const headline = generateHeadline({
                            promotion: promo,
                            pairing,
                            result,
                            week: currentWeek
                        });
                        if (headline) {
                            headlines.push(headline);
                            world.news.unshift(headline);
                        }
                    }
                });
                if (world.news.length > 40) {
                    world.news = world.news.slice(0, 40);
                }
            }
        });
    }

    world.lastTickWeek += weeksToAdvance;

    // Refresh prestige and published rankings.
    world.roster.forEach(f => {
        f.prestige = computeFighterPrestige({
            wins: f.record.wins,
            losses: f.record.losses,
            finishes: f.record.finishes,
            titleWins: f.titleHolder ? 1 : 0,
            currentPromotionTier: f.promotionTier,
            rank: f.rank
        });
    });
    const { published, fighterRankUpdates } = publishRankings(world.roster, world.publishedRankings);
    applyRankUpdates(world.roster, fighterRankUpdates);
    world.publishedRankings = published;

    return headlines;
}

/**
 * Poach evaluation: which CIRCUIT/FRONTIER fighters have earned a
 * look from a higher-tier promotion? Returns a list of poach offers
 * — the world layer can decide whether to apply them automatically
 * or surface as news.
 */
export function evaluatePoaching(world, { rng = Math.random } = {}) {
    const offers = [];
    world.roster.forEach(f => {
        if (f.promotionTier === 'APEX') return; // Already at the top.
        if ((f.prestige || 0) < 55) return;
        if (f.titleHolder) return; // Don't poach reigning champs.

        const eligibleTiers = [];
        if ((f.prestige || 0) >= 75) eligibleTiers.push('APEX');
        if ((f.prestige || 0) >= 55 && f.promotionTier !== 'BANNER') eligibleTiers.push('BANNER');
        if ((f.prestige || 0) >= 30 && f.promotionTier === 'CIRCUIT') eligibleTiers.push('FRONTIER');

        if (eligibleTiers.length === 0) return;
        // 25% chance per tick to actually receive an offer.
        if (rng() > 0.25) return;

        const targetTier = eligibleTiers[Math.floor(rng() * eligibleTiers.length)];
        const targetPromotions = PROMOTIONS.filter(p => p.tier === targetTier);
        const targetPromo = targetPromotions[Math.floor(rng() * targetPromotions.length)];
        if (!targetPromo) return;

        offers.push({
            fighterId: f.id,
            fromPromotionId: f.promotionId,
            toPromotionId: targetPromo.id,
            week: world.lastTickWeek
        });
    });
    return offers;
}

/**
 * Apply a poach offer: move the fighter to the new promotion,
 * adjust their rank to enter at the bottom of the new division.
 */
export function applyPoachOffer(world, offer) {
    const fighter = world.roster.find(f => f.id === offer.fighterId);
    const promo = PROMOTIONS.find(p => p.id === offer.toPromotionId);
    if (!fighter || !promo) return false;
    fighter.promotionId = promo.id;
    fighter.promotionTier = promo.tier;
    fighter.rank = null; // Enters unranked, rankings tick will slot them.
    return true;
}
