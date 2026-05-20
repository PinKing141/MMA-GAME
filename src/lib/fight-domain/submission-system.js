/**
 * Submission attempts, escape sequences, and failed-attempt fallout.
 *
 * A submission attempt has four possible outcomes:
 *  - tap        : defender taps, fight ends
 *  - escape     : defender slips the hold, often loses position to the
 *                 attacker who burned energy committing to the lock
 *  - reversal   : defender slips AND inverts position (sweep out of a
 *                 submission attempt — happens on poor commitments)
 *  - hold       : neither side wins the exchange, hold continues
 *
 * Failed attempts cost the attacker stamina and often a piece of
 * position — committing fully to an armbar from mount and missing
 * gives up the back.
 */

import { getPosition, GROUND_POSITIONS } from './ground-positions.js';

const SUBMISSION_CATALOG = {
    REAR_NAKED_CHOKE: {
        key: 'REAR_NAKED_CHOKE',
        label: 'Rear-Naked Choke',
        shortLabel: 'RNC',
        family: 'choke',
        validFrom: ['BACK_CONTROL'],
        baseTap: 0.42,
        failPositionPenalty: 0.6,
        target: 'Neck'
    },
    GUILLOTINE: {
        key: 'GUILLOTINE',
        label: 'Guillotine',
        shortLabel: 'Guillo',
        family: 'choke',
        validFrom: ['NEUTRAL_GUARD', 'HALF_GUARD', 'CLINCH_OVER_UNDER', 'CLINCH_BODYLOCK'],
        baseTap: 0.24,
        failPositionPenalty: 0.9,
        target: 'Neck'
    },
    TRIANGLE: {
        key: 'TRIANGLE',
        label: 'Triangle Choke',
        shortLabel: 'Triangle',
        family: 'choke',
        validFrom: ['NEUTRAL_GUARD', 'MOUNT'],
        baseTap: 0.28,
        failPositionPenalty: 0.7,
        target: 'Neck'
    },
    ARM_TRIANGLE: {
        key: 'ARM_TRIANGLE',
        label: 'Arm Triangle',
        shortLabel: 'Arm-Tri',
        family: 'choke',
        validFrom: ['SIDE_CONTROL', 'MOUNT', 'NORTH_SOUTH'],
        baseTap: 0.32,
        failPositionPenalty: 0.5,
        target: 'Neck'
    },
    ARMBAR: {
        key: 'ARMBAR',
        label: 'Armbar',
        shortLabel: 'Armbar',
        family: 'joint',
        validFrom: ['NEUTRAL_GUARD', 'MOUNT', 'BACK_CONTROL', 'SIDE_CONTROL'],
        baseTap: 0.3,
        failPositionPenalty: 1.0,
        target: 'Joint'
    },
    KIMURA: {
        key: 'KIMURA',
        label: 'Kimura',
        shortLabel: 'Kimura',
        family: 'joint',
        validFrom: ['HALF_GUARD', 'SIDE_CONTROL', 'NORTH_SOUTH', 'NEUTRAL_GUARD'],
        baseTap: 0.26,
        failPositionPenalty: 0.4,
        target: 'Joint'
    },
    HEEL_HOOK: {
        key: 'HEEL_HOOK',
        label: 'Heel Hook',
        shortLabel: 'Heel',
        family: 'joint',
        validFrom: ['NEUTRAL_GUARD', 'HALF_GUARD'],
        baseTap: 0.34,
        failPositionPenalty: 1.1,
        target: 'Joint'
    },
    DARCE: {
        key: 'DARCE',
        label: "D'Arce Choke",
        shortLabel: "D'Arce",
        family: 'choke',
        validFrom: ['HALF_GUARD', 'SIDE_CONTROL', 'NORTH_SOUTH'],
        baseTap: 0.3,
        failPositionPenalty: 0.5,
        target: 'Neck'
    }
};

export function getSubmissionEntry(key) {
    return SUBMISSION_CATALOG[key] || null;
}

