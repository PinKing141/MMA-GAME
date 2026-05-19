/**
 * Post-fight scene: a celebration / debrief screen the player lands
 * on after closing the live fight modal. Renders the result with
 * dramatic typography, prize money breakdown, method graphic, and
 * navigation back to camp or onward to the next event.
 */

import { state } from '../lib/core.js';
import { formatMoney } from '../lib/utils/formatters.js';

function getResult() {
    return state.career.lastFightResult;
}

function buildMethodGraphic(result, method) {
    const m = (method || '').toUpperCase();
    if (result === 'Draw') {
        return { letter: 'D', label: 'Draw', tone: 'gold' };
    }
    if (m.includes('SUB')) return { letter: 'S', label: 'Submission', tone: result === 'Win' ? 'red' : 'blue' };
    if (m === 'KO') return { letter: 'K', label: 'Knockout', tone: result === 'Win' ? 'red' : 'blue' };
    if (m === 'TKO') return { letter: 'T', label: 'Technical KO', tone: result === 'Win' ? 'red' : 'blue' };
    if (m.includes('DECISION') || m.includes('DEC')) return { letter: 'J', label: 'Decision', tone: 'gold' };
    if (m.includes('DQ')) return { letter: '!', label: 'Disqualification', tone: 'gold' };
    return { letter: 'W', label: method || 'Win', tone: 'red' };
}

function buildVerdictCopy(result, opponent) {
    const lastName = (opponent?.name || 'the opponent').split(/\s+/).slice(-1)[0];
    if (result === 'Win') {
        const lines = [
            `The cage opens for ${state.setup.firstName || 'you'}. ${lastName} could not turn the tide.`,
            `Hand raised. The work in camp paid out.`,
            `Statement performance against ${lastName}. The promotion took notice.`
        ];
        return lines[Math.floor(Math.random() * lines.length)];
    }
    if (result === 'Loss') {
        const lines = [
            `${lastName} found the answer. Back to camp — there's tape to study.`,
            `Hard loss. The frame for the rematch starts now.`,
            `Tonight wasn't it. Reset and rebuild.`
        ];
        return lines[Math.floor(Math.random() * lines.length)];
    }
    return `The cards came back even. Nobody walks away clean — both fighters bank a moment, neither bank a win.`;
}

function renderPurseBreakdown(fightResult) {
    const showMoney = fightResult.showMoney || 0;
    const winBonus = fightResult.result === 'Win' ? (fightResult.winBonus || 0) : 0;
    const finishBonus = fightResult.result === 'Win'
        && fightResult.method !== 'Decision'
        && fightResult.method !== 'Draw'
        ? Math.round(showMoney * 0.15)
        : 0;
    const total = showMoney + winBonus + finishBonus;
    return `
        <div class="pf-purse-row"><label>Show money</label><strong>${formatMoney(showMoney)}</strong></div>
        ${winBonus ? `<div class="pf-purse-row"><label>Win bonus</label><strong>${formatMoney(winBonus)}</strong></div>` : ''}
        ${finishBonus ? `<div class="pf-purse-row"><label>Finish bonus</label><strong>${formatMoney(finishBonus)}</strong></div>` : ''}
        <div class="pf-purse-row total"><label>Net purse</label><strong>${formatMoney(total)}</strong></div>
    `;
}

