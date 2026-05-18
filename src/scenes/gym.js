import { ATTRIBUTE_GROUPS, ATTRIBUTE_GROUP_ORDER, COACHES } from '../lib/data.js';
import { getAttributeAverage, state } from '../lib/core.js';
import { formatMoney } from '../lib/utils/formatters.js';
import { GYM_ACTIONS } from '../lib/actions/camp-state.js';
import { getDominantStyles, getStyleColor, getStyleLabel } from '../lib/domain/style-fingerprint.js';

const SESSION_META = {
    boxing: {
        category: 'strike',
        name: 'Pad Work · Striking Drills',
        tag: 'Striking · Sharpness +',
        eyebrow: 'Striking Drill · Hands & Feet',
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="#e21d36" stroke-width="1.8"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>`
    },
    wrestling: {
        category: 'grapple',
        name: 'Wrestling Drills',
        tag: 'Grappling · Takedowns',
        eyebrow: 'Grind Camp · Wall Work',
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="#2563eb" stroke-width="1.8"><path d="M 3 10 Q 8 5 13 10"/><line x1="3" y1="10" x2="3" y2="13"/><line x1="13" y1="10" x2="13" y2="13"/><line x1="8" y1="7" x2="8" y2="13"/></svg>`
    },
    roadwork: {
        category: 'cond',
        name: 'Roadwork · Cardio',
        tag: 'Conditioning · Weight Cut',
        eyebrow: 'Conditioning · Hard Miles',
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="#f59e0b" stroke-width="1.8"><circle cx="11" cy="3" r="1.5"/><path d="M 11 5 L 8 9 L 5 11"/><path d="M 8 9 L 10 12 L 12 14"/><path d="M 8 9 L 6 7 L 4 6"/></svg>`
    },
    film: {
        category: 'film',
        name: 'Film Study · Opponent',
        tag: 'Fight IQ · Read Tendencies',
        eyebrow: 'Film Room · Slow Week',
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="#06b6d4" stroke-width="1.8"><rect x="2" y="3" width="12" height="10" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><polygon points="6,8 11,10 6,12" fill="#06b6d4"/></svg>`
    },
    recovery: {
        category: 'recov',
        name: 'Recovery Day',
        tag: 'Rest · Restore Energy',
        eyebrow: 'Recovery · Camp Protection',
        icon: `<svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" stroke-width="1.8"><circle cx="8" cy="6" r="1.6"/><path d="M 3 12 Q 5 8 8 8 Q 11 8 13 12"/><line x1="3" y1="13" x2="13" y2="13"/></svg>`
    }
};

