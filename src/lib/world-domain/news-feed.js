/**
 * News feed headline generation. Produces broadcast-style copy from
 * world events the player should care about: title changes, upsets,
 * statement finishes, and ranked-vs-ranked main events.
 */

const SLOT_LABELS = {
    MAIN_EVENT: 'Main Event',
    COMAIN: 'Co-Main',
    PRELIM: 'Prelim'
};

function getLastName(fullName) {
    return (fullName || '').split(/\s+/).slice(-1)[0] || fullName;
}

function isUpset(pairing, result) {
    if (!result.winner) return false;
    const winnerRank = result.winner.rank;
    const loserRank = result.loser.rank;
    if (winnerRank === null || loserRank === null) return false;
    return winnerRank > loserRank + 4;
}

function isTitleChange(pairing, result) {
    return result.winner
        && ((pairing.red.titleHolder && result.winner.id !== pairing.red.id)
            || (pairing.blue.titleHolder && result.winner.id !== pairing.blue.id));
}

/**
 * Build a single headline for an event result. Returns null when the
 * event is not interesting enough to publish.
 */
export function generateHeadline({ promotion, pairing, result, week }) {
    const { winner, loser, method, round } = result;
    const isDraw = method === 'Draw';
    const titleChange = isTitleChange(pairing, result);
    const upset = isUpset(pairing, result);
    const isFinish = method !== 'Decision' && method !== 'Draw';
    const slot = SLOT_LABELS[pairing.slotType] || 'Card';

    let headline;
    let tone = 'gold';
    let kicker = `${promotion.shortName} · Week ${week}`;

    if (titleChange) {
        const lostName = getLastName(loser?.name);
        const wonName = getLastName(winner?.name);
        headline = `${wonName} takes the strap. Dethrones ${lostName} by ${method} in Round ${round}.`;
        tone = 'gold';
        kicker = `${promotion.shortName} · CHAMPIONSHIP`;
    } else if (upset) {
        const wonName = getLastName(winner?.name);
        const lostName = getLastName(loser?.name);
        headline = `Upset alert: ${wonName} stops ${lostName} in Round ${round} by ${method}. Division shuffles.`;
        tone = 'red';
    } else if (isDraw) {
        headline = `Stalemate in the ${slot.toLowerCase()}. ${getLastName(pairing.red.name)} and ${getLastName(pairing.blue.name)} go to a draw.`;
        tone = 'muted';
    } else if (isFinish && pairing.slotType === 'MAIN_EVENT') {
        const wonName = getLastName(winner?.name);
        const lostName = getLastName(loser?.name);
        headline = `${wonName} closes the show. ${method} of ${lostName} in Round ${round}.`;
        tone = winner.id === pairing.red.id ? 'red' : 'blue';
    } else if (pairing.slotType === 'MAIN_EVENT') {
        const wonName = getLastName(winner?.name);
        const lostName = getLastName(loser?.name);
        headline = `${wonName} edges ${lostName} on the cards in the ${promotion.shortName} main event.`;
        tone = winner.id === pairing.red.id ? 'red' : 'blue';
    } else {
        return null; // Skip mundane prelim decisions.
    }

    return {
        id: `${promotion.id}-${week}-${pairing.red.id}-${pairing.blue.id}`,
        week,
        promotionId: promotion.id,
        kicker,
        tone,
        headline,
        slot,
        winnerId: winner?.id || null,
        loserId: loser?.id || null,
        weightClassKey: pairing.weightClassKey
    };
}

/**
 * Custom-author a news item for an out-of-event happening: poach
 * offers, retirements, injuries, etc.
 */
export function buildSystemNews({ kind, week, promotionId, fighterId, fighterName, detail }) {
    const idBase = `${kind}-${week}-${fighterId || fighterName || ''}`;
    switch (kind) {
        case 'POACH':
            return {
                id: idBase,
                week,
                promotionId,
                kicker: 'Signing',
                tone: 'gold',
                headline: `${fighterName} signs with new promotion. ${detail || ''}`.trim(),
                slot: 'Free agency'
            };
        case 'TITLE_VACATED':
            return {
                id: idBase,
                week,
                promotionId,
                kicker: 'Vacated',
                tone: 'muted',
                headline: `Title vacated. ${fighterName} steps away. ${detail || ''}`.trim(),
                slot: 'Championship'
            };
        case 'INJURY':
            return {
                id: idBase,
                week,
                promotionId,
                kicker: 'Injury',
                tone: 'muted',
                headline: `${fighterName} pulls from card. ${detail || ''}`.trim(),
                slot: 'Injury report'
            };
        case 'CALLOUT':
            return {
                id: idBase,
                week,
                promotionId,
                kicker: 'Callout',
                tone: 'red',
                headline: `${fighterName} calls out: "${detail}".`,
                slot: 'Callout'
            };
        default:
            return null;
    }
}
