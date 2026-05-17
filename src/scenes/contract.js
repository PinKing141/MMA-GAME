import { state } from '../lib/core.js';
import { formatMoney } from '../lib/utils/formatters.js';
import { getContractPreview } from '../lib/actions/contract-actions.js';

const signatureState = {
    drawing: false,
    hasInk: false,
    lastX: 0,
    lastY: 0,
    listenersBound: false
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getPromotionShort(eventName) {
    // Pull a short league mark from the event name. "CAGE Fight Night: Vegas" → "CAGE FIGHT NIGHT".
    if (!eventName) {
        return { full: 'PROMOTION', accent: '' };
    }
    const main = eventName.split(':')[0].trim().toUpperCase();
    // Split into base + accent so we can color the tail red.
    const parts = main.split(' ');
    if (parts.length === 1) {
        return { full: main, accent: '' };
    }
    return {
        full: parts.slice(0, -1).join(' '),
        accent: ' ' + parts[parts.length - 1]
    };
}

function getCounterSignatory(eventName) {
    // Deterministic flavor name per event.
    const seed = (eventName || 'X').charCodeAt(0) + (eventName || 'X').length;
    const SIGNATORIES = [
        'D. Whyte',
        'M. Carrasco',
        'R. Okafor',
        'L. Kemp',
        'A. Volkova',
        'J. Holloway'
    ];
    return SIGNATORIES[seed % SIGNATORIES.length];
}

function getTier(event) {
    if (!event) {
        return 'Regional · Mid-Tier';
    }
    if (event.reputationRequired >= 5) {
        return 'PPV · Headline Card';
    }
    if (event.reputationRequired >= 3) {
        return 'National TV · Co-Main Tier';
    }
    if (event.reputationRequired >= 1) {
        return 'Regional · Main Card';
    }
    return 'Local · Apex Card';
}

export function renderContractScene() {
    const root = document.getElementById('scene-contract');
    if (!root) {
        return;
    }

    const opponent = state.career.selectedOpponent;
    const event = state.career.selectedEvent;
    const preview = getContractPreview(event, opponent);

    if (!preview || !event || !opponent) {
        root.innerHTML = `
            <div class="contract-empty">
                <div class="picker-eyebrow">Contract Office · No Deal</div>
                <h1 class="hub-title-text">Nothing to sign.</h1>
                <p class="hub-subtitle">Pick an opponent first and the contract will be drafted for you.</p>
                <div class="continue-bar">
                    <button class="btn" data-contract-action="back">Back to Fight Offers</button>
                </div>
            </div>
        `;
        return;
    }

    const promotion = getPromotionShort(event.name);
    const fighterName = ([state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Fighter').toUpperCase();
    const counterSig = getCounterSignatory(event.name);
    const campWeeks = state.career.campWeeksTotal || 4;
    const weightClass = opponent.weightClassKey
        ? opponent.weightClassKey.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : 'Welterweight';

    root.innerHTML = `
        <header class="contract-header-bar">
            <div class="contract-event-block">
                <div class="event-eyebrow">PROMOTIONAL OFFER · DRAFTED FOR REVIEW</div>
                <div class="event-title">${escapeHtml(event.name.toUpperCase())} OFFER</div>
            </div>
            <div class="timer-pill" id="contract-timer-pill">${campWeeks} WEEK CAMP</div>
        </header>

        <div class="stage-frame">
            <div class="contract-stack">
                <article class="contract" id="contract-paper">
                    <div class="contract-edge-top"></div>

                    <header class="contract-paper-header">
                        <div class="contract-league-mark">${escapeHtml(promotion.full)}<span class="accent">${escapeHtml(promotion.accent)}</span></div>
                        <div class="contract-paper-eyebrow">OFFICIAL PROMOTIONAL CONTRACT</div>
                        <h1 class="contract-paper-title">Articles of Engagement</h1>
                        <div class="contract-paper-subtitle">Drafted by the promoting body — presented for athlete review</div>
                    </header>

                    <section class="contract-paper-body">
                        <p>This agreement is entered into between the named promotional body and the undersigned athlete, herein referred to as <em>"the Fighter."</em> All terms below have been reviewed by the athlete's representation and are presented for final consent.</p>
                        <p>The Fighter:</p>
                        <span class="recipient">${escapeHtml(fighterName)}</span>
                        <p>...shall hereby be bound to the following obligations and granted the following privileges during the active term of this agreement.</p>
                    </section>

                    <section class="contract-terms">
                        <div class="term-row">
                            <div class="term-label">Promotion</div>
                            <div class="term-value">${escapeHtml(event.name)}</div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Card Position</div>
                            <div class="term-value">${escapeHtml(event.stageLabel)}</div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Opponent</div>
                            <div class="term-value">${escapeHtml(opponent.name)}<span class="small">${escapeHtml(opponent.archetype.name)}</span></div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Weight Class</div>
                            <div class="term-value">${escapeHtml(weightClass)}</div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Camp Window</div>
                            <div class="term-value">${campWeeks} weeks<span class="small">to fight night</span></div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Tier</div>
                            <div class="term-value">${escapeHtml(getTier(event))}</div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Base Purse</div>
                            <div class="term-value">${formatMoney(preview.showMoney)}<span class="small">to show</span></div>
                        </div>
                        <div class="term-row">
                            <div class="term-label">Win Bonus</div>
                            <div class="term-value">${formatMoney(preview.winBonus)}<span class="small">to win</span></div>
                        </div>
                    </section>

                    <section class="contract-paper-body">
                        <p class="fine-print">By affixing signature below, the Fighter acknowledges receipt of full contract documentation including the Standard Bout Agreement, Anti-Doping Rider, and Medical Suspension Clauses. Both parties consent to the terms in good faith.</p>
                    </section>

                    <section class="signature-area">
                        <div class="signature-block">
                            <div class="counter-signature">${escapeHtml(counterSig)}</div>
                            <div class="signature-line"></div>
                            <div class="signature-label">Promotional Body · Authorized Signatory</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-canvas-wrap">
                                <canvas id="contract-signature-canvas"></canvas>
                                <div class="signature-prompt" id="contract-signature-prompt">Sign here</div>
                            </div>
                            <div class="signature-line"></div>
                            <div class="signature-label">${escapeHtml(fighterName)} · Athlete Signatory</div>
                        </div>
                    </section>

                    <div class="contract-stamp" id="contract-stamp">
                        <div class="stamp-inner">
                            EXECUTED
                            <span class="small">Contract Archive</span>
                        </div>
                    </div>
                </article>
            </div>

            <div class="contract-confirmation" id="contract-confirmation" hidden>
                <div class="contract-confirmation-panel">
                    <div class="confirmation-mark">— EXECUTED &amp; FILED —</div>
                    <h2 class="confirmation-title accept">CONTRACT SIGNED</h2>
                    <p class="confirmation-desc">You're under contract. Camp begins now.</p>
                </div>
            </div>
        </div>

        <div class="contract-action-bar" id="contract-action-bar-initial">
            <button class="btn-action accept" data-contract-action="enter-sign">
                Accept &amp; Sign
                <span class="sub">Open the signature pad</span>
            </button>
            <button class="btn-action reject" data-contract-action="reject">
                Reject
                <span class="sub">Walk away from this deal</span>
            </button>
            <button class="btn-action defer" data-contract-action="back">
                Back
                <span class="sub">Other offers</span>
            </button>
        </div>

        <div class="contract-action-bar signing-mode" id="contract-action-bar-signing" hidden>
            <button class="btn-action clear" data-contract-action="clear">
                Clear
                <span class="sub">Try again</span>
            </button>
            <button class="btn-action defer" data-contract-action="cancel-sign">
                Cancel
                <span class="sub">Back to options</span>
            </button>
            <button class="btn-action confirm-sign" data-contract-action="confirm-sign" disabled>
                File Contract
                <span class="sub">Submit signature</span>
            </button>
        </div>
    `;

    setupSignatureCanvas();
}

function setupSignatureCanvas() {
    const canvas = document.getElementById('contract-signature-canvas');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');

    signatureState.drawing = false;
    signatureState.hasInk = false;
    signatureState.lastX = 0;
    signatureState.lastY = 0;

    resizeCanvas(canvas, ctx);

    if (!signatureState.listenersBound) {
        window.addEventListener('resize', () => {
            const current = document.getElementById('contract-signature-canvas');
            if (current) {
                resizeCanvas(current, current.getContext('2d'));
            }
        });
        signatureState.listenersBound = true;
    }

    canvas.addEventListener('mousedown', event => startDraw(canvas, event));
    canvas.addEventListener('mousemove', event => draw(canvas, ctx, event));
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', event => {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        startDraw(canvas, { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
    }, { passive: false });
    canvas.addEventListener('touchmove', event => {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        draw(canvas, ctx, { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
    }, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
}

function resizeCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0d0a04';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function startDraw(canvas, event) {
    if (!canvas.classList.contains('active')) {
        return;
    }
    signatureState.drawing = true;
    signatureState.lastX = event.offsetX;
    signatureState.lastY = event.offsetY;
    const prompt = document.getElementById('contract-signature-prompt');
    if (prompt) {
        prompt.classList.add('hidden');
    }
}

function draw(canvas, ctx, event) {
    if (!signatureState.drawing || !canvas.classList.contains('active')) {
        return;
    }
    signatureState.hasInk = true;

    ctx.beginPath();
    ctx.moveTo(signatureState.lastX, signatureState.lastY);
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();

    signatureState.lastX = event.offsetX;
    signatureState.lastY = event.offsetY;

    const confirmButton = document.querySelector('[data-contract-action="confirm-sign"]');
    if (confirmButton) {
        confirmButton.disabled = false;
    }
}

function stopDraw() {
    signatureState.drawing = false;
}

export function hasSignatureInk() {
    return signatureState.hasInk;
}

export function clearSignatureInk() {
    const canvas = document.getElementById('contract-signature-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    signatureState.hasInk = false;
    signatureState.drawing = false;

    const prompt = document.getElementById('contract-signature-prompt');
    if (prompt) {
        prompt.classList.remove('hidden');
    }
    const confirmButton = document.querySelector('[data-contract-action="confirm-sign"]');
    if (confirmButton) {
        confirmButton.disabled = true;
    }
}

export function enterSigningMode() {
    const canvas = document.getElementById('contract-signature-canvas');
    if (canvas) {
        canvas.classList.add('active');
        const ctx = canvas.getContext('2d');
        setTimeout(() => resizeCanvas(canvas, ctx), 30);
    }
    const paper = document.getElementById('contract-paper');
    if (paper) {
        paper.classList.add('signing');
    }
    const initial = document.getElementById('contract-action-bar-initial');
    const signing = document.getElementById('contract-action-bar-signing');
    if (initial) initial.hidden = true;
    if (signing) signing.hidden = false;
}

export function cancelSigningMode() {
    clearSignatureInk();
    const canvas = document.getElementById('contract-signature-canvas');
    if (canvas) {
        canvas.classList.remove('active');
    }
    const paper = document.getElementById('contract-paper');
    if (paper) {
        paper.classList.remove('signing');
    }
    const initial = document.getElementById('contract-action-bar-initial');
    const signing = document.getElementById('contract-action-bar-signing');
    if (initial) initial.hidden = false;
    if (signing) signing.hidden = true;
}

export async function playStampAndExit(onComplete) {
    const stamp = document.getElementById('contract-stamp');
    const paper = document.getElementById('contract-paper');
    const confirmation = document.getElementById('contract-confirmation');
    const signing = document.getElementById('contract-action-bar-signing');

    if (signing) signing.hidden = true;

    if (stamp) {
        await wait(280);
        stamp.classList.add('show');
        await wait(700);
    }
    if (paper) {
        paper.classList.add('signed');
        await wait(450);
    }
    if (confirmation) {
        confirmation.hidden = false;
        await wait(700);
    }
    onComplete && onComplete();
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