export function renderPostFightScene() {
    const fightResult = getResult();
    const root = document.getElementById('scene-post-fight');
    if (!root) return;

    if (!fightResult) {
        root.innerHTML = `
            <div class="eyebrow">Post-Fight</div>
            <h1 class="scene-title">No fight on record yet.</h1>
            <p class="scene-subtitle">Run a fight and the post-fight package will appear here.</p>
            <div class="continue-bar">
                <div class="text">
                    <div class="head">Nothing to celebrate yet</div>
                </div>
                <button class="btn" id="btn-post-fight-back">Back to Profile</button>
            </div>
        `;
        return;
    }

    const result = fightResult.result;
    const method = fightResult.method;
    const graphic = buildMethodGraphic(result, method);
    const opponent = fightResult.opponent;
    const verdict = buildVerdictCopy(result, opponent);
    const isWin = result === 'Win';
    const isDraw = result === 'Draw';
    const headerWord = isWin ? 'Win.' : isDraw ? 'Draw.' : 'Loss.';
    const rankBeforeText = fightResult.playerRankBefore !== null && fightResult.playerRankBefore !== undefined
        ? `#${fightResult.playerRankBefore}`
        : 'UR';
    const rankAfterText = fightResult.playerRankAfter !== null && fightResult.playerRankAfter !== undefined
        ? `#${fightResult.playerRankAfter}`
        : 'UR';
    const rankDelta = (fightResult.playerRankBefore || 99) - (fightResult.playerRankAfter || 99);

    root.innerHTML = `
        <div class="pf-eyebrow">Step 08 · Post-Fight</div>
        <h1 class="pf-headline pf-tone-${graphic.tone}">${headerWord}</h1>
        <p class="pf-verdict">${verdict}</p>

        <div class="pf-grid">
            <article class="pf-card pf-card-method pf-tone-${graphic.tone}">
                <div class="pf-card-stripe"></div>
                <div class="pf-method-graphic">
                    <div class="pf-method-letter">${graphic.letter}</div>
                </div>
                <div class="pf-method-label">${graphic.label}</div>
                ${fightResult.round ? `<div class="pf-method-time">R${fightResult.round} · ${fightResult.finishTime || ''}</div>` : ''}
                <div class="pf-opponent">vs ${opponent?.name || 'Unknown'}</div>
            </article>

            <article class="pf-card pf-card-purse">
                <div class="pf-card-stripe"></div>
                <div class="pf-card-eyebrow">Payday</div>
                <div class="pf-card-title">Purse breakdown</div>
                <div class="pf-purse-list">
                    ${renderPurseBreakdown(fightResult)}
                </div>
            </article>

            <article class="pf-card pf-card-standing">
                <div class="pf-card-stripe"></div>
                <div class="pf-card-eyebrow">Standing</div>
                <div class="pf-card-title">Division movement</div>
                <div class="pf-rank-row">
                    <span class="pf-rank-from">${rankBeforeText}</span>
                    <span class="pf-rank-arrow ${rankDelta > 0 ? 'up' : rankDelta < 0 ? 'down' : 'flat'}">→</span>
                    <span class="pf-rank-to">${rankAfterText}</span>
                </div>
                <div class="pf-rank-note">${rankDelta > 0 ? `Climbed ${rankDelta} spot${rankDelta > 1 ? 's' : ''}.` : rankDelta < 0 ? `Dropped ${Math.abs(rankDelta)} spot${Math.abs(rankDelta) > 1 ? 's' : ''}.` : 'No ranking shift this fight.'}</div>
            </article>

            <article class="pf-card pf-card-notes">
                <div class="pf-card-stripe"></div>
                <div class="pf-card-eyebrow">Camp report</div>
                <div class="pf-card-title">${fightResult.eventName || 'Event'}</div>
                <div class="pf-notes-list">
                    ${(fightResult.notes || []).map(note => `<div class="pf-note">${note}</div>`).join('')}
                </div>
            </article>
        </div>

        <div class="continue-bar">
            <div class="text">
                <div class="head">${isWin ? 'Where to next?' : 'Pick the next move.'}</div>
                <p>Open the live fight again to rewatch, or move into the next career phase.</p>
            </div>
            <button class="btn" id="btn-pf-replay">Rewatch Fight</button>
            <button class="btn ghost" id="btn-pf-profile">Back to Profile</button>
            <button class="btn ghost small" id="btn-pf-camp">Back to Camp</button>
        </div>

        ${isWin ? '<div class="pf-confetti" aria-hidden="true">' +
            Array.from({ length: 36 }).map((_, i) => `<span class="pf-confetti-piece" style="--i:${i};--c:${i % 3 === 0 ? 'var(--red-bright)' : i % 3 === 1 ? 'var(--gold)' : 'var(--blue-bright)'}"></span>`).join('') +
        '</div>' : ''}
    `;
}
