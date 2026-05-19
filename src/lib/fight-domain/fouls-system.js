/**
 * Fouls, illegal moves, and referee intervention.
 *
 * Covered fouls:
 *  - Eye poke (open-palm strikes, fingers in line of sight)
 *  - Low blow (kick/knee below the belt)
 *  - Illegal knee / kick (to a downed opponent's head)
 *  - Fence grab (slowing a takedown attempt)
 *  - Back of the head (rabbit punch)
 *  - 12-6 elbow
 *
 * Referee intervention covers:
 *  - Warning (first minor offense)
 *  - Recovery time (fouled fighter gets up to 5 minutes)
 *  - Point deduction (repeated or flagrant)
 *  - DQ (egregious or intentional injury)
 */

const FOUL_CATALOG = {
    EYE_POKE: {
        key: 'EYE_POKE',
        label: 'Eye Poke',
        severity: 'major',
        cause: 'open-handed extension caught the eye',
        recoveryChance: 0.85,
        damageReverse: 8, // The fouled fighter heals slightly during the pause.
        callout: 'EYE POKE'
    },
    LOW_BLOW: {
        key: 'LOW_BLOW',
        label: 'Low Blow',
        severity: 'major',
        cause: 'kick strayed below the belt',
        recoveryChance: 0.8,
        damageReverse: 6,
        callout: 'LOW BLOW'
    },
    ILLEGAL_KNEE: {
        key: 'ILLEGAL_KNEE',
        label: 'Illegal Knee',
        severity: 'severe',
        cause: 'knee to a grounded opponent',
        recoveryChance: 0.65,
        damageReverse: 4,
        callout: 'ILLEGAL KNEE'
    },
    FENCE_GRAB: {
        key: 'FENCE_GRAB',
        label: 'Fence Grab',
        severity: 'minor',
        cause: 'grabbed the cage to stop a takedown',
        recoveryChance: 1.0,
        damageReverse: 0,
        callout: 'FENCE GRAB'
    },
    BACK_OF_HEAD: {
        key: 'BACK_OF_HEAD',
        label: 'Rabbit Punch',
        severity: 'minor',
        cause: 'shot landed behind the ear',
        recoveryChance: 0.9,
        damageReverse: 3,
        callout: 'BACK OF HEAD'
    },
    TWELVE_SIX: {
        key: 'TWELVE_SIX',
        label: '12-6 Elbow',
        severity: 'minor',
        cause: 'elbow came down straight from above',
        recoveryChance: 1.0,
        damageReverse: 0,
        callout: '12-6 ELBOW'
    }
};

export function getFoulEntry(key) {
    return FOUL_CATALOG[key] || null;
}

/**
 * Probability of a foul on a given step. Higher in scrambles, near the
 * fence, when one fighter is desperate, and when the move thrown has a
 * known foul-adjacent profile (open-palm strikes for eye pokes, knees
 * in transitions for illegal knees).
 */
export function maybeGenerateFoul({
    move,
    range,
    aggressorAggression,
    defenderDown,
    rng = Math.random
}) {
    // Per-step base rate — the cage isn't littered with fouls. ~3-4%
    // baseline, modulated by context.
    let rate = 0.018;

    const type = (move?.Type || '').toLowerCase();
    const target = move?.Target || '';

    // Eye-poke risk on open palms / fingertip-range strikes.
    if (type === 'punch' && (target === 'Head' || target === 'Eyes')) {
        rate += 0.012;
    }
    // Low blows on kicks to the body.
    if (type === 'kick' && (target === 'Body' || target === 'Liver')) {
        rate += 0.014;
    }
    // Illegal knees when a grounded opponent is in play.
    if (type === 'knee' && defenderDown) {
        rate += 0.18;
    }
    // Fence grabs during desperate takedown defense.
    if (type === 'takedown' && range !== 'Long') {
        rate += 0.02;
    }
    // High aggression bumps fouls slightly — wild exchanges create them.
    rate += aggressorAggression * 0.01;

    if (rng() > rate) return null;

    // Pick a contextual foul.
    const candidates = [];
    if (type === 'punch' && (target === 'Head' || target === 'Eyes')) {
        candidates.push('EYE_POKE');
    }
    if (type === 'kick' && (target === 'Body' || target === 'Liver')) {
        candidates.push('LOW_BLOW');
    }
    if (type === 'knee' && defenderDown) {
        candidates.push('ILLEGAL_KNEE');
    }
    if (type === 'takedown') {
        candidates.push('FENCE_GRAB');
    }
    if (type === 'punch' && range === 'Ground') {
        candidates.push('BACK_OF_HEAD');
    }
    if (type === 'elbow') {
        candidates.push('TWELVE_SIX');
    }

    if (candidates.length === 0) {
        // Default fall-back: low-frequency eye poke on any high-aggression
        // exchange.
        candidates.push('EYE_POKE');
    }

    const idx = Math.floor(rng() * candidates.length);
    return getFoulEntry(candidates[idx]);
}

/**
 * Track a fighter's foul history across the fight. The result of this
 * call describes the referee's intervention:
 *   - 'warning'    : verbal warning, no points
 *   - 'pause'      : action paused for recovery / cleanup
 *   - 'deduction'  : 1-point deduction on this round's card
 *   - 'dq'         : disqualification
 *
 * Pattern: minor fouls accumulate to a warning, then a deduction.
 * Major fouls get a pause + warning on first offense, a deduction on
 * second, and a DQ on third. Severe fouls (illegal knee to a grounded
 * head) jump straight to a deduction.
 */
export function resolveFoulIntervention({ foul, foulHistory }) {
    const minorCount = foulHistory.filter(f => f.severity === 'minor').length;
    const majorCount = foulHistory.filter(f => f.severity === 'major').length;
    const severeCount = foulHistory.filter(f => f.severity === 'severe').length;

    if (foul.severity === 'severe') {
        if (severeCount >= 2) {
            return { intervention: 'dq', pointsDeducted: 0, recoveryTime: false };
        }
        return {
            intervention: 'deduction',
            pointsDeducted: 1,
            recoveryTime: true
        };
    }

    if (foul.severity === 'major') {
        if (majorCount >= 2) {
            return {
                intervention: 'deduction',
                pointsDeducted: 1,
                recoveryTime: true
            };
        }
        return {
            intervention: 'pause',
            pointsDeducted: 0,
            recoveryTime: true
        };
    }

    // Minor
    if (minorCount >= 1) {
        return {
            intervention: 'deduction',
            pointsDeducted: 1,
            recoveryTime: false
        };
    }
    return {
        intervention: 'warning',
        pointsDeducted: 0,
        recoveryTime: false
    };
}

export function describeIntervention({ foul, intervention, pointsDeducted, fouledCorner }) {
    const fouledLabel = fouledCorner === 'red' ? 'red corner' : 'blue corner';
    switch (intervention) {
        case 'warning':
            return `Referee warns about the ${foul.label.toLowerCase()} — no points.`;
        case 'pause':
            return `Action paused. ${foul.label}. The ${fouledLabel} gets time to recover.`;
        case 'deduction':
            return `Point deduction. ${foul.label} — ${pointsDeducted} point off the offender's card.`;
        case 'dq':
            return `Disqualification. The ${foul.label.toLowerCase()} is too much — the fight ends here.`;
        default:
            return `${foul.label} called.`;
    }
}