// Local picker state — not persisted.
const campState = {
    selectedSessionKey: 'boxing'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function meterClass(value, sweetLow, sweetHigh) {
    if (value < sweetLow * 0.7) return 'danger';
    if (value < sweetLow) return 'warn';
    if (value > sweetHigh) return 'warn';
    return 'good';
}

function renderMeter({ label, value, max = 100, sweetLow, sweetHigh, statusGood, statusWarn, statusDanger, lowLabel, midLabel, highLabel, unit = '/ 100' }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const cls = meterClass(pct, sweetLow, sweetHigh);
    const status = cls === 'danger' ? statusDanger : cls === 'warn' ? statusWarn : statusGood;
    const sweetPct = `left: ${sweetLow}%; right: ${100 - sweetHigh}%;`;

    return `
        <div class="meter-block">
            <div class="meter-head">
                <span class="lbl">${escapeHtml(label)}</span>
                <span class="val ${cls}">${Math.round(value)}<small style="color: var(--text-dim); font-size: 11px;"> ${escapeHtml(unit)}</small></span>
            </div>
            <div class="meter-bar-wrap">
                <div class="meter-zone-low"></div>
                <div class="meter-zone-sweet" style="${sweetPct}"></div>
                <div class="meter-zone-high"></div>
                <div class="meter-fill ${cls === 'good' ? '' : cls}" style="width: ${pct}%;"></div>
                <div class="meter-marker" style="left: ${pct}%;"></div>
            </div>
            <div class="meter-footer">
                <span class="danger">${escapeHtml(lowLabel)}</span>
                <span class="center">${escapeHtml(midLabel)}</span>
                <span class="good">${escapeHtml(highLabel)}</span>
            </div>
            <div class="status-pill ${cls}">${escapeHtml(status)}</div>
        </div>
    `;
}

function renderTimeline() {
    const total = state.career.campWeeksTotal;
    const completed = state.career.campWeeksCompleted;
    let parts = [];

    for (let week = 1; week <= total; week++) {
        const cls = week < completed + 1 ? 'completed' : week === completed + 1 ? 'current' : 'upcoming';
        const label = cls === 'current' ? 'This Week' : `Wk ${week}`;
        parts.push(`<div class="timeline-node ${cls}">${week}<div class="label">${escapeHtml(label)}</div></div>`);
        if (week < total) {
            const connectorCls = week < completed ? 'completed' : week === completed ? 'current' : '';
            parts.push(`<div class="timeline-connector ${connectorCls}"></div>`);
        }
    }
    parts.push(`<div class="timeline-connector ${completed >= total ? 'completed' : ''}"></div>`);
    parts.push(`
        <div class="timeline-node fight-night">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4"><polygon points="12,3 19,7 22,14 17,21 7,21 2,14 5,7"/></svg>
            <div class="label">Fight Night</div>
        </div>
    `);
    return parts.join('');
}

function renderFingerprint() {
    const fingerprint = state.career.playerFingerprint || {};
    const dominants = getDominantStyles(fingerprint);
    const label = getStyleLabel(fingerprint);

    if (dominants.length === 0) {
        return {
            label: 'Untrained',
            segments: '<div class="fp-segment" style="background:var(--surface-3); width:100%"></div>',
            rows: '<div class="fp-row"><span class="name">No styles trained yet</span></div>'
        };
    }

    const segments = dominants.map(s =>
        `<div class="fp-segment" style="background:${getStyleColor(s.name)}; width:${Math.round(s.share * 100)}%"></div>`
    ).join('');

    const rows = dominants.map(s => `
        <div class="fp-row">
            <span class="swatch" style="background:${getStyleColor(s.name)}"></span>
            <span class="name">${escapeHtml(s.name)}</span>
            <span class="pct">${Math.round(s.share * 100)}%</span>
        </div>
    `).join('');

    return { label, segments, rows };
}

function renderSessionDetail(coach) {
    const actionKey = campState.selectedSessionKey;
    const action = GYM_ACTIONS[actionKey];
    const meta = SESSION_META[actionKey];
    if (!action || !meta) {
        return '';
    }

    const multiplier = coach?.disciplineMultipliers?.[actionKey] ?? 1.0;
    const scaleDelta = (delta) => {
        const scaled = delta * multiplier;
        return multiplier >= 1 ? Math.ceil(scaled) : Math.floor(scaled);
    };

    const statGains = Object.entries(action.statChanges).map(([key, delta]) => {
        const label = ATTRIBUTE_GROUP_ORDER.flatMap(g => ATTRIBUTE_GROUPS[g].attributes).find(a => a.key === key)?.label || key;
        const scaled = scaleDelta(delta);
        const cls = scaled > delta ? 'positive' : scaled < delta ? 'warning' : 'positive';
        return `
            <div class="gain-row ${cls}">
                <div class="icon"><svg viewBox="0 0 12 12" fill="none" stroke="${scaled >= delta ? '#16a34a' : '#f59e0b'}" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg></div>
                <div class="label">${escapeHtml(label)}</div>
                <div class="value">+${scaled}${scaled !== delta ? ` <small style="color:var(--text-dim); font-size:9px">(base +${delta})</small>` : ''}</div>
            </div>
        `;
    }).join('');

    const careerRows = [
        { label: 'Sharpness', delta: action.careerChanges.sharpness, positive: action.careerChanges.sharpness > 0 },
        { label: 'Morale', delta: action.careerChanges.morale, positive: action.careerChanges.morale > 0 },
        { label: 'Fitness', delta: action.careerChanges.fitness, positive: action.careerChanges.fitness > 0 },
        { label: 'Fatigue', delta: action.careerChanges.fatigue, positive: action.careerChanges.fatigue < 0 },
        { label: 'Weight Cut', delta: action.careerChanges.weightCut, positive: action.careerChanges.weightCut < 0 }
    ].map(row => {
        const cls = row.delta === 0 ? '' : row.positive ? 'positive' : 'warning';
        const sign = row.delta > 0 ? '+' : '';
        return `
            <div class="gain-row ${cls}">
                <div class="icon"><svg viewBox="0 0 12 12" fill="none" stroke="${row.positive ? '#16a34a' : '#f59e0b'}" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg></div>
                <div class="label">${escapeHtml(row.label)}</div>
                <div class="value">${sign}${row.delta}</div>
            </div>
        `;
    }).join('');

    const riskLevel = action.injuryRisk < 8 ? 'Very Low' : action.injuryRisk < 14 ? 'Low' : action.injuryRisk < 20 ? 'Moderate' : 'High';
    const riskClass = action.injuryRisk < 14 ? 'positive' : action.injuryRisk < 20 ? 'warning' : 'negative';

    const coachBonus = coach?.actionBonuses?.[actionKey];
    const multiplierTag = multiplier >= 1.25 ? `${multiplier.toFixed(2)}× · house specialty`
        : multiplier >= 1.05 ? `${multiplier.toFixed(2)}× · strong`
        : multiplier < 0.95 ? `${multiplier.toFixed(2)}× · weak`
        : '1.00× · neutral';
    const multiplierCls = multiplier >= 1.05 ? 'positive' : multiplier < 0.95 ? 'warning' : '';

    const coachRow = coach
        ? `
            <div class="coach-row-summary">
                <div class="avatar">${escapeHtml(coach.name.split(/\s+/).map(p => p[0]).join('').slice(0, 2))}</div>
                <div class="text">
                    <div class="name">${escapeHtml(coach.name)}</div>
                    <div class="tag">${escapeHtml(coach.gym)} · ${escapeHtml(coach.specialty || 'MMA')} specialist</div>
                </div>
                <div class="bonus">${escapeHtml(multiplierTag)}</div>
            </div>
        `
        : '';

    const coachBonusLines = coachBonus
        ? Object.entries(coachBonus.stats || {}).map(([key, val]) => {
            const label = ATTRIBUTE_GROUP_ORDER.flatMap(g => ATTRIBUTE_GROUPS[g].attributes).find(a => a.key === key)?.label || key;
            return `<div class="gain-row positive"><div class="icon"><svg viewBox="0 0 12 12" fill="none" stroke="#16a34a" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg></div><div class="label">${escapeHtml(label)} (coach)</div><div class="value">+${val}</div></div>`;
        }).join('')
        : '';

    const campDone = state.career.campWeeksCompleted >= state.career.campWeeksTotal;

    return `
        <section class="detail-panel">
            <div class="detail-head">
                <div class="text">
                    <div class="eyebrow">${escapeHtml(meta.eyebrow)}</div>
                    <div class="title">${escapeHtml(meta.name)}</div>
                </div>
                <div class="meta">
                    <div class="day">Time Cost</div>
                    <div class="num">1 Week</div>
                </div>
            </div>
            <div class="detail-body">
                <div>
                    <p class="detail-desc">${escapeHtml(action.description)}</p>
                    <div class="gains-list">
                        ${statGains}
                        ${coachBonusLines}
                        ${careerRows}
                        <div class="gain-row ${riskClass}">
                            <div class="icon"><svg viewBox="0 0 12 12" fill="none" stroke="${action.injuryRisk < 14 ? '#16a34a' : '#f59e0b'}" stroke-width="2"><line x1="6" y1="2" x2="6" y2="7"/><circle cx="6" cy="10" r="0.5"/></svg></div>
                            <div class="label">Injury Risk</div>
                            <div class="value">${escapeHtml(riskLevel)}</div>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="coaches-block">
                        <div class="block-label">Coach Active This Camp</div>
                        ${coachRow || '<p class="detail-desc">No coach signed.</p>'}
                    </div>
                </div>
            </div>
            <div class="detail-action">
                <button class="btn-action back" data-camp-action="back">
                    Back to Hub
                    <span class="sub">Pause camp</span>
                </button>
                <button class="btn-action commit" data-camp-action="commit" ${(!coach || campDone) ? 'disabled' : ''}>
                    ${campDone ? 'Camp Complete · Fight Night' : 'Commit to Session'}
                    <span class="sub">${campDone ? 'Walk to the cage' : `Advance week ${state.career.campWeeksCompleted + 1} of ${state.career.campWeeksTotal}`}</span>
                </button>
            </div>
        </section>
    `;
}

function renderSessionList(coach) {
    const campDone = state.career.campWeeksCompleted >= state.career.campWeeksTotal;
    return Object.entries(GYM_ACTIONS).map(([key, action]) => {
        const meta = SESSION_META[key];
        if (!meta) return '';
        const active = campState.selectedSessionKey === key;
        const disabled = !coach || campDone;
        return `
            <button class="session-row ${active ? 'active' : ''}" data-cat="${meta.category}" data-session-key="${key}" ${disabled ? 'disabled' : ''}>
                <div class="icon">${meta.icon}</div>
                <div class="info">
                    <div class="name">${escapeHtml(meta.name)}</div>
                    <div class="tag">${escapeHtml(meta.tag)}</div>
                </div>
                <div class="arrow">→</div>
            </button>
        `;
    }).join('');
}

function getCoach() {
    const selected = state.career.selectedCoach;
    if (!selected) return null;
    return COACHES.find(c => c.id === selected.id) || null;
}

function getStatusForFitness(value) {
    if (value >= 90) return 'Charged · Ready to grind';
    if (value >= 75) return 'Steady · Manageable load';
    if (value >= 60) return 'Tired · Watch the load';
    return 'Burnout risk · Recovery needed';
}

function getStatusForSharpness(value) {
    if (value >= 80) return 'Razor sharp · Camp dividend';
    if (value >= 60) return 'Climbing · Need more drilling';
    if (value >= 40) return 'Rusty · Pick up live work';
    return 'Dull · Sparring overdue';
}

function getStatusForCut(value) {
    if (value >= 75) return 'Cut is dangerous · slow it down';
    if (value >= 55) return 'Heavy cut · monitor weight';
    if (value >= 30) return 'On schedule for weight';
    return 'Light cut · plenty of room';
}

function getStatusForFatigue(value) {
    if (value >= 80) return 'Overtrained · pull back';
    if (value >= 60) return 'Hard mileage stacking up';
    if (value >= 30) return 'Honest grind';
    return 'Fresh legs';
}

export function renderGymScene() {
    const root = document.getElementById('scene-gym');
    if (!root) {
        return;
    }

    const career = state.career;

    // No contract: empty state.
    if (!career.contract) {
        root.innerHTML = `
            <div class="camp-empty-state">
                <p>No fight is signed. Pick an opponent first.</p>
                <button class="btn" data-camp-action="back">Back to Hub</button>
            </div>
        `;
        return;
    }

    // No coach yet: route should send to gym-picker, but guard here too.
    if (!career.selectedCoach) {
        root.innerHTML = `
            <div class="camp-empty-state">
                <p>No gym signed yet. Pick a home gym to begin camp.</p>
                <button class="btn" data-camp-action="goto-picker">Pick A Gym</button>
            </div>
        `;
        return;
    }

    const coach = getCoach();
    const opponent = career.selectedOpponent;
    const weeksLeft = career.campWeeksTotal - career.campWeeksCompleted;
    const opponentLastName = opponent ? opponent.name.split(/\s+/).slice(-1)[0].toUpperCase() : 'TBD';
    const fingerprint = renderFingerprint();
    const phaseLabel = career.campWeeksCompleted < 2 ? 'Build phase' : weeksLeft <= 2 ? 'Taper phase' : 'Heavy phase';
    const gymInitial = coach ? coach.gym.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    root.innerHTML = `
        <div class="camp-titlebar">
            <div class="camp-title-block">
                <div class="eyebrow">Week ${Math.min(career.campWeeksCompleted + 1, career.campWeeksTotal)} of ${career.campWeeksTotal} · ${escapeHtml(phaseLabel)}</div>
                <h1 class="title">Train hard.<br>Train smart.</h1>
                <p class="subtitle">Pick this week's session. Every choice moves the meters — push too far in any direction and the camp turns on you.</p>
            </div>

            <div class="gym-pill">
                <div class="crest">${escapeHtml(gymInitial)}</div>
                <div class="info">
                    <div class="label">Home Gym</div>
                    <div class="name">${escapeHtml(career.selectedCoach.gym.toUpperCase())}</div>
                </div>
                <div class="multiplier">${escapeHtml(career.selectedCoach.longTermTraitLabel || 'Long-Term Trait')}</div>
            </div>
        </div>

        <div class="camp-grid">
            <aside class="session-list-card">
                <div class="list-head">
                    <div class="label">Session Catalog</div>
                    <div class="title">Pick This Week's Drill</div>
                </div>
                <div class="gym-stat-strip">
                    <div class="gym-stat-cell">
                        <div class="label">Bankroll</div>
                        <div class="value gold">${formatMoney(career.cash)}</div>
                    </div>
                    <div class="gym-stat-cell">
                        <div class="label">Weeks Left</div>
                        <div class="value green">${weeksLeft}</div>
                    </div>
                </div>
                <div class="session-list">
                    ${renderSessionList(coach)}
                </div>
            </aside>

            <main class="center-stack">
                <div class="timeline-card">
                    <div class="timeline-head">
                        <div>
                            <div class="label">Weeks until fight night</div>
                            <div class="title">${weeksLeft} Week${weeksLeft === 1 ? '' : 's'} Remaining</div>
                        </div>
                        <div class="opponent">
                            opponent <span class="vs">·</span> <span class="name">${escapeHtml(opponentLastName)}</span>
                        </div>
                    </div>
                    <div class="timeline-path">
                        ${renderTimeline()}
                    </div>
                </div>

                ${renderSessionDetail(coach)}
            </main>

            <aside class="meters-card">
                <div class="meters-head">
                    <div class="label">Camp Health</div>
                    <div class="title">Your Four Meters</div>
                </div>
                <div class="meters-body">
                    ${renderMeter({
                        label: 'Fitness', value: career.fitness, sweetLow: 70, sweetHigh: 92,
                        statusGood: getStatusForFitness(career.fitness),
                        statusWarn: getStatusForFitness(career.fitness),
                        statusDanger: getStatusForFitness(career.fitness),
                        lowLabel: 'Burned', midLabel: 'Steady', highLabel: 'Charged', unit: '/ 100'
                    })}
                    ${renderMeter({
                        label: 'Fight Sharpness', value: career.sharpness, sweetLow: 60, sweetHigh: 95,
                        statusGood: getStatusForSharpness(career.sharpness),
                        statusWarn: getStatusForSharpness(career.sharpness),
                        statusDanger: getStatusForSharpness(career.sharpness),
                        lowLabel: 'Rusty', midLabel: 'Sharp', highLabel: 'Razor', unit: '/ 100'
                    })}
                    ${renderMeter({
                        label: 'Weight Cut', value: career.weightCutPressure, sweetLow: 15, sweetHigh: 55,
                        statusGood: getStatusForCut(career.weightCutPressure),
                        statusWarn: getStatusForCut(career.weightCutPressure),
                        statusDanger: getStatusForCut(career.weightCutPressure),
                        lowLabel: 'Too Light', midLabel: 'On Target', highLabel: 'Risky Cut', unit: '/ 100'
                    })}
                    ${renderMeter({
                        label: 'Fatigue', value: career.fatigue, sweetLow: 0, sweetHigh: 55,
                        statusGood: getStatusForFatigue(career.fatigue),
                        statusWarn: getStatusForFatigue(career.fatigue),
                        statusDanger: getStatusForFatigue(career.fatigue),
                        lowLabel: 'Fresh', midLabel: 'Honest', highLabel: 'Overtrained', unit: '/ 100'
                    })}
                </div>

                <div class="fingerprint-card">
                    <div class="lbl">Style Fingerprint · ${escapeHtml(fingerprint.label)}</div>
                    <div class="fingerprint-bar">${fingerprint.segments}</div>
                    <div class="fp-legend">${fingerprint.rows}</div>
                </div>
            </aside>
        </div>
    `;
}

export function selectCampSession(sessionKey) {
    if (!GYM_ACTIONS[sessionKey]) return false;
    campState.selectedSessionKey = sessionKey;
    return true;
}

export function getSelectedCampSession() {
    return campState.selectedSessionKey;
}
