import { EVENTS } from '../data/events.js';
import { state, getOverallAverage } from '../core.js';
import { getPlayerRankingKey } from '../actions/career-state.js';
import { getContractPreview } from '../actions/contract-actions.js';

/**
 * Difficulty tier of an opponent relative to the player.
 * easy < medium < hard < elite
 */
export function getOpponentTier(opponent, playerOverall) {
    const delta = opponent.overall - playerOverall;
    if (typeof opponent.rank === 'number' && opponent.rank <= 5) {
        return 'elite';
    }
    if (delta >= 8) {
        return 'hard';
    }
    if (delta <= -6) {
        return 'easy';
    }
    if (delta >= 3) {
        return 'hard';
    }
    return 'medium';
}

const TIER_LABEL = {
    easy: 'Easier Match',
    medium: 'Even Fight',
    hard: 'Tougher Match',
    elite: 'Title Contender'
};

/**
 * Camp weeks for a fight scale with stakes.
 * Player reputation lets them sustain longer camps for bigger fights.
 */
function getCampWeeks(tier) {
    switch (tier) {
        case 'easy': return 4;
        case 'medium': return 6;
        case 'hard': return 8;
        case 'elite': return 10;
        default: return 4;
    }
}

/**
 * Risk copy is shaped by archetype + tier so each card reads differently.
 */
function getRiskCopy(opponent, tier) {
    const style = opponent.archetype?.name || 'Fighter';
    const stylePhrase = {
        Boxer: 'fast hands and tight pocket boxing',
        'Kick Boxer': 'long-range kicks and stance switches',
        Wrestler: 'pressure wrestling and fence control',
        Grappler: 'submission chains the second it hits the mat',
        'All-Rounder': 'no obvious dead zone — adapts round to round'
    }[style] || 'a balanced mixed game';

    switch (tier) {
        case 'easy':
            return `Lower-tier name with ${stylePhrase}. Take it clean and you climb the board.`;
        case 'medium':
            return `Even match. Expect ${stylePhrase} and a real test of camp prep.`;
        case 'hard':
            return `Step-up fight. ${opponent.name} brings ${stylePhrase}. A loss sets you back months.`;
        case 'elite':
            return `Top contender. ${stylePhrase} at championship pace. Win and you're a name.`;
        default:
            return `Watch for ${stylePhrase}.`;
    }
}

/**
 * Pick the highest-tier event the player has reputation to take.
 * For step-up tier fights we offer the next event up the ladder
 * (so harder opponents come on bigger cards). Returns null if locked.
 */
function pickEventForTier(tier, reputation) {
    const eligible = EVENTS.filter(event => reputation >= event.reputationRequired);
    if (eligible.length === 0) {
        return { event: null, locked: EVENTS[0] };
    }

    const tierStep = tier === 'easy' ? 0 : tier === 'medium' ? 1 : tier === 'hard' ? 2 : 3;
    const target = Math.min(tierStep, eligible.length - 1);
    return { event: eligible[target], locked: null };
}

/**
 * Reputation gate — even if an event slot is available, certain tier
 * fights only get offered once the player has earned the look.
 */
function getTierLock(tier, reputation, record) {
    const totalFights = record.wins + record.losses + record.draws;

    if (tier === 'elite' && (reputation < 5 || record.wins < 5)) {
        return {
            locked: true,
            reason: `Top contenders won't sign you yet. Need rep 5+ and 5 wins (you: rep ${reputation}, ${record.wins}W).`
        };
    }
    if (tier === 'hard' && reputation < 2 && totalFights < 2) {
        return {
            locked: true,
            reason: `Step-up fights open after a couple pro outings. (${totalFights} fight${totalFights === 1 ? '' : 's'} so far)`
        };
    }
    return { locked: false, reason: '' };
}

/**
 * Build a list of 2-3 fight offers for the picker.
 * Each offer pairs an opponent with a tier-appropriate event.
 */
export function buildFightOffers() {
    const reputation = state.career.reputation;
    const record = state.career.record;
    const playerOverall = getOverallAverage(state.stats);
    const weightClassKey = getPlayerRankingKey();

    const pool = state.career.roster
        .filter(opponent => opponent.weightClassKey === weightClassKey)
        .map(opponent => ({
            opponent,
            tier: getOpponentTier(opponent, playerOverall)
        }));

    if (pool.length === 0) {
        return [];
    }

    const wanted = ['easy', 'medium', 'hard', 'elite'];
    const offers = [];
    const used = new Set();

    wanted.forEach(tier => {
        const candidate = pool.find(entry => entry.tier === tier && !used.has(entry.opponent.id));
        if (candidate) {
            offers.push(candidate);
            used.add(candidate.opponent.id);
        }
    });

    // Fill remaining slots with closest-overall opponents if we have <3.
    if (offers.length < 3) {
        pool
            .filter(entry => !used.has(entry.opponent.id))
            .sort((a, b) => Math.abs(a.opponent.overall - playerOverall) - Math.abs(b.opponent.overall - playerOverall))
            .slice(0, 3 - offers.length)
            .forEach(entry => {
                offers.push(entry);
                used.add(entry.opponent.id);
            });
    }

    return offers.slice(0, 3).map(entry => {
        const { event, locked } = pickEventForTier(entry.tier, reputation);
        const eventGate = !event ? {
            locked: true,
            reason: `Need ${locked?.reputationRequired ?? 0} reputation to unlock this card.`
        } : { locked: false, reason: '' };
        const tierGate = getTierLock(entry.tier, reputation, record);
        const finalLock = eventGate.locked
            ? eventGate
            : tierGate;
        const usedEvent = event || locked;
        const contractPreview = !finalLock.locked && usedEvent
            ? getContractPreview(usedEvent, entry.opponent)
            : null;

        return {
            opponent: entry.opponent,
            event: usedEvent,
            tier: entry.tier,
            tierLabel: TIER_LABEL[entry.tier],
            campWeeks: getCampWeeks(entry.tier),
            risk: getRiskCopy(entry.opponent, entry.tier),
            locked: finalLock.locked,
            lockReason: finalLock.reason,
            contractPreview
        };
    });
}
