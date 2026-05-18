import { state } from '../lib/core.js';
import { getWeightClassEntry } from '../lib/utils/formatters.js';

const FACEOFFS = [
    { title: 'EYE TO EYE', desc: 'Cold stare. No words. The crowd holds its breath.' },
    { title: 'TENSION', desc: 'Neither blinks. The promoter steps between them. The room goes quiet.' },
    { title: 'WORDS', desc: 'Whispers exchanged. Security inches forward. Something was said.' },
    { title: 'SHOVE!', desc: 'Fighters separated. Crowd erupts. Bad blood is real.' },
    { title: 'STARE-DOWN', desc: 'Forty-five seconds of silent intensity. Cameras snap furiously.' }
];

const weighInState = {
    contractId: null,
    started: false,
    finished: false,
    redResult: null,
    blueResult: null,
    faceoffOutcome: null,
    flashTimer: null
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rng(min, max) { return min + Math.random() * (max - min); }
function fmtWeight(value) { return Number(value).toFixed(1); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getPlayerCorner() {
    const wc = getWeightClassEntry(state.setup.weight);
    const cutPressure = state.career.weightCutPressure || 0;
    // High cut pressure → small chance of missing weight by a fraction.
    const missesWeight = cutPressure >= 75 && Math.random() < 0.35;
    const weight = missesWeight
        ? wc.max + rng(0.5, 2.5)
        : Math.min(wc.max - rng(0.0, 1.2), state.setup.weight);
    return {
        name: [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ').toUpperCase() || 'YOUR FIGHTER',
        nickname: `The ${state.career.selectedOpponent?.archetype?.name || 'Prospect'}`,
        stance: state.setup.hand === 'left' ? 'Southpaw' : 'Orthodox',
        countryCode: state.setup.country?.code || 'US',
        weightClass: wc.name,
        classLimit: wc.max,
        weight: parseFloat(weight.toFixed(1))
    };
}

function getOpponentCorner() {
    const opp = state.career.selectedOpponent;
    if (!opp) return null;
    const wc = getWeightClassEntry(state.setup.weight);
    // Opponent weight: usually under, occasionally a tiny miss.
    const missesWeight = Math.random() < 0.12;
    const weight = missesWeight
        ? wc.max + rng(0.3, 1.8)
        : wc.max - rng(0.2, 1.5);
    return {
        name: opp.name.toUpperCase(),
        nickname: opp.nickname || '',
        stance: opp.hand === 'left' ? 'Southpaw' : 'Orthodox',
        countryCode: opp.country?.code || opp.countryCode || '',
        weightClass: wc.name,
        classLimit: wc.max,
        weight: parseFloat(weight.toFixed(1))
    };
}

function ensureContractScoped() {
    const contractId = state.career.contract?.id || null;
    if (weighInState.contractId !== contractId) {
        weighInState.contractId = contractId;
        weighInState.started = false;
        weighInState.finished = false;
        weighInState.redResult = null;
        weighInState.blueResult = null;
        weighInState.faceoffOutcome = null;
    }
}

function getEventTier() {
    const event = state.career.selectedEvent;
    if (!event) return 'local';
    if (event.reputationRequired >= 5) return 'stadium';
    if (event.reputationRequired >= 2) return 'regional';
    return 'local';
}

function getFlashIntensity() {
    const tier = getEventTier();
    return tier === 'stadium' ? 0.85 : tier === 'regional' ? 0.45 : 0.18;
}

function spawnFlash(stage) {
    const flash = document.createElement('div');
    flash.className = 'flash-burst';
    flash.style.left = `${rng(8, 92)}%`;
    flash.style.top = `${rng(40, 85)}%`;
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
}

function burstFlashes(stage, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => spawnFlash(stage), i * 110);
    }
}

function startFlashCadence() {
    stopFlashCadence();
    const intensity = getFlashIntensity();
    weighInState.flashTimer = setInterval(() => {
        const stage = document.getElementById('weigh-stage');
        if (!stage || !document.getElementById('scene-weigh-in')?.classList.contains('active')) {
            return;
        }
        if (Math.random() < intensity) spawnFlash(stage);
    }, 800);
}

export function stopFlashCadence() {
    if (weighInState.flashTimer) {
        clearInterval(weighInState.flashTimer);
        weighInState.flashTimer = null;
    }
}

function setLcd(value, mode) {
    const lcd = document.getElementById('lcd-value');
    if (!lcd) return;
    lcd.textContent = fmtWeight(value);
    lcd.classList.remove('over');
    if (mode === 'over') lcd.classList.add('over');
}

function setScaleLabel(text) {
    const el = document.getElementById('scale-label');
    if (el) el.textContent = text;
}

function setStatus(corner, status, weight, classLimit) {
    const statusEl = document.getElementById(`${corner}-status`);
    const weightEl = document.getElementById(`${corner}-weight`);
    if (!statusEl || !weightEl) return;

    statusEl.classList.remove('weighing', 'on-weight', 'over-weight');
    weightEl.classList.remove('on-weight', 'over-weight');

    if (status === 'pending') {
        statusEl.textContent = 'Awaiting';
        weightEl.textContent = '—';
    } else if (status === 'weighing') {
        statusEl.textContent = 'On Scale';
        statusEl.classList.add('weighing');
        weightEl.textContent = '...';
    } else if (status === 'on_weight') {
        statusEl.textContent = 'On Weight';
        statusEl.classList.add('on-weight');
        weightEl.textContent = fmtWeight(weight);
        weightEl.classList.add('on-weight');
    } else if (status === 'over_weight') {
        const diff = (weight - classLimit).toFixed(1);
        statusEl.textContent = `+${diff} Over`;
        statusEl.classList.add('over-weight');
        weightEl.textContent = fmtWeight(weight);
        weightEl.classList.add('over-weight');
    }
}

function setActive(corner) {
    ['red', 'blue'].forEach(c => {
        const el = document.getElementById(`card-${c}`);
        if (el) el.classList.toggle('active', c === corner);
    });
}

function clearActive() {
    ['red', 'blue'].forEach(c => {
        document.getElementById(`card-${c}`)?.classList.remove('active');
    });
}

function setLog(html) {
    const el = document.getElementById('log-line');
    if (el) el.innerHTML = html;
}

function animateWeighIn(corner, fighter) {
    return new Promise(resolve => {
        const stage = document.getElementById('weigh-stage');
        setActive(corner);
        setStatus(corner, 'weighing');
        setScaleLabel(`${fighter.name} on the scale`);
        setLog(`<span class="${corner}">${escapeHtml(fighter.name.split(/\s+/).slice(-1)[0])}</span> steps onto the scale…`);
        burstFlashes(stage, 6);

        setLcd(0);
        const totalMs = 1500;
        const startTime = performance.now();
        const overshoot = fighter.weight + rng(2, 5);
        const overshootTime = totalMs * 0.55;

        function frame(now) {
            const elapsed = now - startTime;
            let value;
            if (elapsed < overshootTime) {
                const t = elapsed / overshootTime;
                value = overshoot * (t * t * (3 - 2 * t));
            } else if (elapsed < totalMs) {
                const t = (elapsed - overshootTime) / (totalMs - overshootTime);
                value = overshoot - (overshoot - fighter.weight) * t;
            } else {
                value = fighter.weight;
            }
            if (elapsed < totalMs * 0.9) value += rng(-0.2, 0.2);
            setLcd(value);

            if (elapsed < totalMs) {
                requestAnimationFrame(frame);
            } else {
                const onWeight = fighter.weight <= fighter.classLimit;
                setLcd(fighter.weight, onWeight ? null : 'over');
                setStatus(corner, onWeight ? 'on_weight' : 'over_weight', fighter.weight, fighter.classLimit);
                if (onWeight) {
                    setLog(`<span class="${corner}">${escapeHtml(fighter.name.split(/\s+/).slice(-1)[0])}</span> weighs in at <strong>${fmtWeight(fighter.weight)} lbs</strong> — <span class="on">ON WEIGHT</span>`);
                } else {
                    const over = (fighter.weight - fighter.classLimit).toFixed(1);
                    setLog(`<span class="${corner}">${escapeHtml(fighter.name.split(/\s+/).slice(-1)[0])}</span> tips the scale at <strong>${fmtWeight(fighter.weight)} lbs</strong> — <span class="over">MISSED BY ${over} LBS</span>`);
                }
                resolve({ onWeight, weight: fighter.weight });
            }
        }
        requestAnimationFrame(frame);
    });
}

function playFaceoff(outcome) {
    return new Promise(resolve => {
        clearActive();
        setScaleLabel('Face-off');
        const banner = document.getElementById('faceoff-banner');
        if (!banner) {
            resolve();
            return;
        }
        const stage = document.getElementById('weigh-stage');
        burstFlashes(stage, 15);

        banner.querySelector('.title').textContent = outcome.title;
        banner.querySelector('.desc').textContent = outcome.desc;
        banner.classList.add('show');

        setLog(`<strong>Face-off:</strong> ${escapeHtml(outcome.desc)}`);

        setTimeout(() => {
            banner.classList.remove('show');
            resolve();
        }, 3800);
    });
}

async function runCeremony() {
    if (weighInState.started) return;
    weighInState.started = true;

    const red = getPlayerCorner();
    const blue = getOpponentCorner();
    if (!blue) return;

    setLog(`<strong>Ceremony begins.</strong> ${escapeHtml(red.name.split(/\s+/).slice(-1)[0])} steps up first.`);
    await wait(700);

    const redResult = await animateWeighIn('red', red);
    weighInState.redResult = redResult;
    await wait(1100);

    const blueResult = await animateWeighIn('blue', blue);
    weighInState.blueResult = blueResult;
    await wait(900);

    setScaleLabel('Both weighed in');
    setLcd(0);
    clearActive();
    await wait(500);

    const outcome = pick(FACEOFFS);
    weighInState.faceoffOutcome = outcome;
    await playFaceoff(outcome);

    weighInState.finished = true;
    setLog('<strong>Ceremony complete.</strong> 24 hours to fight night.');

    // Trigger a re-render to enable the "Walk to the Cage" button.
    const finishedButton = document.querySelector('[data-weigh-action="walk"]');
    if (finishedButton) {
        finishedButton.disabled = false;
    }
}

export function renderWeighInScene() {
    const root = document.getElementById('scene-weigh-in');
    if (!root) return;

    ensureContractScoped();

    if (!state.career.contract || !state.career.selectedOpponent) {
        root.innerHTML = `
            <div class="camp-empty-state">
                <p>No weigh-in scheduled — no fight is booked.</p>
                <button class="btn" data-weigh-action="back">Back to Hub</button>
            </div>
        `;
        return;
    }

    const red = getPlayerCorner();
    const blue = getOpponentCorner();
    const eventName = state.career.contract.eventName;
    const tier = getEventTier();
    const tierLabel = tier === 'stadium' ? 'Championship Card · Official'
        : tier === 'regional' ? 'Regional Showcase · Ceremonial'
        : 'Local Card · Weigh-Ins';

    const isFinished = weighInState.finished;

    root.innerHTML = `
        <header class="media-header">
            <div>
                <div class="eyebrow">Ceremonial Weigh-In · 24h to Bell</div>
                <div class="title">
                    <span>${escapeHtml(red.name)}</span>
                    <span class="vs">VS</span>
                    <span>${escapeHtml(blue.name)}</span>
                </div>
            </div>
            <div class="phase-pill">${escapeHtml(isFinished ? 'Complete' : 'Weigh-In')}</div>
        </header>

        <div class="weigh-stage" id="weigh-stage">
            <div class="banner-backdrop">
                <div class="banner-logo">OCTA<span style="color: rgba(225, 29, 54, 0.4);">GON</span></div>
                <div class="banner-divider"></div>
                <div class="banner-event">${escapeHtml(eventName)} · ${escapeHtml(tierLabel)}</div>
            </div>

            <div class="weigh-layout">
                <div class="weigh-card red" id="card-red">
                    <div class="fc-tag">Red Corner</div>
                    <div class="fc-name" id="red-name">${escapeHtml(red.name)}</div>
                    <div class="fc-nick" id="red-nick">${red.nickname ? '"' + escapeHtml(red.nickname) + '"' : ''}</div>
                    <div class="fc-flag" id="red-flag">${escapeHtml((red.countryCode || '').toUpperCase())} · ${escapeHtml(red.weightClass)} · ${escapeHtml(red.stance)}</div>
                    <div class="fc-weight-row">
                        <span class="fc-weight-label">Scale</span>
                        <span class="fc-weight-value" id="red-weight">—</span>
                    </div>
                    <div class="fc-status" id="red-status">Awaiting</div>
                </div>

                <div class="scale-platform">
                    <div class="scale-eyebrow" id="scale-label">On the scale</div>
                    <div class="lcd-display">
                        <div class="lcd-value" id="lcd-value">0.0</div>
                        <div class="lcd-unit">LBS</div>
                    </div>
                    <div class="scale-class-line">
                        <span>Weight Class</span>
                        <span class="v">${escapeHtml(red.weightClass)} · ${red.classLimit} lbs</span>
                    </div>
                    <div class="scale-base"></div>
                </div>

                <div class="weigh-card blue" id="card-blue">
                    <div class="fc-tag">Blue Corner</div>
                    <div class="fc-name" id="blue-name">${escapeHtml(blue.name)}</div>
                    <div class="fc-nick" id="blue-nick">${blue.nickname ? '"' + escapeHtml(blue.nickname) + '"' : ''}</div>
                    <div class="fc-flag" id="blue-flag">${escapeHtml((blue.countryCode || '').toUpperCase())} · ${escapeHtml(blue.weightClass)} · ${escapeHtml(blue.stance)}</div>
                    <div class="fc-weight-row">
                        <span class="fc-weight-label">Scale</span>
                        <span class="fc-weight-value" id="blue-weight">—</span>
                    </div>
                    <div class="fc-status" id="blue-status">Awaiting</div>
                </div>
            </div>

            <div class="faceoff-banner" id="faceoff-banner">
                <div class="content">
                    <div class="eyebrow">Face-Off</div>
                    <div class="title">EYE TO EYE</div>
                    <div class="desc">Cold stare. No words.</div>
                </div>
            </div>

            <div class="log-strip">
                <div class="label">Latest</div>
                <div class="text" id="log-line">Awaiting ceremony…</div>
            </div>
        </div>

        <div class="continue-bar">
            <div class="text">
                <div class="head">Walk to the cage</div>
                <p>Both fighters made the class. 24 hours from bell. Camp work, the cut, and the crowd all show up in there.</p>
            </div>
            <button class="btn" data-weigh-action="walk" ${isFinished ? '' : 'disabled'}>Walk to the Cage</button>
            <button class="btn ghost" data-weigh-action="back">Back to Hub</button>
        </div>
    `;

    // If we've already finished once for this contract, restore the on-weight UI.
    if (weighInState.finished) {
        setStatus('red', weighInState.redResult.onWeight ? 'on_weight' : 'over_weight', weighInState.redResult.weight, red.classLimit);
        setStatus('blue', weighInState.blueResult.onWeight ? 'on_weight' : 'over_weight', weighInState.blueResult.weight, blue.classLimit);
        setScaleLabel('Ceremony complete');
        setLcd(0);
        setLog('<strong>Ceremony complete.</strong> 24 hours to fight night.');
    } else if (!weighInState.started) {
        // Auto-run the ceremony shortly after mount.
        setTimeout(() => runCeremony(), 450);
    }

    startFlashCadence();
}

export function isWeighInComplete() {
    return weighInState.finished;
}

export function getWeighInResult() {
    return {
        red: weighInState.redResult,
        blue: weighInState.blueResult,
        faceoff: weighInState.faceoffOutcome,
        finished: weighInState.finished
    };
}

export function resetWeighInState() {
    weighInState.contractId = null;
    weighInState.started = false;
    weighInState.finished = false;
    weighInState.redResult = null;
    weighInState.blueResult = null;
    weighInState.faceoffOutcome = null;
}
