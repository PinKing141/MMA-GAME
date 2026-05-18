import { ATTRIBUTE_GROUPS } from '../data.js';
import { getWeightClassEntry } from '../core.js';
import { clamp, getAttributeAverage } from '../utils/calculations.js';
import { formatMoney } from '../utils/formatters.js';
import { getAllowedVenueTiers, getDefaultVenueTier } from './venues.js';

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

function getExchangePositions(round, step, aggressor, isFinish) {
    const orbit = (round * 0.82) + (step * 0.67) + (aggressor === 'red' ? 0.24 : -0.24);
    const centerX = clamp(50 + (Math.sin(orbit * 1.15) * 8), 36, 64);
    const centerY = clamp(50 + (Math.cos(orbit * 0.95) * 9), 34, 66);
    const lateralGap = isFinish ? 1.1 : 1.8;
    const verticalGap = isFinish ? 3.2 : 4.2;
    const pressureShift = aggressor === 'red' ? -0.8 : 0.8;

    const red = {
        x: clamp(centerX - lateralGap + Math.min(0, pressureShift), 24, 76),
        y: clamp(centerY - (verticalGap / 2) + (aggressor === 'red' ? -1.1 : 0.7), 24, 76)
    };
    const blue = {
        x: clamp(centerX + lateralGap + Math.max(0, pressureShift), 24, 76),
        y: clamp(centerY + (verticalGap / 2) + (aggressor === 'blue' ? 1.1 : -0.7), 24, 76)
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

function buildReplay({ player, opponent, contract, fightNight, resultLabel, methodInfo }) {
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
            const attackText = isFinish
                ? pickCommentary(actionPools.finish)
                : pickCommentary(actionPools[aggressor]);
            const damageZone = isFinish && methodInfo.method === 'Submission'
                ? 'body'
                : ['head', 'body', 'legs'][(round + step) % 3];
            const damage = isFinish
                ? (methodInfo.method === 'Submission' ? 18 : 28)
                : 4 + Math.floor(Math.random() * 6);
            const positions = getExchangePositions(round, step, aggressor, isFinish);

            attackerState.stm = clamp(attackerState.stm - (isFinish ? 7 : 4), 8, 100);
            defenderState.hp = clamp(defenderState.hp - damage, 0, 100);
            defenderState.stm = clamp(defenderState.stm - Math.max(2, Math.round(damage * 0.45)), 0, 100);
            defenderState.damage[damageZone] = clamp(defenderState.damage[damageZone] + damage * 1.3, 0, 100);

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
                    : 'Pressing the exchange';
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
            const detailText = isFinish
                ? `${fighterName} ${attackText}. ${methodInfo.method} ends it in round ${round}.`
                : `${fighterName} ${attackText}.`;

            timeline.push({
                round,
                time,
                corner: aggressor,
                tone: isFinish ? 'danger' : aggressor,
                tickerText: detailText,
                microText: isFinish ? methodInfo.method : attackText,
                callout: isFinish || damage >= 8 ? (isFinish ? methodInfo.method.toUpperCase() : 'Clean Shot') : '',
                dramatic: isFinish || (damage >= 8 && dramaticMoments.has(methodInfo.method)),
                redState: cloneReplayState(redState),
                blueState: cloneReplayState(blueState),
                phase: isFinish ? 'finished' : 'fighting'
            });
        }

        if (round < resolvedRounds && !methodInfo.round) {
            timeline.push({
                round,
                time: '0:00',
                corner: 'gold',
                tone: 'gold',
                tickerText: `Round ${round} ends. Corners go to work and the pace resets.`,
                microText: `Round ${round} break`,
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

export function simulateCareerFight({ player, opponent, contract, fightNight, preFight }) {
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
    const replay = buildReplay({ player, opponent, contract, fightNight, resultLabel, methodInfo });

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