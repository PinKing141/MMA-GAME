import { ATTRIBUTE_GROUPS } from '../data.js';
import { getWeightClassEntry } from '../core.js';
import { clamp, getAttributeAverage } from '../utils/calculations.js';
import { formatMoney } from '../utils/formatters.js';
import { getAllowedVenueTiers, getDefaultVenueTier } from './venues.js';
import { pickMove, pickRange } from '../domain/move-selector.js';
import {
    getPosition,
    getGrapplingScore,
    pickInitialTop,
    resolvePositionTransition,
    isReversal
} from './ground-positions.js';
import {
    pickSubmissionAttempt,
    resolveSubmissionAttempt
} from './submission-system.js';
import {
    maybeGenerateFoul,
    resolveFoulIntervention,
    describeIntervention
} from './fouls-system.js';
import {
    evaluateRefereeStoppage,
    evaluateDoctorStoppage,
    getLateFightComeback,
    updateMomentum,
    describeMomentum,
    getCutSeverity
} from './stoppage-system.js';

function countryCodeToFlagEmoji(code) {
    if (!code || typeof code !== 'string' || code.length !== 2) {
        return '';
    }

    return code
        .toUpperCase()
        .split('')
        .map(character => String.fromCodePoint(character.charCodeAt(0) + 127397))
        .join('');
}

function getStance(hand) {
    return hand === 'left' ? 'Southpaw' : 'Orthodox';
}

function getSubmissionScore(stats) {
    return Math.round((stats.submissionOffense + stats.chokeSubmission + stats.jointSubmission) / 3);
}

function getCompositeScore(stats, conditionAdjustment = 0) {
    const standup = getAttributeAverage(stats, 'standup', ATTRIBUTE_GROUPS);
    const grappling = getAttributeAverage(stats, 'grappling', ATTRIBUTE_GROUPS);
    const health = getAttributeAverage(stats, 'health', ATTRIBUTE_GROUPS);
    const mind = getAttributeAverage(stats, 'mind', ATTRIBUTE_GROUPS);

    return (standup * 0.31) + (grappling * 0.27) + (health * 0.22) + (mind * 0.2) + conditionAdjustment;
}

function getInjuryPenalty(fightNight) {
    return (fightNight.injuries || []).reduce((sum, injury) => sum + injury.penalty, 0);
}

function getPlayerConditionAdjustment(fightNight) {
    return ((fightNight.fitness - 80) * 0.12)
        + ((fightNight.sharpness - 55) * 0.18)
        + ((fightNight.morale - 55) * 0.08)
        - (fightNight.fatigue * 0.11)
        - (fightNight.weightCutPressure * 0.08)
        - (fightNight.overtrainingWarnings * 2.1)
        - getInjuryPenalty(fightNight);
}

function getOpponentConditionAdjustment(opponent) {
    return 4 + opponent.difficultyBias;
}

