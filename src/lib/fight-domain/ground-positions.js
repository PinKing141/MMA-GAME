/**
 * Named ground positions, their dominance hierarchy, and transition
 * rules. Used by the fight simulator when the action is on the canvas
 * (range === 'Ground') or in the clinch.
 *
 * Each position records:
 *  - label: display name for tickers and overlays
 *  - control: 0..1 positional dominance for the TOP fighter
 *    (1.0 = back mount, 0.0 = neutral). The BOTTOM fighter's control
 *    is 1 - control.
 *  - submissionEdge: base multiplier on the top fighter's submission
 *    attempt rate from this position
 *  - groundStrikeEdge: base multiplier on the top fighter's ground
 *    striking damage
 *  - escape: base difficulty for the BOTTOM fighter to escape
 *  - sweepTo: where the bottom fighter ends up on a successful sweep
 *  - transitionsUp: positions a top fighter can advance to (higher
 *    control) — paired with the minimum grappling delta required
 *  - transitionsDown: positions a bottom fighter can take after a
 *    sweep/scramble — paired with required delta
 */

export const GROUND_POSITIONS = {
    NEUTRAL_GUARD: {
        key: 'NEUTRAL_GUARD',
        label: 'Open Guard',
        shortLabel: 'Guard',
        control: 0.45,
        submissionEdge: 0.5,
        groundStrikeEdge: 0.35,
        escape: 0.45,
        transitionsUp: [
            { to: 'HALF_GUARD', delta: 4 },
            { to: 'SIDE_CONTROL', delta: 10 }
        ],
        transitionsDown: [
            { to: 'NEUTRAL_GUARD', delta: 6 }
        ]
    },
    HALF_GUARD: {
        key: 'HALF_GUARD',
        label: 'Half Guard',
        shortLabel: 'Half',
        control: 0.55,
        submissionEdge: 0.7,
        groundStrikeEdge: 0.55,
        escape: 0.4,
        transitionsUp: [
            { to: 'SIDE_CONTROL', delta: 4 },
            { to: 'MOUNT', delta: 10 }
        ],
        transitionsDown: [
            { to: 'NEUTRAL_GUARD', delta: 4 }
        ]
    },
    SIDE_CONTROL: {
        key: 'SIDE_CONTROL',
        label: 'Side Control',
        shortLabel: 'Side',
        control: 0.7,
        submissionEdge: 0.85,
        groundStrikeEdge: 0.75,
        escape: 0.3,
        transitionsUp: [
            { to: 'MOUNT', delta: 4 },
            { to: 'NORTH_SOUTH', delta: 6 }
        ],
        transitionsDown: [
            { to: 'HALF_GUARD', delta: 4 },
            { to: 'NEUTRAL_GUARD', delta: 7 }
        ]
    },
    NORTH_SOUTH: {
        key: 'NORTH_SOUTH',
        label: 'North-South',
        shortLabel: 'N-S',
        control: 0.72,
        submissionEdge: 0.95,
        groundStrikeEdge: 0.45,
        escape: 0.3,
        transitionsUp: [
            { to: 'BACK_CONTROL', delta: 5 },
            { to: 'MOUNT', delta: 4 }
        ],
        transitionsDown: [
            { to: 'HALF_GUARD', delta: 5 }
        ]
    },
    MOUNT: {
        key: 'MOUNT',
        label: 'Full Mount',
        shortLabel: 'Mount',
        control: 0.85,
        submissionEdge: 1.1,
        groundStrikeEdge: 1.2,
        escape: 0.22,
        transitionsUp: [
            { to: 'BACK_CONTROL', delta: 3 }
        ],
        transitionsDown: [
            { to: 'SIDE_CONTROL', delta: 5 },
            { to: 'HALF_GUARD', delta: 8 }
        ]
    },
    BACK_CONTROL: {
        key: 'BACK_CONTROL',
        label: 'Back Mount',
        shortLabel: 'Back',
        control: 1.0,
        submissionEdge: 1.45,
        groundStrikeEdge: 0.8,
        escape: 0.15,
        transitionsUp: [],
        transitionsDown: [
            { to: 'MOUNT', delta: 6 },
            { to: 'SIDE_CONTROL', delta: 9 }
        ]
    },
    CLINCH_OVER_UNDER: {
        key: 'CLINCH_OVER_UNDER',
        label: 'Over-Under Clinch',
        shortLabel: 'Clinch',
        control: 0.5,
        submissionEdge: 0.2,
        groundStrikeEdge: 0.3,
        escape: 0.5,
        transitionsUp: [
            { to: 'CLINCH_BODYLOCK', delta: 3 },
            { to: 'NEUTRAL_GUARD', delta: 6 }
        ],
        transitionsDown: [
            { to: 'CLINCH_OVER_UNDER', delta: 5 }
        ]
    },
    CLINCH_BODYLOCK: {
        key: 'CLINCH_BODYLOCK',
        label: 'Bodylock',
        shortLabel: 'Bodylock',
        control: 0.62,
        submissionEdge: 0.3,
        groundStrikeEdge: 0.45,
        escape: 0.38,
        transitionsUp: [
            { to: 'SIDE_CONTROL', delta: 4 },
            { to: 'NEUTRAL_GUARD', delta: 2 }
        ],
        transitionsDown: [
            { to: 'CLINCH_OVER_UNDER', delta: 4 }
        ]
    }
};

