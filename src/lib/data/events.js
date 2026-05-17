/*
 * Event ladder. Each step up requires real career capital:
 *   reputationRequired — name recognition from past performances
 *   minimumWins        — promoters won't bet a slot on a fighter without a body of work
 *   maxLossesAllowed   — a loss-heavy record bumps you back down the ladder
 *   minDivisionRank    — top cards need a ranked contender, not a prospect
 *   wildcardWindow     — the only escape hatch: a recent finish opens one door up
 *                        (e.g. a fight-of-the-night win on the Apex card unlocks Dallas)
 *
 * The selector enforces these gates and surfaces a clear "why not" reason
 * so the player understands what they need to do to get the booking.
 */

export const EVENTS = [
    {
        id: 'vegas-fight-night',
        name: 'CAGE Fight Night: Vegas',
        venue: 'Apex Arena',
        location: 'Las Vegas, NV',
        stageLabel: 'Apex Card',
        tier: 'developmental',
        reputationRequired: 0,
        minimumWins: 0,
        maxLossesAllowed: 99,
        minDivisionRank: null,
        showMoney: 900,
        winBonus: 900,
        reputationBonus: 1,
        blurb: 'Smaller show, clean spotlight, and a good place to start a run.'
    },
    {
        id: 'dallas-fight-night',
        name: 'CAGE Fight Night: Dallas',
        venue: 'Metro Arena',
        location: 'Dallas, TX',
        stageLabel: 'Main Card',
        tier: 'regional',
        reputationRequired: 1,
        minimumWins: 1,
        maxLossesAllowed: 3,
        minDivisionRank: null,
        showMoney: 1200,
        winBonus: 1200,
        reputationBonus: 2,
        blurb: 'Regional main card with a loud crowd and a little more money on the table.'
    },
    {
        id: 'atlantic-city-prime',
        name: 'CAGE on Prime: Atlantic City',
        venue: 'Boardwalk Hall',
        location: 'Atlantic City, NJ',
        stageLabel: 'TV Card',
        tier: 'televised',
        reputationRequired: 3,
        minimumWins: 3,
        maxLossesAllowed: 2,
        minDivisionRank: 25,
        wildcardWindow: { winsInRow: 2, opensTier: 'televised' },
        showMoney: 1500,
        winBonus: 1500,
        reputationBonus: 3,
        blurb: 'National TV slot. Better money, bigger pressure, and a real chance to move up.'
    },
    {
        id: 'london-fight-night',
        name: 'CAGE Fight Night: London',
        venue: 'O2 Forum',
        location: 'London, UK',
        stageLabel: 'Co-Main',
        tier: 'televised',
        reputationRequired: 5,
        minimumWins: 5,
        maxLossesAllowed: 2,
        minDivisionRank: 20,
        showMoney: 1750,
        winBonus: 1750,
        reputationBonus: 4,
        blurb: 'Bigger crowd, stronger card, and the kind of booking people remember.'
    },
    {
        id: 'new-york-305',
        name: 'CAGE 305: New York',
        venue: 'Madison Square Garden',
        location: 'New York, NY',
        stageLabel: 'PPV Prelims',
        tier: 'ppv',
        reputationRequired: 8,
        minimumWins: 8,
        maxLossesAllowed: 2,
        minDivisionRank: 15,
        wildcardWindow: { winsInRow: 4, opensTier: 'ppv' },
        showMoney: 2200,
        winBonus: 2200,
        reputationBonus: 5,
        blurb: 'Big arena, real lights, and a paycheck that can change a prospect into a contender.'
    }
];

/*
 * Given a player career snapshot, returns null if the event is bookable,
 * otherwise a short reason explaining the gate.
 */
export function getEventLockReason(event, career, playerRank) {
    if (career.reputation < event.reputationRequired) {
        return `Need ${event.reputationRequired} reputation — build your name first.`;
    }
    if (career.record.wins < event.minimumWins) {
        return `Need at least ${event.minimumWins} pro wins on your record.`;
    }
    if (career.record.losses > event.maxLossesAllowed) {
        return `Too many losses for this slot — string wins together to climb back.`;
    }
    if (event.minDivisionRank != null) {
        const ranked = typeof playerRank === 'number' && playerRank <= event.minDivisionRank;
        const wildcard = event.wildcardWindow && career.winStreak >= event.wildcardWindow.winsInRow;
        if (!ranked && !wildcard) {
            const needsWildcard = event.wildcardWindow
                ? ` — or finish ${event.wildcardWindow.winsInRow} in a row to force the booking`
                : '';
            return `Need division top ${event.minDivisionRank}${needsWildcard}.`;
        }
    }
    return null;
}