export function getValidSubmissions(positionKey) {
    return Object.values(SUBMISSION_CATALOG).filter(sub =>
        sub.validFrom.includes(positionKey)
    );
}

/**
 * Should the top fighter attempt a submission this step? Submission
 * specialists try far more often; specialists who've been controlling
 * also press the issue.
 *
 * Returns the chosen submission entry or null.
 */
export function pickSubmissionAttempt({
    positionKey,
    attackerSubScore,
    attackerStamina,
    holdSteps,
    rng = Math.random
}) {
    const validSubs = getValidSubmissions(positionKey);
    if (validSubs.length === 0) return null;

    // Attempt rate scales with sub score and how long this position has
    // been held — controllers tee up submissions, scramblers don't.
    const baseRate = Math.max(0.04, ((attackerSubScore - 50) / 100));
    const holdBonus = Math.min(0.3, holdSteps * 0.08);
    const fatiguePenalty = attackerStamina < 30 ? 0.4 : attackerStamina < 55 ? 0.15 : 0;
    const rate = Math.max(0.02, baseRate + holdBonus - fatiguePenalty);

    if (rng() > rate) return null;

    // Weighted pick — heel hooks/RNCs more likely from the right
    // positions, fallback to first valid otherwise.
    const idx = Math.floor(rng() * validSubs.length);
    return validSubs[idx];
}

/**
 * Resolve a submission attempt. Returns:
 * {
 *   outcome: 'tap' | 'escape' | 'reversal' | 'hold',
 *   damage: number (toll on defender from being trapped in the hold),
 *   staminaCost: number (toll on attacker for committing to the lock),
 *   description: string
 * }
 */
export function resolveSubmissionAttempt({
    submission,
    positionKey,
    attackerSubScore,
    defenderSubDefense,
    defenderStamina,
    defenderHP,
    rng = Math.random
}) {
    const pos = getPosition(positionKey);
    const positionEdge = pos.submissionEdge || 0.6;

    // Tap probability — attacker sub score and position vs defender
    // submission defense, hurt/gassed defenders tap easier.
    const skillDelta = (attackerSubScore - defenderSubDefense) * 0.01;
    const conditionPenalty = ((100 - defenderStamina) * 0.0015)
        + ((100 - defenderHP) * 0.0025);
    const tapChance = Math.max(
        0,
        Math.min(0.85, submission.baseTap * positionEdge + skillDelta + conditionPenalty)
    );

    const roll = rng();
    if (roll < tapChance) {
        return {
            outcome: 'tap',
            damage: 22,
            staminaCost: 12,
            description: `locks in the ${submission.label} — forces the tap`
        };
    }

    // Defender's escape chance — high submission defense fighters keep
    // their cool and slip the lock.
    const escapeRoll = rng();
    const escapeBase = 0.5 + ((defenderSubDefense - 50) * 0.006);
    const escapeChance = Math.min(0.9, escapeBase - (submission.baseTap * 0.3));

    if (escapeRoll < escapeChance) {
        // Reversal: a heavy commitment that fails AND the defender has
        // the grappling chops to invert. Gated on the submission's
        // failPositionPenalty — heel hooks and guillotines reverse;
        // arm-triangles don't.
        const reversalRoll = rng();
        const reversalChance = (submission.failPositionPenalty * 0.18)
            + ((defenderSubDefense - attackerSubScore) * 0.004);
        if (reversalRoll < reversalChance && submission.failPositionPenalty >= 0.7) {
            return {
                outcome: 'reversal',
                damage: 4,
                staminaCost: 14,
                description: `commits to the ${submission.label} — defender slips out and sweeps`
            };
        }

        return {
            outcome: 'escape',
            damage: 5,
            staminaCost: 10,
            description: `goes hunting for the ${submission.label} — defender escapes the hold`
        };
    }

    // Neither tap nor escape — the hold continues, with significant
    // toll on the defender (drained, hurt) and the attacker (gassed).
    return {
        outcome: 'hold',
        damage: 7,
        staminaCost: 8,
        description: `hunts the ${submission.label} — fighter trapped in the hold, fighting through it`
    };
}