export const POSITION_ORDER = [
    'CLINCH_OVER_UNDER',
    'CLINCH_BODYLOCK',
    'NEUTRAL_GUARD',
    'HALF_GUARD',
    'SIDE_CONTROL',
    'NORTH_SOUTH',
    'MOUNT',
    'BACK_CONTROL'
];

export function getPosition(key) {
    return GROUND_POSITIONS[key] || GROUND_POSITIONS.NEUTRAL_GUARD;
}

/**
 * Compare two position keys by dominance. Returns negative if A is less
 * dominant, positive if more dominant. Used by momentum tracking.
 */
export function comparePositionDominance(keyA, keyB) {
    return getPosition(keyA).control - getPosition(keyB).control;
}

/**
 * Did this transition represent a sweep / reversal — i.e. the bottom
 * fighter ended up on top? Identified when the corner that was the top
 * fighter changes hands.
 */
export function isReversal(prevTop, nextTop) {
    return prevTop && nextTop && prevTop !== nextTop;
}

/**
 * Pick a positional transition for the top fighter on this step.
 *
 * grappleDelta = topGrapplingScore - bottomGrapplingScore (signed).
 *   Strong positive = top fighter dominates, can advance.
 *   Strong negative = bottom escapes / sweeps.
 *
 * Returns: { nextPosition, nextTop, transitionLabel, reversed }
 */
export function resolvePositionTransition({
    currentPosition,
    topCorner,
    grappleDelta,
    rng = Math.random
}) {
    const pos = getPosition(currentPosition);
    const bottomCorner = topCorner === 'red' ? 'blue' : 'red';

    // Bottom escape / sweep path: a clearly negative delta means the
    // bottom fighter wins the grappling exchange.
    if (grappleDelta < -3 && pos.transitionsDown.length > 0) {
        const escapeRoll = rng();
        const escapeChance = Math.min(0.85, pos.escape + (Math.abs(grappleDelta) * 0.04));
        if (escapeRoll < escapeChance) {
            // On a strong sweep (delta < -8), bottom takes top position.
            if (grappleDelta < -8 && rng() < 0.55) {
                const sweepTarget = pos.transitionsDown[0];
                return {
                    nextPosition: sweepTarget.to,
                    nextTop: bottomCorner,
                    transitionLabel: 'sweep',
                    reversed: true
                };
            }
            // Otherwise the top fighter loses position but stays on top.
            const downgrade = pos.transitionsDown[0];
            return {
                nextPosition: downgrade.to,
                nextTop: topCorner,
                transitionLabel: 'escape',
                reversed: false
            };
        }
    }

    // Top advance path: positive delta + a roll against the advance
    // requirement.
    if (grappleDelta > 0 && pos.transitionsUp.length > 0) {
        const candidate = pos.transitionsUp.find(t => grappleDelta >= t.delta);
        if (candidate) {
            const advanceRoll = rng();
            const advanceChance = Math.min(0.78, 0.18 + (grappleDelta - candidate.delta) * 0.05);
            if (advanceRoll < advanceChance) {
                return {
                    nextPosition: candidate.to,
                    nextTop: topCorner,
                    transitionLabel: 'advance',
                    reversed: false
                };
            }
        }
    }

    // Hold position.
    return {
        nextPosition: currentPosition,
        nextTop: topCorner,
        transitionLabel: 'hold',
        reversed: false
    };
}

/**
 * Grappling score component derived from a fighter's stats. Higher
 * means better at controlling and advancing on the ground.
 */
export function getGrapplingScore(stats) {
    if (!stats) return 50;
    return (
        (stats.takedownDefense || 50) * 0.15 +
        (stats.takedownOffense || stats.takedown || 50) * 0.15 +
        (stats.groundControl || stats.clinchControl || 50) * 0.25 +
        (stats.submissionDefense || 50) * 0.15 +
        (stats.grappleSpeed || 50) * 0.15 +
        (stats.bodyStrength || stats.strength || 50) * 0.15
    );
}

/**
 * Determine which corner starts on top when grappling begins. The
 * fighter with the higher takedown/clinch entry score earns the top
 * position; a tied or close roll defaults to the aggressor.
 */
export function pickInitialTop({
    aggressor,
    redGrapple,
    blueGrapple,
    rng = Math.random
}) {
    const delta = redGrapple - blueGrapple;
    if (Math.abs(delta) < 4) {
        return aggressor;
    }
    const swing = rng();
    if (delta > 0 && swing < 0.7) return 'red';
    if (delta < 0 && swing < 0.7) return 'blue';
    return aggressor;
}
