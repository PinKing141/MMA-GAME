/**
 * World state factory + helpers. The world slice lives at
 * state.career.world and persists across saves.
 *
 * Shape:
 *   world = {
 *     seedVersion: number,
 *     lastTickWeek: number,
 *     roster: Fighter[],
 *     publishedRankings: { [promotionId]: { [weightClassKey]: SlotEntry[] } },
 *     events: EventLogEntry[],
 *     news: NewsItem[],
 *     callouts: { [playerSnapshotId]: string[] }  // opponent ids the player has called out
 *   }
 */

import { generateWorldRoster } from './roster-generator.js';
import { publishRankings, applyRankUpdates } from './rankings.js';
import { computeFighterPrestige } from './promotions.js';

const WORLD_SEED_VERSION = 1;

export function createDefaultWorldState({ rng = Math.random } = {}) {
    const roster = generateWorldRoster({ rng });
    roster.forEach(f => {
        f.streak = 0;
        f.layoffWeeks = 0;
        f.lastFightWeek = 0;
        f.prestige = computeFighterPrestige({
            wins: f.record.wins,
            losses: f.record.losses,
            finishes: f.record.finishes,
            titleWins: f.titleHolder ? 1 : 0,
            currentPromotionTier: f.promotionTier,
            rank: f.rank
        });
    });
    const { published, fighterRankUpdates } = publishRankings(roster);
    applyRankUpdates(roster, fighterRankUpdates);

    return {
        seedVersion: WORLD_SEED_VERSION,
        lastTickWeek: 0,
        roster,
        publishedRankings: published,
        events: [],
        news: [],
        callouts: []
    };
}

/**
 * Hydrate a saved world snapshot back into a usable world state.
 * Falls back to a fresh world if the snapshot is missing or stale.
 */
export function hydrateWorldState(snapshot) {
    if (!snapshot || snapshot.seedVersion !== WORLD_SEED_VERSION) {
        return createDefaultWorldState();
    }
    return {
        seedVersion: WORLD_SEED_VERSION,
        lastTickWeek: Number(snapshot.lastTickWeek) || 0,
        roster: Array.isArray(snapshot.roster) ? snapshot.roster : [],
        publishedRankings: snapshot.publishedRankings || {},
        events: Array.isArray(snapshot.events) ? snapshot.events : [],
        news: Array.isArray(snapshot.news) ? snapshot.news : [],
        callouts: Array.isArray(snapshot.callouts) ? snapshot.callouts : []
    };
}
