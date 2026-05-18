import { ATTRIBUTE_GROUPS } from '../data.js';
import { getWeightClassEntry } from '../core.js';
import { clamp, getAttributeAverage } from '../utils/calculations.js';
import { formatMoney } from '../utils/formatters.js';
import { getAllowedVenueTiers, getDefaultVenueTier } from './venues.js';
import { pickMove, pickRange } from '../domain/move-selector.js';

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

function getExchangePositions(round, step, aggressor, isFinish, range = 'Mid') {
    const orbit = (round * 0.82) + (step * 0.67) + (aggressor === 'red' ? 0.24 : -0.24);
    const centerX = clamp(50 + (Math.sin(orbit * 1.15) * 8), 38, 62);
    const centerY = clamp(50 + (Math.cos(orbit * 0.95) * 9), 36, 64);
    const profile = RANGE_GAP[range] || RANGE_GAP.Mid;
    const lateralGap = isFinish ? Math.max(0.6, profile.lateral * 0.55) : profile.lateral;
    const verticalGap = isFinish ? Math.max(1.4, profile.vertical * 0.7) : profile.vertical;
    // Aggressor presses forward — closes the gap on their side.
    const pressureShift = aggressor === 'red' ? -0.8 : 0.8;

    const red = {
        x: clamp(centerX - lateralGap + Math.min(0, pressureShift), 28, 72),
        y: clamp(centerY - (verticalGap / 2) + (aggressor === 'red' ? -1.1 : 0.7), 28, 72)
    };
    const blue = {
        x: clamp(centerX + lateralGap + Math.max(0, pressureShift), 28, 72),
        y: clamp(centerY + (verticalGap / 2) + (aggressor === 'blue' ? 1.1 : -0.7), 28, 72)
    };

    return { red, blue };
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
    const openingPositions = getExchangePositions(1, 0, 'red', false);
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
            const isFinish = Boolean(methodInfo.round && round === methodInfo.round && step === stepCount - 1);
            const aggressor = isFinish
                ? winnerCorner
                : (round + step) % 2 === 0
                    ? (winnerCorner === 'draw' ? 'red' : winnerCorner)
                    : (winnerCorner === 'draw' ? 'blue' : (winnerCorner === 'red' ? 'blue' : 'red'));
            const defender = aggressor === 'red' ? 'blue' : 'red';
            const attackerState = aggressor === 'red' ? redState : blueState;
            const defenderState = defender === 'red' ? redState : blueState;
            const aggressorFingerprint = aggressor === 'red' ? playerFingerprint : opponentFingerprint;
            const hasFingerprint = aggressorFingerprint && Object.keys(aggressorFingerprint).length > 0;

            // Pick a real move when we have a fingerprint; otherwise
            // fall back to the legacy generic phrase pool.
            const range = isFinish
                ? (getFinishRange(methodInfo.method) || pickRange({ fingerprint: aggressorFingerprint }))
                : pickRange({ fingerprint: aggressorFingerprint });
            // AI urgency: scoreLead positive when aggressor is ahead on
            // damage this fight, negative when behind. Stamina drops over
            // the fight and rises slightly between rounds.
            const scoreLead = aggressor === 'red'
                ? (100 - blueState.hp) - (100 - redState.hp)
                : (100 - redState.hp) - (100 - blueState.hp);
            const aggression = isFinish ? 0.95 : getAggression({
                round,
                totalRounds: resolvedRounds,
                scoreLead,
                stamina: attackerState.stm
            });

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

            const attackText = realMove
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
            // dramatic baseline.
            const movePower = realMove ? (realMove.Power || 3) : 3;
            const damage = isFinish
                ? (methodInfo.method === 'Submission' ? 18 : 28)
                : 3 + Math.round(movePower * 1.2) + Math.floor(Math.random() * 3);
            const positions = getExchangePositions(round, step, aggressor, isFinish, range);

            attackerState.stm = clamp(attackerState.stm - (isFinish ? 7 : 3 + Math.round(movePower * 0.5)), 8, 100);
            defenderState.hp = clamp(defenderState.hp - damage, 0, 100);
            defenderState.stm = clamp(defenderState.stm - Math.max(2, Math.round(damage * 0.45)), 0, 100);
            defenderState.damage[damageZone] = clamp(defenderState.damage[damageZone] + damage * 1.3, 0, 100);

            // Accumulate per-round stats for the corner note + scoring.
            roundDamage[aggressor] += damage;
            roundRangeCount[range] = (roundRangeCount[range] || 0) + 1;
            if (damage >= 22) {
                roundKnockdowns[defender] += 1;
                defenderState.down = true;
            }

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
            const styleTag = realMove ? ` (${realMove.Style})` : '';
            const detailText = isFinish
                ? `${fighterName} ${attackText}${styleTag}. ${methodInfo.method} ends it in round ${round}.`
                : `${fighterName} ${attackText}${styleTag}.`;
            const microText = realMove ? realMove.Move : (isFinish ? methodInfo.method : attackText);

            timeline.push({
                round,
                time,
                corner: aggressor,
                tone: isFinish ? 'danger' : aggressor,
                tickerText: detailText,
                microText,
                callout: isFinish ? methodInfo.method.toUpperCase() : (damage >= 8 ? 'Clean Shot' : ''),
                dramatic: isFinish || (damage >= 8 && dramaticMoments.has(methodInfo.method)),
                redState: cloneReplayState(redState),
                blueState: cloneReplayState(blueState),
                phase: isFinish ? 'finished' : 'fighting',
                range
            });
        }

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
        }
    }

    const scorecards = buildScorecards(resultLabel, winnerCorner, totalRounds);
    const outcome = {
        winnerCorner,
        winnerName: resultLabel === 'Draw' ? 'Draw' : winnerCorner === 'red' ? player.name.toUpperCase() : opponent.name.toUpperCase(),
        method: resultLabel === 'Draw'
            ? 'Draw'
            : methodInfo.method === 'Submission'
                ? 'SUB'
                : methodInfo.method === 'TKO'
                    ? 'TKO'
                    : methodInfo.method.includes('Decision')
                        ? 'Decision'
                        : 'KO',
        detail: methodInfo.method,
        round: methodInfo.round || totalRounds,
        time: methodInfo.time || '5:00'
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