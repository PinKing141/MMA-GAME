/**
 * Referee stoppages, doctor stoppages, and stoppage timing nuance.
 *
 * The fight engine doesn't have to wait for a "finish step" to call a
 * fight off — referees stop fights mid-exchange when a fighter has
 * stopped intelligently defending, and ringside doctors stop fights
 * between rounds (or mid-round on severe cuts and broken bones).
 *
 * This module also tracks late-fight comeback logic and momentum
 * swings, which the simulation uses to bias action toward dramatic
 * fight-changing moments.
 */

/**
 * Decide whether the referee should stop the action mid-fight.
 *
 * Triggers:
 *  - HP at 0 (definitive KO)
 *  - HP below 12 AND fighter is down AND took a heavy shot
 *  - HP below 18 AND fighter has been hurt for 2+ consecutive steps
 *    without intelligently defending (failed to respond)
 *
 * Returns:
 * { stopped: bool, type: 'KO'|'TKO'|null, reason: string }
 */
export function evaluateRefereeStoppage({
    defenderHP,
    defenderDown,
    defenderResponded,
    consecutiveHurtSteps,
    damageThisStep,
    round
}) {
    if (defenderHP <= 0) {
        return {
            stopped: true,
            type: 'KO',
            reason: 'Fighter is out cold. Referee waves it off immediately.'
        };
    }

    if (defenderHP < 12 && defenderDown && damageThisStep >= 14) {
        return {
            stopped: true,
            type: 'TKO',
            reason: 'Fighter is hurt on the canvas. Referee jumps in to save them.'
        };
    }

    if (
        defenderHP < 18 &&
        consecutiveHurtSteps >= 2 &&
        !defenderResponded
    ) {
        return {
            stopped: true,
            type: 'TKO',
            reason: 'Fighter not intelligently defending. Referee has seen enough.'
        };
    }

    // Stoppage timing nuance: in championship rounds the referee gives
    // a little more rope — but not for total non-responders.
    if (
        defenderHP < 14 &&
        consecutiveHurtSteps >= 3 &&
        round >= 4
    ) {
        return {
            stopped: true,
            type: 'TKO',
            reason: 'Even in the championship rounds, the referee has to step in.'
        };
    }

    return { stopped: false, type: null, reason: '' };
}

/**
 * Decide whether the cageside doctor calls the fight. Triggered between
 * rounds or on a clean visual cue (cut accumulation, broken nose,
 * heavy facial damage). Mid-round doctor stoppages are rare.
 */
export function evaluateDoctorStoppage({
    headDamage,
    bodyDamage,
    cutSeverity,
    isRoundBreak,
    round
}) {
    // Heavy facial damage at a round break.
    if (isRoundBreak && headDamage >= 78 && round >= 2) {
        return {
            stopped: true,
            reason: 'Cageside doctor stops the fight. Cuts and swelling are too much to send the fighter back out.'
        };
    }

    // Severe cut accumulation can trigger mid-round.
    if (cutSeverity >= 0.9 && headDamage >= 60) {
        return {
            stopped: true,
            reason: 'Doctor waves it off. The cut is pouring and the fighter cannot see clean.'
        };
    }

    // Broken bone / heavy body damage at a break.
    if (isRoundBreak && bodyDamage >= 82) {
        return {
            stopped: true,
            reason: 'Doctor stops the fight in the corner. Suspected broken rib — the fighter cannot defend.'
        };
    }

    return { stopped: false, reason: '' };
}

/**
 * Should the trailing fighter risk a desperation push? Used by the
 * comeback / momentum-swing layer of the simulator.
 *
 * Returns a multiplier on aggression and damage output. Trailing
 * fighters in the last two minutes of the final round take
 * fight-ending swings.
 */
export function getLateFightComeback({
    round,
    totalRounds,
    timeRemainingInRound,
    scoreLead,
    fighterHP
}) {
    const isFinalStretch =
        round === totalRounds && timeRemainingInRound <= 120;
    const isLastRound = round === totalRounds;
    const trailing = scoreLead < 0;

    if (!trailing || fighterHP < 18) {
        return { aggressionBonus: 0, damageBonus: 0, riskBonus: 0, label: null };
    }

    if (isFinalStretch) {
        const deficit = Math.min(40, Math.abs(scoreLead));
        return {
            aggressionBonus: 0.35 + deficit * 0.005,
            damageBonus: 0.25,
            riskBonus: 0.4,
            label: 'Hail Mary'
        };
    }

    if (isLastRound) {
        return {
            aggressionBonus: 0.2,
            damageBonus: 0.12,
            riskBonus: 0.2,
            label: 'Championship push'
        };
    }

    if (round >= totalRounds - 1 && Math.abs(scoreLead) >= 14) {
        return {
            aggressionBonus: 0.15,
            damageBonus: 0.08,
            riskBonus: 0.1,
            label: 'Sense of urgency'
        };
    }

    return { aggressionBonus: 0, damageBonus: 0, riskBonus: 0, label: null };
}

/**
 * Track and update a momentum value [-1..1]. Positive = red corner is
 * surging, negative = blue is. Used to color callouts, cue corner
 * feeds, and amplify the next step's intensity when the swing is big.
 *
 * Increments toward the aggressor when damage lands, decays toward 0
 * when nothing is happening.
 */
export function updateMomentum({
    previousMomentum,
    damageDealt,
    aggressor,
    knockdown,
    submissionAttempt,
    foulCalled
}) {
    const direction = aggressor === 'red' ? 1 : -1;
    let delta = (damageDealt / 100) * direction;

    if (knockdown) delta += 0.3 * direction;
    if (submissionAttempt) delta += 0.18 * direction;
    if (foulCalled) delta -= 0.12 * direction; // The fouler loses momentum.

    const next = Math.max(-1, Math.min(1, (previousMomentum * 0.9) + delta));
    return next;
}

/**
 * Convert a momentum value into a readable broadcast tag.
 */
export function describeMomentum(momentum) {
    const magnitude = Math.abs(momentum);
    if (magnitude < 0.2) return null;
    const corner = momentum > 0 ? 'red' : 'blue';
    if (magnitude >= 0.7) {
        return { corner, label: 'Momentum tilt — heavy surge in their favor', tone: corner };
    }
    if (magnitude >= 0.45) {
        return { corner, label: 'Momentum building — pressure mounting', tone: corner };
    }
    return { corner, label: 'Early momentum nudge', tone: corner };
}

/**
 * Compute cut severity from accumulated head damage and the latest
 * shot. A laceration starts to bleed at ~50 head damage, becomes
 * serious at ~75, and is a doctor's-call at ~90.
 */
export function getCutSeverity({ headDamage, lastDamage, target }) {
    if (target !== 'head') return 0;
    const base = Math.max(0, (headDamage - 50) / 40);
    const acuteBoost = lastDamage >= 18 ? 0.2 : 0;
    return Math.min(1, base + acuteBoost);
}