function getMethod(winnerStats, loserStats, scoreGap) {
    const strikingThreat = (winnerStats.punchPower + winnerStats.kickPower + winnerStats.accuracy) / 3;
    const grapplingThreat = (winnerStats.submissionOffense + winnerStats.chokeSubmission + winnerStats.jointSubmission) / 3;
    const loserDurability = (loserStats.chinStrength + loserStats.bodyStrength + loserStats.composure) / 3;

    if (scoreGap >= 10 && grapplingThreat > strikingThreat + 3) {
        return {
            method: 'Submission',
            round: 1 + Math.floor(Math.random() * 2),
            time: `${1 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        };
    }

    if (scoreGap >= 8 && strikingThreat > loserDurability) {
        return {
            method: 'TKO',
            round: 1 + Math.floor(Math.random() * 3),
            time: `${1 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        };
    }

    return {
        method: scoreGap >= 5 ? 'Unanimous Decision' : 'Split Decision',
        round: null,
        time: '5:00'
    };
}

function getResultNotes(playerStats, opponent, fightNight, scoreGap, resultLabel) {
    const playerGroupEdges = Object.keys(ATTRIBUTE_GROUPS).map(groupKey => ({
        label: ATTRIBUTE_GROUPS[groupKey].label,
        edge: Math.round(getAttributeAverage(playerStats, groupKey, ATTRIBUTE_GROUPS) - getAttributeAverage(opponent.stats, groupKey, ATTRIBUTE_GROUPS))
    }));
    const bestEdge = playerGroupEdges.sort((left, right) => right.edge - left.edge)[0];
    const injuryCount = (fightNight.injuries || []).length;
    const injuryNote = injuryCount
        ? `Camp carried ${injuryCount} injury issue${injuryCount > 1 ? 's' : ''} into the fight.`
        : 'Camp reached fight night without a listed injury carrying over.';
    const cutNote = fightNight.weightCutPressure >= 55
        ? 'The weight cut was rough and the gas tank showed it.'
        : 'The weight cut stayed under control and the gas tank held up.';

    return [
        `${resultLabel} came from the ${bestEdge.label.toLowerCase()} edge swinging the matchup by ${Math.abs(bestEdge.edge)} points.`,
        injuryNote,
        scoreGap >= 0 ? cutNote : 'The opponent handled the pace better and kept the cleaner reads under pressure.'
    ];
}

function createReplayCorner(corner, fighter, setupWeight) {
    return {
        name: fighter.name,
        nickname: fighter.nickname,
        flag: fighter.flag,
        country: fighter.country,
        age: fighter.age,
        stance: fighter.stance,
        weightClass: corner === 'red' ? getWeightClassEntry(setupWeight).name : fighter.weightClass,
        stats: fighter.stats
    };
}

function createReplayState(initialStamina, y, facing, action) {
    return {
        hp: 100,
        hpMax: 100,
        stm: initialStamina,
        stmMax: 100,
        damage: { head: 0, body: 0, legs: 0 },
        x: 50,
        y,
        facing,
        action,
        down: false
    };
}

function getFacingAngle(from, to) {
    return (Math.atan2(to.x - from.x, from.y - to.y) * (180 / Math.PI) + 360) % 360;
}

/**
 * Per-range gap profiles. The gap between fighters scales with the
 * current range — clinch/ground exchanges sit on top of each other,
 * long-range exchanges keep distance. Keeps motion inside the cage
 * with tighter clamps than before (28-72 vs 24-76).
 */
const RANGE_GAP = {
    Long:   { lateral: 5.0, vertical: 6.4 },
    Mid:    { lateral: 3.2, vertical: 4.8 },
    Close:  { lateral: 2.0, vertical: 3.6 },
    Clinch: { lateral: 1.0, vertical: 2.2 },
    Ground: { lateral: 0.6, vertical: 1.4 }
};

/**
 * Sum the Primary Range distribution of a fingerprint into a movement
 * profile: how much this fighter wants to close vs hold distance.
 * - closing: 0..1, drive toward Clinch/Ground (wrestlers high)
 * - distance: 0..1, hold Long/Mid space (out-fighters high)
 * - pressure: 0..1, walk forward regardless (Muay Thai high)
 */
export function getMovementProfile(fingerprint) {
    if (!fingerprint || Object.keys(fingerprint).length === 0) {
        return { closing: 0.4, distance: 0.4, pressure: 0.4 };
    }
    // Style-name buckets. Wrestlers/grapplers close; karate/TKD hold
    // distance; Muay Thai/boxing/kickboxing press forward.
    const closing = (fingerprint['Wrestling'] || 0)
        + (fingerprint['Brazilian Jiu-Jitsu'] || 0)
        + (fingerprint['Sambo'] || 0)
        + (fingerprint['Judo'] || 0)
        + (fingerprint['Catch Wrestling'] || 0)
        + (fingerprint['Sumo'] || 0);
    const distance = (fingerprint['Tae Kwon Do'] || 0)
        + (fingerprint['Karate'] || 0)
        + (fingerprint['Savate'] || 0)
        + (fingerprint['Kickboxing'] || 0) * 0.4
        + (fingerprint['American Kickboxing'] || 0) * 0.4;
    const pressure = (fingerprint['Muay Thai'] || 0)
        + (fingerprint['Boxing'] || 0)
        + (fingerprint['Kyokushin'] || 0)
        + (fingerprint['Kickboxing'] || 0) * 0.6;
    return {
        closing: Math.min(1, closing),
        distance: Math.min(1, distance),
        pressure: Math.min(1, pressure)
    };
}

/**
 * Compute target positions for both fighters this step. Respects:
 * - current range (clinch/ground stack them, long pushes apart)
 * - aggressor's movement profile (pressure closes faster)
 * - retreat state (defender drifts toward a wall when hurt)
 * - cage cutting (aggressor positions between defender and center)
 * - the cage clamp box (28-72 on both axes)
 */
function getExchangePositions({
    round,
    step,
    aggressor,
    isFinish,
    range = 'Mid',
    aggressorProfile = { pressure: 0.5, closing: 0.4, distance: 0.4 },
    defenderProfile = { pressure: 0.5, closing: 0.4, distance: 0.4 },
    defenderRetreating = false,
    defenderWallSide = null,
    prevRed = null,
    prevBlue = null
}) {
    const orbit = (round * 0.82) + (step * 0.67) + (aggressor === 'red' ? 0.24 : -0.24);
    const centerX = clamp(50 + (Math.sin(orbit * 1.15) * 7), 40, 60);
    const centerY = clamp(50 + (Math.cos(orbit * 0.95) * 8), 38, 62);
    const profile = RANGE_GAP[range] || RANGE_GAP.Mid;

    // Pressure shrinks the gap; distance widens it. The defender's
    // distance bias also widens (they retreat to range).
    const gapMultiplier = clamp(
        1 + (defenderProfile.distance * 0.25) - (aggressorProfile.pressure * 0.3),
        0.55, 1.4
    );
    const lateralGap = (isFinish ? profile.lateral * 0.55 : profile.lateral) * gapMultiplier;
    const verticalGap = (isFinish ? profile.vertical * 0.7 : profile.vertical) * gapMultiplier;

    // Pressure shift — aggressor closes harder when their profile
    // demands it, defender's closing profile pulls them back.
    const pressureShift = (aggressor === 'red' ? -1 : 1) * (0.4 + aggressorProfile.pressure * 0.6);

    let redX = centerX - lateralGap + Math.min(0, pressureShift);
    let blueX = centerX + lateralGap + Math.max(0, pressureShift);
    let redY = centerY - (verticalGap / 2) + (aggressor === 'red' ? -1.1 : 0.7);
    let blueY = centerY + (verticalGap / 2) + (aggressor === 'blue' ? 1.1 : -0.7);

    // Defender retreat: drift the defender toward the nearest wall on
    // the chosen side. Aggressor cuts the angle by positioning between
    // the defender and the cage center on that side.
    if (defenderRetreating) {
        const wall = defenderWallSide || (aggressor === 'red' ? 'right' : 'left');
        const wallTarget = wall === 'right' ? 70 : 30;
        if (aggressor === 'red') {
            blueX = blueX * 0.45 + wallTarget * 0.55;
            // Cut the angle — red moves toward the same wall but slightly
            // inside the defender's escape path.
            redX = clamp(blueX + 2.4, 28, 72);
        } else {
            redX = redX * 0.45 + wallTarget * 0.55;
            blueX = clamp(redX - 2.4, 28, 72);
        }
    }

    // Smooth toward the target so fighters slide rather than teleport
    // between steps. Heavier interpolation on the wall-cutting path.
    const smooth = defenderRetreating ? 0.55 : 0.4;
    if (prevRed) {
        redX = prevRed.x * (1 - smooth) + redX * smooth;
        redY = prevRed.y * (1 - smooth) + redY * smooth;
    }
    if (prevBlue) {
        blueX = prevBlue.x * (1 - smooth) + blueX * smooth;
        blueY = prevBlue.y * (1 - smooth) + blueY * smooth;
    }

    return {
        red: { x: clamp(redX, 28, 72), y: clamp(redY, 28, 72) },
        blue: { x: clamp(blueX, 28, 72), y: clamp(blueY, 28, 72) }
    };
}

function cloneReplayState(cornerState) {
    return {
        ...cornerState,
        damage: { ...cornerState.damage }
    };
}

function pickCommentary(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

function getActionPools(winnerCorner, method) {
    const redBias = winnerCorner === 'red' ? 1 : -1;

    return {
        red: redBias > 0
            ? ['cracks the jab', 'steps into the right hand', 'forces a hard scramble', 'starts to pressure the fence']
            : ['works behind the jab', 'fires to the body', 'tries to reset in space', 'catches a breath at range'],
        blue: redBias < 0
            ? ['rips the counter clean', 'puts combinations together', 'walks into the pocket hard', 'turns the corner in the clinch']
            : ['faints and circles out', 'checks the kick and answers', 'stays patient at range', 'changes level to keep it honest'],
        finish: method === 'Submission'
            ? ['locks the choke in tight', 'finds the neck in transition', 'forces the tap in a scramble']
            : ['lands the burst that changes everything', 'piles on with the finishing sequence', 'breaks through with the stoppage flurry']
    };
}

function getTimeForStep(roundDuration, stepIndex, stepCount, isFinish, finishTime) {
    if (isFinish && finishTime) {
        return finishTime;
    }

    const elapsed = Math.round(((stepIndex + 1) / (stepCount + 1)) * (roundDuration - 18));
    const remaining = Math.max(0, roundDuration - elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function buildScorecards(resultLabel, winnerCorner, totalRounds) {
    const red = Array(totalRounds).fill(10);
    const blue = Array(totalRounds).fill(10);

    for (let index = 0; index < totalRounds; index += 1) {
        if (resultLabel === 'Draw' && index === totalRounds - 1) {
            red[index] = 10;
            blue[index] = 10;
            continue;
        }

        if (winnerCorner === 'red') {
            blue[index] = index === 1 && resultLabel !== 'Draw' ? 8 : 9;
            continue;
        }

        if (winnerCorner === 'blue') {
            red[index] = index === 1 && resultLabel !== 'Draw' ? 8 : 9;
        }
    }

    return { red, blue };
}

/**
 * Force the finish step into the range that matches the method.
 * Submissions happen on the ground; KO/TKO happen in striking range.
 */
function getFinishRange(method) {
    if (method === 'Submission') return 'Ground';
    if (method === 'TKO' || method === 'KO') return 'Mid';
    return null;
}

/**
 * Build a corner-style tactical note for the round break, reading the
 * round's damage delta and the most-used range. Used in place of the
 * old generic "Round N ends" line.
 */
function buildRoundNote({ round, redDamage, blueDamage, playerName, opponentName, dominantRange, redKnockdowns, blueKnockdowns }) {
    const delta = redDamage - blueDamage;
    const leadName = delta > 0 ? playerName : opponentName;
    const trailName = delta > 0 ? opponentName : playerName;
    const lastNameLead = leadName.split(/\s+/).slice(-1)[0];
    const lastNameTrail = trailName.split(/\s+/).slice(-1)[0];
    const knockdownNote = (redKnockdowns + blueKnockdowns) > 0
        ? ` ${redKnockdowns > 0 ? lastNameTrail : lastNameLead} hit the canvas.`
        : '';

    const rangeColor = {
        Long: 'kept it long',
        Mid: 'fought at boxing range',
        Close: 'lived in the pocket',
        Clinch: 'won the clinch exchanges',
        Ground: 'controlled the ground'
    }[dominantRange] || 'pressed the action';

    if (Math.abs(delta) < 6) {
        return `Round ${round} was even. Both corners had work to do — ${lastNameLead} edged it by hair on the ${rangeColor.replace('won the ', '').replace('controlled the ', '')}.${knockdownNote}`;
    }
    if (Math.abs(delta) < 14) {
        return `Round ${round} to ${lastNameLead} — ${rangeColor} and out-landed ${lastNameTrail}.${knockdownNote}`;
    }
    return `Round ${round} was a clear ${lastNameLead} round. ${lastNameTrail} could not get out of the way and ${rangeColor.replace('won the ', '').replace('controlled the ', '')}.${knockdownNote}`;
}

/**
 * Aggression curve based on round, score gap, and remaining cardio.
 * Trailing fighters in later rounds get desperate; tired fighters slow
 * down regardless of round.
 */
function getAggression({ round, totalRounds, scoreLead, stamina }) {
    let base = 0.55;
    // Late-round urgency for the fighter behind on cards.
    if (round >= totalRounds - 1 && scoreLead < 0) {
        base += 0.25 + Math.min(0.2, Math.abs(scoreLead) * 0.05);
    } else if (round === totalRounds) {
        base += 0.1;
    }
    // Tired fighters pull aggression way back.
    if (stamina < 35) {
        base -= 0.25;
    } else if (stamina < 55) {
        base -= 0.1;
    }
    return Math.max(0.2, Math.min(0.95, base));
}

/**
 * Verb table for the play-by-play. Mirrors describeMove but tuned for
 * the fight ticker's rhythm.
 */
function getActionVerb(move) {
    const type = (move?.Type || '').toLowerCase();
    switch (type) {
        case 'punch': return 'rips';
        case 'kick': return 'whips';
        case 'knee': return 'drives';
        case 'elbow': return 'cuts with';
        case 'takedown': return 'shoots';
        case 'throw': return 'launches';
        case 'submission': return 'attacks with';
        case 'sweep': return 'sweeps with';
        case 'control': return 'locks down with';
        case 'clinch': return 'clinches with';
        case 'defense': return 'reads with';
        case 'headbutt': return 'lands a';
        default: return 'lands';
    }
}

function buildReplay({ player, opponent, contract, fightNight, resultLabel, methodInfo, playerFingerprint, opponentFingerprint }) {
    const winnerCorner = resultLabel === 'Win' ? 'red' : resultLabel === 'Loss' ? 'blue' : 'draw';
    const venue = getDefaultVenueTier(contract);
    const allowedVenues = getAllowedVenueTiers(contract);
    const totalRounds = 3;
    const resolvedRounds = methodInfo.round || totalRounds;
    const playerReadiness = clamp(Math.round((fightNight.fitness + fightNight.sharpness) / 2), 45, 100);
    const opponentReadiness = clamp(80 - (opponent.difficultyBias * 4), 42, 96);
    const playerProfile = getMovementProfile(playerFingerprint);
    const opponentProfile = getMovementProfile(opponentFingerprint);
    const profiles = { red: playerProfile, blue: opponentProfile };
    // Retreat state persists across steps so cage-cutting reads correctly.
    const retreatState = { red: false, blue: false, redWall: null, blueWall: null };

    // Grappling / ground state — current position, who's on top, how
    // long they've held it, and the running fouls tally.
    const grappleScores = {
        red: getGrapplingScore(player.stats),
        blue: getGrapplingScore(opponent.stats)
    };
    const subScores = {
        red: (player.stats.submissionOffense || 50),
        blue: (opponent.stats.submissionOffense || 50)
    };
    const subDefense = {
        red: (player.stats.submissionDefense || 50),
        blue: (opponent.stats.submissionDefense || 50)
    };
    const groundState = {
        active: false,
        positionKey: 'NEUTRAL_GUARD',
        topCorner: 'red',
        holdSteps: 0
    };
    const foulHistory = { red: [], blue: [] };
    const pointDeductions = { red: 0, blue: 0 };
    let momentum = 0;
    // Track how many consecutive steps each fighter has spent hurt
    // without responding — referee stoppage trigger.
    const hurtStreak = { red: 0, blue: 0 };
    const responded = { red: true, blue: true };
    // Optional early stoppage discovered mid-loop (ref/doctor/dq).
    let earlyStoppage = null;

    const openingPositions = getExchangePositions({
        round: 1, step: 0, aggressor: 'red', isFinish: false, range: 'Mid',
        aggressorProfile: playerProfile, defenderProfile: opponentProfile
    });
    const redState = createReplayState(playerReadiness, openingPositions.red.y, getFacingAngle(openingPositions.red, openingPositions.blue), 'Awaiting bell');
    const blueState = createReplayState(opponentReadiness, openingPositions.blue.y, getFacingAngle(openingPositions.blue, openingPositions.red), 'Awaiting bell');
    redState.x = openingPositions.red.x;
    blueState.x = openingPositions.blue.x;
    const actionPools = getActionPools(winnerCorner, methodInfo.method);
    const timeline = [];
    const dramaticMoments = new Set(['TKO', 'Submission']);

    for (let round = 1; round <= resolvedRounds; round += 1) {
        const stepCount = round === resolvedRounds && methodInfo.round ? 5 : 4;
        const roundDamage = { red: 0, blue: 0 };
        const roundRangeCount = {};
        const roundKnockdowns = { red: 0, blue: 0 };

        for (let step = 0; step < stepCount; step += 1) {
            if (earlyStoppage) break;
            const isFinish = Boolean(methodInfo.round && round === methodInfo.round && step === stepCount - 1);
            let aggressor = isFinish
                ? winnerCorner
                : (round + step) % 2 === 0
                    ? (winnerCorner === 'draw' ? 'red' : winnerCorner)
                    : (winnerCorner === 'draw' ? 'blue' : (winnerCorner === 'red' ? 'blue' : 'red'));
            let defender = aggressor === 'red' ? 'blue' : 'red';
            let attackerState = aggressor === 'red' ? redState : blueState;
            let defenderState = defender === 'red' ? redState : blueState;
            let aggressorFingerprint = aggressor === 'red' ? playerFingerprint : opponentFingerprint;
            let hasFingerprint = aggressorFingerprint && Object.keys(aggressorFingerprint).length > 0;

            // Pick a real move when we have a fingerprint; otherwise
            // fall back to the legacy generic phrase pool.
            let range = isFinish
                ? (getFinishRange(methodInfo.method) || pickRange({ fingerprint: aggressorFingerprint }))
                : pickRange({ fingerprint: aggressorFingerprint });

            // Ground-game continuity: if we're already on the ground,
            // stay there for at least one more step (positional grappling
            // flow). Exit only on neutralizing scrambles handled below.
            if (groundState.active && !isFinish && Math.random() < 0.7) {
                range = 'Ground';
            }

            // When entering Ground or Clinch, initialize the position
            // system and reassign aggressor to whichever corner won the
            // entry — i.e. the top fighter, not the corner who happened
            // to be on the alternating "aggressor" tick.
            if ((range === 'Ground' || range === 'Clinch') && !groundState.active) {
                groundState.active = true;
                groundState.positionKey = range === 'Clinch' ? 'CLINCH_OVER_UNDER' : 'NEUTRAL_GUARD';
                groundState.topCorner = pickInitialTop({
                    aggressor,
                    redGrapple: grappleScores.red,
                    blueGrapple: grappleScores.blue
                });
                groundState.holdSteps = 0;
            }
            if (range !== 'Ground' && range !== 'Clinch' && groundState.active) {
                // Scramble back to the feet — reset ground state.
                groundState.active = false;
                groundState.positionKey = 'NEUTRAL_GUARD';
                groundState.holdSteps = 0;
            }
            if (groundState.active) {
                aggressor = groundState.topCorner;
                defender = aggressor === 'red' ? 'blue' : 'red';
                attackerState = aggressor === 'red' ? redState : blueState;
                defenderState = defender === 'red' ? redState : blueState;
                aggressorFingerprint = aggressor === 'red' ? playerFingerprint : opponentFingerprint;
                hasFingerprint = aggressorFingerprint && Object.keys(aggressorFingerprint).length > 0;
            }

            // AI urgency: scoreLead positive when aggressor is ahead on
            // damage this fight, negative when behind. Stamina drops over
            // the fight and rises slightly between rounds.
            const scoreLead = aggressor === 'red'
                ? (100 - blueState.hp) - (100 - redState.hp)
                : (100 - redState.hp) - (100 - blueState.hp);

            // Late-fight comeback overlay — trailing fighters in the
            // final stretch swing harder, take more risks, and pile on
            // damage. Burns stamina faster.
            const timeRemainingInRound = Math.max(0, 300 - Math.round(((step + 1) / (stepCount + 1)) * 282));
            const comeback = getLateFightComeback({
                round,
                totalRounds: resolvedRounds,
                timeRemainingInRound,
                scoreLead,
                fighterHP: attackerState.hp
            });

            const aggression = isFinish ? 0.95 : Math.min(0.99, getAggression({
                round,
                totalRounds: resolvedRounds,
                scoreLead,
                stamina: attackerState.stm
            }) + comeback.aggressionBonus);

            const realMove = hasFingerprint
                ? pickMove({
                    fingerprint: aggressorFingerprint,
                    range,
                    modifiers: {
                        hurt: attackerState.hp < 40,
                        winning: aggressor === winnerCorner && step > 1,
                        aggression
                    }
                })
                : null;

            // === Grappling resolution ===
            // On a ground/clinch step, the simulator first asks: does
            // the top fighter try a submission this beat? If yes, the
            // step is the submission attempt (tap / escape / reversal /
            // hold). Otherwise the step resolves a position transition
            // and ground striking on top.
            let groundEvent = null;
            if (groundState.active && !isFinish) {
                const submissionTry = pickSubmissionAttempt({
                    positionKey: groundState.positionKey,
                    attackerSubScore: subScores[aggressor],
                    attackerStamina: attackerState.stm,
                    holdSteps: groundState.holdSteps
                });

                if (submissionTry) {
                    const outcome = resolveSubmissionAttempt({
                        submission: submissionTry,
                        positionKey: groundState.positionKey,
                        attackerSubScore: subScores[aggressor],
                        defenderSubDefense: subDefense[defender],
                        defenderStamina: defenderState.stm,
                        defenderHP: defenderState.hp
                    });

                    groundEvent = {
                        kind: 'submission',
                        attempt: submissionTry,
                        outcome,
                        text: outcome.description
                    };

                    // Apply outcome-specific position/momentum shifts.
                    if (outcome.outcome === 'tap') {
                        // Real-time submission finish — overrides the
                        // pre-rolled methodInfo and ends the fight here.
                        earlyStoppage = {
                            type: 'SUB',
                            method: 'Submission',
                            detail: `Submission · ${submissionTry.label}`,
                            winner: aggressor,
                            reason: outcome.description,
                            round,
                            time: getTimeForStep(300, step, stepCount, false, null)
                        };
                    } else if (outcome.outcome === 'reversal') {
                        // Failed submission — defender sweeps to top.
                        groundState.topCorner = defender;
                        groundState.positionKey = 'NEUTRAL_GUARD';
                        groundState.holdSteps = 0;
                    } else if (outcome.outcome === 'escape') {
                        // Defender escapes the lock but stays grounded.
                        // The submission's failure penalty downgrades the
                        // attacker's position.
                        const pos = getPosition(groundState.positionKey);
                        if (pos.transitionsDown.length > 0 && submissionTry.failPositionPenalty >= 0.5) {
                            groundState.positionKey = pos.transitionsDown[0].to;
                        }
                        groundState.holdSteps = 0;
                    } else {
                        // 'hold' — count this as continued control.
                        groundState.holdSteps += 1;
                    }
                } else {
                    // No submission this beat — resolve a position
                    // transition based on the grappling skill gap.
                    const grappleDelta = grappleScores[aggressor] - grappleScores[defender]
                        + ((attackerState.stm - defenderState.stm) * 0.2);
                    const transition = resolvePositionTransition({
                        currentPosition: groundState.positionKey,
                        topCorner: groundState.topCorner,
                        grappleDelta
                    });
                    const prevPos = getPosition(groundState.positionKey);
                    const nextPos = getPosition(transition.nextPosition);
                    const reversed = isReversal(groundState.topCorner, transition.nextTop);
                    groundState.positionKey = transition.nextPosition;
                    groundState.topCorner = transition.nextTop;
                    groundState.holdSteps = transition.transitionLabel === 'hold'
                        ? groundState.holdSteps + 1
                        : 0;

                    if (reversed) {
                        groundEvent = {
                            kind: 'reversal',
                            text: `reverses position — now in ${nextPos.label}`
                        };
                    } else if (transition.transitionLabel === 'advance') {
                        groundEvent = {
                            kind: 'advance',
                            text: `advances to ${nextPos.label}`
                        };
                    } else if (transition.transitionLabel === 'escape') {
                        groundEvent = {
                            kind: 'escape',
                            text: `frames a frame — escapes back to ${nextPos.label}`
                        };
                    } else if (groundState.holdSteps >= 2) {
                        groundEvent = {
                            kind: 'control',
                            text: `controls from ${prevPos.label}`
                        };
                    }
                }
            }

            const attackText = groundEvent && groundEvent.text
                ? groundEvent.text
                : realMove
                    ? `${getActionVerb(realMove)} a ${realMove.Move}`
                    : (isFinish
                        ? pickCommentary(actionPools.finish)
                        : pickCommentary(actionPools[aggressor]));

            // Damage zone follows the move's Target when available.
            const damageZone = realMove
                ? (realMove.Target === 'Head' ? 'head'
                    : realMove.Target === 'Legs' ? 'legs'
                    : realMove.Target === 'Neck' || realMove.Target === 'Joint' || realMove.Target === 'Hip' ? 'body'
                    : 'body')
                : (isFinish && methodInfo.method === 'Submission'
                    ? 'body'
                    : ['head', 'body', 'legs'][(round + step) % 3]);

            // Damage scales with the move's Power (1-5) so a Power-5
            // kick lands harder than a Power-2 jab. Finishes keep their
            // dramatic baseline. Position-based modifiers apply when on
            // the ground (mount strikes hit harder than guard strikes).
            const movePower = realMove ? (realMove.Power || 3) : 3;
            const positionEdge = groundState.active
                ? getPosition(groundState.positionKey).groundStrikeEdge
                : 1;
            const comebackDamageMult = 1 + comeback.damageBonus;
            let damage = isFinish
                ? (methodInfo.method === 'Submission' ? 18 : 28)
                : Math.round((3 + Math.round(movePower * 1.2) + Math.floor(Math.random() * 3))
                    * positionEdge * comebackDamageMult);

            // Submission attempts override regular striking damage with
            // the resolved outcome's damage.
            if (groundEvent && groundEvent.kind === 'submission') {
                damage = groundEvent.outcome.damage;
            } else if (groundEvent && (groundEvent.kind === 'reversal' || groundEvent.kind === 'escape')) {
                // Position transitions deal small damage from the
                // scramble itself.
                damage = Math.min(damage, 4);
            }
            const positions = getExchangePositions({
                round,
                step,
                aggressor,
                isFinish,
                range,
                aggressorProfile: profiles[aggressor],
                defenderProfile: profiles[defender],
                defenderRetreating: retreatState[defender],
                defenderWallSide: retreatState[defender + 'Wall'],
                prevRed: { x: redState.x, y: redState.y },
                prevBlue: { x: blueState.x, y: blueState.y }
            });

            // === Foul check ===
            // Look for fouls before resolving damage so the action
            // pauses cleanly. Only on standup steps — ground fouls are
            // handled separately by the back-of-head detection.
            let foulEvent = null;
            if (!isFinish && !groundEvent) {
                const foul = maybeGenerateFoul({
                    move: realMove,
                    range,
                    aggressorAggression: aggression,
                    defenderDown: defenderState.down
                });
                if (foul) {
                    const intervention = resolveFoulIntervention({
                        foul,
                        foulHistory: foulHistory[aggressor]
                    });
                    foulHistory[aggressor].push({ ...foul, round, time: timeRemainingInRound });
                    if (intervention.pointsDeducted > 0) {
                        pointDeductions[aggressor] += intervention.pointsDeducted;
                    }
                    if (intervention.intervention === 'dq') {
                        earlyStoppage = {
                            type: 'DQ',
                            method: 'Disqualification',
                            detail: `DQ · ${foul.label}`,
                            winner: defender,
                            reason: describeIntervention({
                                foul,
                                intervention: 'dq',
                                pointsDeducted: 0,
                                fouledCorner: defender
                            }),
                            round,
                            time: getTimeForStep(300, step, stepCount, false, null)
                        };
                    }
                    foulEvent = {
                        foul,
                        intervention,
                        text: describeIntervention({
                            foul,
                            intervention: intervention.intervention,
                            pointsDeducted: intervention.pointsDeducted,
                            fouledCorner: defender
                        })
                    };

                    // The fouled fighter recovers slightly during the
                    // pause — reverse a chunk of just-taken damage.
                    if (foul.damageReverse > 0) {
                        defenderState.hp = clamp(defenderState.hp + foul.damageReverse, 0, 100);
                    }
                    // The foul itself replaces the normal damage step.
                    damage = 0;
                }
            }

            attackerState.stm = clamp(attackerState.stm - (isFinish ? 7 : 3 + Math.round(movePower * 0.5)), 8, 100);
            defenderState.hp = clamp(defenderState.hp - damage, 0, 100);
            defenderState.stm = clamp(defenderState.stm - Math.max(2, Math.round(damage * 0.45)), 0, 100);
            defenderState.damage[damageZone] = clamp(defenderState.damage[damageZone] + damage * 1.3, 0, 100);

            // Submission attempt drains the attacker's stamina too.
            if (groundEvent && groundEvent.kind === 'submission') {
                attackerState.stm = clamp(attackerState.stm - groundEvent.outcome.staminaCost, 0, 100);
            }

            // === Momentum tracking ===
            momentum = updateMomentum({
                previousMomentum: momentum,
                damageDealt: damage,
                aggressor,
                knockdown: damage >= 22,
                submissionAttempt: groundEvent && groundEvent.kind === 'submission',
                foulCalled: Boolean(foulEvent)
            });

            // === Referee stoppage check ===
            // Track whether the defender responded — they "responded"
            // if they took less than 8 damage this beat or if their HP
            // is still healthy.
            if (damage >= 8 && defenderState.hp < 30) {
                hurtStreak[defender] += 1;
                responded[defender] = false;
            } else {
                hurtStreak[defender] = 0;
                responded[defender] = true;
            }

            if (!earlyStoppage && !isFinish) {
                const refStop = evaluateRefereeStoppage({
                    defenderHP: defenderState.hp,
                    defenderDown: defenderState.down,
                    defenderResponded: responded[defender],
                    consecutiveHurtSteps: hurtStreak[defender],
                    damageThisStep: damage,
                    round
                });
                if (refStop.stopped) {
                    earlyStoppage = {
                        type: refStop.type,
                        method: refStop.type,
                        detail: `${refStop.type} · Referee stoppage`,
                        winner: aggressor,
                        reason: refStop.reason,
                        round,
                        time: getTimeForStep(300, step, stepCount, false, null)
                    };
                }
            }

            // Cut accumulation — every head-shot adds to a running cut
            // score that doctors can call on.
            const cutSeverity = getCutSeverity({
                headDamage: defenderState.damage.head,
                lastDamage: damage,
                target: damageZone
            });
            defenderState.cutSeverity = cutSeverity;
            if (!earlyStoppage && cutSeverity >= 0.9 && damageZone === 'head') {
                const docStop = evaluateDoctorStoppage({
                    headDamage: defenderState.damage.head,
                    bodyDamage: defenderState.damage.body,
                    cutSeverity,
                    isRoundBreak: false,
                    round
                });
                if (docStop.stopped) {
                    earlyStoppage = {
                        type: 'TKO',
                        method: 'TKO',
                        detail: 'TKO · Doctor stoppage (cut)',
                        winner: aggressor,
                        reason: docStop.reason,
                        round,
                        time: getTimeForStep(300, step, stepCount, false, null)
                    };
                }
            }

            // Accumulate per-round stats for the corner note + scoring.
            roundDamage[aggressor] += damage;
            roundRangeCount[range] = (roundRangeCount[range] || 0) + 1;
            if (damage >= 22) {
                roundKnockdowns[defender] += 1;
                defenderState.down = true;
            }

            // Retreat trigger: defender pulls back when hurt (low HP),
            // gassed (low stamina), or just took a heavy shot. Out-fighters
            // retreat at higher HP because their game is space.
            const distanceBias = profiles[defender].distance;
            const retreatThreshold = 55 + distanceBias * 25;
            const shouldRetreat = defenderState.hp < retreatThreshold
                || defenderState.stm < 30
                || damage >= 10;
            retreatState[defender] = shouldRetreat;
            if (shouldRetreat) {
                // Pick the wall on the defender's current side of the
                // cage so motion looks deliberate rather than random.
                const currentX = defender === 'red' ? redState.x : blueState.x;
                retreatState[defender + 'Wall'] = currentX < 50 ? 'left' : 'right';
            } else {
                retreatState[defender + 'Wall'] = null;
            }
            // Aggressor never retreats on the step they're attacking.
            retreatState[aggressor] = false;
            retreatState[aggressor + 'Wall'] = null;

            // Tag the fighter state with retreating + range so the iframe
            // can switch visual mode without recomputing.
            redState.retreating = retreatState.red;
            blueState.retreating = retreatState.blue;
            redState.range = range;
            blueState.range = range;

            redState.x = positions.red.x;
            redState.y = positions.red.y;
            blueState.x = positions.blue.x;
            blueState.y = positions.blue.y;
            redState.facing = getFacingAngle(positions.red, positions.blue);
            blueState.facing = getFacingAngle(positions.blue, positions.red);
            attackerState.action = isFinish && methodInfo.method === 'Submission'
                ? 'Closing the choke'
                : isFinish
                    ? 'Finishing sequence'
                    : (realMove ? `Throwing ${realMove.Move}` : 'Pressing the exchange');
            defenderState.action = isFinish
                ? methodInfo.method === 'Submission'
                    ? 'Trapped under the grip'
                    : 'Hurt badly'
                : 'Trying to reset';

            if (isFinish && winnerCorner !== 'draw') {
                defenderState.down = methodInfo.method !== 'Submission';
            }

            const time = getTimeForStep(300, step, stepCount, isFinish, methodInfo.time);
            const fighterName = aggressor === 'red' ? player.name : opponent.name;
            const defenderName = defender === 'red' ? player.name : opponent.name;
            const styleTag = realMove && !groundEvent ? ` (${realMove.Style})` : '';

            // Decorate the position label onto ground events so the
            // ticker reads "Smith advances to Side Control" etc.
            const positionTag = groundState.active
                ? ` · ${getPosition(groundState.positionKey).label}`
                : '';

            let detailText;
            let microText;
            let callout = '';
            let tone = isFinish ? 'danger' : aggressor;

            if (foulEvent) {
                detailText = `${fighterName} — ${foulEvent.text}`;
                microText = foulEvent.foul.label;
                callout = foulEvent.foul.callout;
                tone = 'danger';
            } else if (groundEvent && groundEvent.kind === 'submission') {
                detailText = `${fighterName} ${groundEvent.outcome.description}${positionTag}.`;
                microText = groundEvent.attempt.shortLabel;
                if (groundEvent.outcome.outcome === 'tap') {
                    callout = `${groundEvent.attempt.shortLabel.toUpperCase()} TAP`;
                    tone = 'danger';
                } else if (groundEvent.outcome.outcome === 'reversal') {
                    callout = 'REVERSAL';
                    tone = defender;
                } else if (groundEvent.outcome.outcome === 'escape') {
                    callout = 'ESCAPE';
                } else {
                    callout = 'SUB ATTEMPT';
                }
            } else if (groundEvent) {
                detailText = `${fighterName} ${groundEvent.text}.`;
                microText = getPosition(groundState.positionKey).shortLabel;
                callout = groundEvent.kind === 'advance'
                    ? `→ ${getPosition(groundState.positionKey).shortLabel.toUpperCase()}`
                    : groundEvent.kind === 'reversal'
                        ? 'SWEEP'
                        : '';
                if (groundEvent.kind === 'reversal') tone = aggressor;
            } else {
                detailText = isFinish
                    ? `${fighterName} ${attackText}${styleTag}. ${methodInfo.method} ends it in round ${round}.`
                    : `${fighterName} ${attackText}${styleTag}.`;
                microText = realMove ? realMove.Move : (isFinish ? methodInfo.method : attackText);
                callout = isFinish ? methodInfo.method.toUpperCase() : (damage >= 8 ? 'Clean Shot' : '');
            }

            // Comeback tag for trailing fighters in late rounds.
            if (comeback.label && damage >= 6 && !foulEvent) {
                callout = comeback.label.toUpperCase();
                tone = 'danger';
            }

            // Momentum-swing tag — only shown when the swing is large
            // and on a non-finish exchange.
            const momentumTag = describeMomentum(momentum);
            const tickerTextDecorated = momentumTag && !isFinish && !callout && Math.abs(momentum) > 0.5
                ? `${detailText} ${momentumTag.label}.`
                : detailText;

            timeline.push({
                round,
                time,
                corner: aggressor,
                tone,
                tickerText: tickerTextDecorated,
                microText,
                callout,
                dramatic: isFinish || (damage >= 8 && dramaticMoments.has(methodInfo.method)) || Boolean(foulEvent) || Boolean(earlyStoppage),
                redState: cloneReplayState(redState),
                blueState: cloneReplayState(blueState),
                phase: isFinish || earlyStoppage ? 'finished' : 'fighting',
                range,
                groundPosition: groundState.active ? groundState.positionKey : null,
                groundTop: groundState.active ? groundState.topCorner : null,
                foul: foulEvent ? foulEvent.foul.key : null,
                momentum
            });

            // Real-time stoppage — push a closing event and bail.
            if (earlyStoppage && !isFinish) {
                timeline.push({
                    round: earlyStoppage.round,
                    time: earlyStoppage.time,
                    corner: earlyStoppage.winner === 'draw' ? 'gold' : earlyStoppage.winner,
                    tone: 'danger',
                    tickerText: earlyStoppage.reason,
                    microText: earlyStoppage.type,
                    callout: earlyStoppage.type,
                    dramatic: true,
                    redState: cloneReplayState(redState),
                    blueState: cloneReplayState(blueState),
                    phase: 'finished',
                    range
                });
                break;
            }
        }

        if (earlyStoppage) break;

        if (round < resolvedRounds && !methodInfo.round) {
            const dominantRange = Object.entries(roundRangeCount)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mid';
            const note = buildRoundNote({
                round,
                redDamage: roundDamage.red,
                blueDamage: roundDamage.blue,
                playerName: player.name,
                opponentName: opponent.name,
                dominantRange,
                redKnockdowns: roundKnockdowns.red,
                blueKnockdowns: roundKnockdowns.blue
            });

            // Recover a little stamina between rounds — the corner work
            // matters. Hurt fighters recover less.
            redState.stm = clamp(redState.stm + (redState.hp < 40 ? 8 : 14), 0, 100);
            blueState.stm = clamp(blueState.stm + (blueState.hp < 40 ? 8 : 14), 0, 100);
            redState.down = false;
            blueState.down = false;
            // Ground state resets between rounds.
            groundState.active = false;
            groundState.positionKey = 'NEUTRAL_GUARD';
            groundState.holdSteps = 0;

            // Between-round doctor check — chronic head/body damage at
            // the bell triggers a corner stoppage.
            for (const corner of ['red', 'blue']) {
                const fs = corner === 'red' ? redState : blueState;
                const docStop = evaluateDoctorStoppage({
                    headDamage: fs.damage.head,
                    bodyDamage: fs.damage.body,
                    cutSeverity: fs.cutSeverity || 0,
                    isRoundBreak: true,
                    round
                });
                if (docStop.stopped) {
                    earlyStoppage = {
                        type: 'TKO',
                        method: 'TKO',
                        detail: 'TKO · Doctor stoppage (between rounds)',
                        winner: corner === 'red' ? 'blue' : 'red',
                        reason: docStop.reason,
                        round,
                        time: '5:00'
                    };
                    break;
                }
            }

            timeline.push({
                round,
                time: '0:00',
                corner: 'gold',
                tone: 'gold',
                tickerText: note,
                microText: `Round ${round} break · ${dominantRange} range`,
                callout: `Round ${round} Over`,
                dramatic: true,
                redState: cloneReplayState(redState),
                blueState: cloneReplayState(blueState),
                phase: 'between_rounds'
            });

            if (earlyStoppage) {
                timeline.push({
                    round: earlyStoppage.round,
                    time: earlyStoppage.time,
                    corner: earlyStoppage.winner,
                    tone: 'danger',
                    tickerText: earlyStoppage.reason,
                    microText: 'Doctor stoppage',
                    callout: 'DOCTOR STOPPAGE',
                    dramatic: true,
                    redState: cloneReplayState(redState),
                    blueState: cloneReplayState(blueState),
                    phase: 'finished'
                });
                break;
            }
        }
    }

    const scorecards = buildScorecards(resultLabel, winnerCorner, totalRounds);
    // Apply running point deductions to the final round of the offender.
    if (pointDeductions.red > 0 || pointDeductions.blue > 0) {
        const finalIdx = scorecards.red.length - 1;
        scorecards.red[finalIdx] = Math.max(7, scorecards.red[finalIdx] - pointDeductions.red);
        scorecards.blue[finalIdx] = Math.max(7, scorecards.blue[finalIdx] - pointDeductions.blue);
    }

    // Early stoppage overrides the pre-rolled outcome.
    const finalWinnerCorner = earlyStoppage
        ? earlyStoppage.winner
        : winnerCorner;
    const finalMethod = earlyStoppage
        ? earlyStoppage.type
        : resultLabel === 'Draw'
            ? 'Draw'
            : methodInfo.method === 'Submission'
                ? 'SUB'
                : methodInfo.method === 'TKO'
                    ? 'TKO'
                    : methodInfo.method.includes('Decision')
                        ? 'Decision'
                        : 'KO';
    const finalDetail = earlyStoppage ? earlyStoppage.detail : methodInfo.method;

    const outcome = {
        winnerCorner: finalWinnerCorner,
        winnerName: resultLabel === 'Draw' && !earlyStoppage
            ? 'Draw'
            : finalWinnerCorner === 'red'
                ? player.name.toUpperCase()
                : opponent.name.toUpperCase(),
        method: finalMethod,
        detail: finalDetail,
        round: earlyStoppage ? earlyStoppage.round : (methodInfo.round || totalRounds),
        time: earlyStoppage ? earlyStoppage.time : (methodInfo.time || '5:00'),
        pointDeductions: { ...pointDeductions }
    };

    return {
        venue,
        allowedVenues,
        titleEyebrow: `${contract.eventName.toUpperCase()} · ${totalRounds} ROUNDS`,
        redCorner: createReplayCorner('red', {
            name: player.name,
            nickname: player.record.finishes > 0 ? 'Finisher' : 'The Prospect',
            flag: countryCodeToFlagEmoji(player.country.code),
            country: player.country.name,
            age: player.age,
            stance: getStance(player.hand),
            stats: {
                stk: Math.round(getAttributeAverage(player.stats, 'standup', ATTRIBUTE_GROUPS)),
                grp: Math.round(getAttributeAverage(player.stats, 'grappling', ATTRIBUTE_GROUPS)),
                sub: getSubmissionScore(player.stats),
                vit: Math.round(getAttributeAverage(player.stats, 'health', ATTRIBUTE_GROUPS)),
                spd: Math.round((player.stats.footwork + player.stats.punchSpeed + player.stats.kickSpeed + player.stats.grappleSpeed) / 4),
                crd: player.stats.cardio,
                mnd: Math.round(getAttributeAverage(player.stats, 'mind', ATTRIBUTE_GROUPS))
            }
        }, player.weight),
        blueCorner: createReplayCorner('blue', {
            name: opponent.name,
            nickname: opponent.nickname,
            flag: countryCodeToFlagEmoji(opponent.country?.code || ''),
            country: opponent.country?.name || 'Unknown',
            age: Math.max(22, Math.min(36, 21 + Math.round((opponent.record.wins + opponent.record.losses + opponent.record.draws) / 2))),
            stance: getStance(opponent.hand || 'right'),
            weightClass: getWeightClassEntry(player.weight).name,
            stats: {
                stk: Math.round(getAttributeAverage(opponent.stats, 'standup', ATTRIBUTE_GROUPS)),
                grp: Math.round(getAttributeAverage(opponent.stats, 'grappling', ATTRIBUTE_GROUPS)),
                sub: getSubmissionScore(opponent.stats),
                vit: Math.round(getAttributeAverage(opponent.stats, 'health', ATTRIBUTE_GROUPS)),
                spd: Math.round((opponent.stats.footwork + opponent.stats.punchSpeed + opponent.stats.kickSpeed + opponent.stats.grappleSpeed) / 4),
                crd: opponent.stats.cardio,
                mnd: Math.round(getAttributeAverage(opponent.stats, 'mind', ATTRIBUTE_GROUPS))
            }
        }, player.weight),
        initialState: {
            round: 1,
            totalRounds,
            phase: 'pregame',
            timeRemaining: 300,
            red: cloneReplayState(redState),
            blue: cloneReplayState(blueState)
        },
        timeline,
        scorecards,
        outcome
    };
}

function getPreFightAdjustments(preFight) {
    if (!preFight) {
        return { playerDelta: 0, opponentDelta: 0, finishBias: 0 };
    }

    let playerDelta = 0;
    let opponentDelta = 0;

    // Missing weight drains the fighter — bigger cuts hit harder.
    if (preFight.playerMissedWeight) {
        const over = Math.max(0.5, preFight.playerWeightOver || 1);
        playerDelta -= Math.min(6, 2 + over * 1.2);
    }
    if (preFight.opponentMissedWeight) {
        const over = Math.max(0.5, preFight.opponentWeightOver || 1);
        opponentDelta -= Math.min(6, 2 + over * 1.2);
    }

    // Tension affects pacing — high tension = chaotic exchanges. Slight edge
    // to whoever has the better composure under pressure (player composure
    // already in fightNight adjustment; opponent uses static composure).
    const tension = preFight.tension || 0;
    let finishBias = 0;
    if (tension >= 60) {
        finishBias = tension >= 85 ? 4 : 2;
    }

    return { playerDelta, opponentDelta, finishBias };
}

export function simulateCareerFight({ player, opponent, contract, fightNight, preFight, playerFingerprint, opponentFingerprint }) {
    const adj = getPreFightAdjustments(preFight);
    const playerScore = getCompositeScore(player.stats, getPlayerConditionAdjustment(fightNight) + adj.playerDelta) + ((Math.random() * 6) - 3);
    const opponentScore = getCompositeScore(opponent.stats, getOpponentConditionAdjustment(opponent) + adj.opponentDelta) + ((Math.random() * 6) - 3);
    const scoreGap = Math.abs(playerScore - opponentScore) + adj.finishBias;

    let headline;
    let copy;
    let resultLabel;
    let methodInfo;

    if (scoreGap < 1.5 && Math.random() < 0.15) {
        resultLabel = 'Draw';
        headline = `Draw vs ${opponent.name}`;
        copy = 'Neither side separated itself clearly enough. The fight ends level after a tight score.';
        methodInfo = {
            method: 'Majority Draw',
            round: null,
            time: '5:00'
        };
    } else if (playerScore >= opponentScore) {
        resultLabel = 'Win';
        methodInfo = getMethod(player.stats, opponent.stats, scoreGap);
        headline = `${resultLabel} vs ${opponent.name}`;
        copy = methodInfo.round
            ? `The camp paid off. ${methodInfo.method} arrived in round ${methodInfo.round}.`
            : `The fight goes in the book as a ${methodInfo.method.toLowerCase()}.`;
    } else {
        resultLabel = 'Loss';
        methodInfo = getMethod(opponent.stats, player.stats, scoreGap);
        headline = `${resultLabel} vs ${opponent.name}`;
        copy = methodInfo.round
            ? `${opponent.name} broke through for a ${methodInfo.method.toLowerCase()} in round ${methodInfo.round}.`
            : `The opponent took the fight on the cards by ${methodInfo.method.toLowerCase()}.`;
    }

    const notes = getResultNotes(player.stats, opponent, fightNight, playerScore - opponentScore, resultLabel);
    const replay = buildReplay({ player, opponent, contract, fightNight, resultLabel, methodInfo, playerFingerprint, opponentFingerprint });

    return {
        result: resultLabel,
        headline,
        copy,
        method: methodInfo.method,
        round: methodInfo.round,
        finishTime: methodInfo.time,
        notes,
        replay,
        purseEarned: resultLabel === 'Win'
            ? contract.showMoney + contract.winBonus
            : resultLabel === 'Draw'
                ? contract.showMoney + Math.round(contract.winBonus * 0.35)
                : contract.showMoney,
        reputationDelta: resultLabel === 'Win'
            ? 4 + contract.reputationBonus
            : resultLabel === 'Draw'
                ? 1 + Math.max(1, Math.floor(contract.reputationBonus / 2))
                : -1,
        scoredFinish: resultLabel === 'Win' && !methodInfo.method.includes('Decision'),
        venueTier: replay.venue,
        allowedVenueTiers: replay.allowedVenues
    };
}