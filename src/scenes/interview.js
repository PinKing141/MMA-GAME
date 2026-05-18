import { state } from '../lib/core.js';

const QUESTIONS = [
    { topic: 'gameplan', q: 'How do you see this fight playing out?' },
    { topic: 'opponent_threat', q: "What's the biggest threat your opponent brings?" },
    { topic: 'beef', q: 'Any disrespect between you two that you want to address?' },
    { topic: 'closing', q: 'Final words for the fans before fight night?' }
];

const REPORTERS = [
    { name: 'Marc Reilly', outlet: 'ESPN' },
    { name: 'Sarah Chen', outlet: 'MMA Junkie' },
    { name: 'Jamal Foster', outlet: 'Combate Press' },
    { name: 'Hiroko Tanaka', outlet: 'Sherdog' },
    { name: 'Liam O\'Donnell', outlet: 'MMA Fighting' },
    { name: 'Carlos Mendez', outlet: 'Bloody Elbow' }
];

const ANSWER_CHOICES = {
    gameplan: [
        { mood: 'confident', preview: 'Promise a finish', quote: 'I see a clean performance. I take this on my terms. {opp} has answers for nothing I bring.', tension: 6, hype: 4 },
        { mood: 'composed', preview: 'Stay technical', quote: 'I prepare for everywhere the fight goes. Standing, ground, scrambles. I trust my training.', tension: -2, hype: 2 },
        { mood: 'humble', preview: 'Show respect', quote: '{opp} is dangerous. I trained hard. Whatever happens, I gave it everything I had.', tension: -4, hype: 1 },
        { mood: 'trash', preview: 'Talk smack', quote: 'I have seen the tape. {opp} is overrated. I am going to expose him for everyone to see.', tension: 12, hype: 6 }
    ],
    opponent_threat: [
        { mood: 'respectful', preview: 'Praise their game', quote: '{opp} has legitimate skills. He earned his spot. I have to be at my absolute best.', tension: -5, hype: 1 },
        { mood: 'confident', preview: 'Dismiss the threat', quote: 'I studied {opp}. He brings nothing I have not seen before. Nothing that scares me.', tension: 5, hype: 3 },
        { mood: 'defensive', preview: 'Brush it off', quote: 'I do not focus on what he brings. I focus on what I do. That has always been my approach.', tension: 1, hype: 0 },
        { mood: 'trash', preview: 'Mock them', quote: '{opp}\'s biggest threat? Maybe his cardio gives him a heart attack and saves him the embarrassment.', tension: 14, hype: 7 }
    ],
    beef: [
        { mood: 'composed', preview: "It's just business", quote: 'No beef. He is a guy I have to beat to move up. That is it. Pure business.', tension: -2, hype: 0 },
        { mood: 'hostile', preview: "There's real heat", quote: 'There is history. I do not want to get into it here. But it will come out in the cage. Believe that.', tension: 15, hype: 7 },
        { mood: 'respectful', preview: 'Genuine respect', quote: 'No issues between us. Two pros doing a job. I will shake his hand after, win or lose.', tension: -7, hype: 0 },
        { mood: 'trash', preview: 'Light him up', quote: 'He keeps running his mouth and Saturday I shut it. Permanently.', tension: 13, hype: 7 }
    ],
    closing: [
        { mood: 'confident', preview: 'Bring popcorn', quote: 'Tune in Saturday. I am going to give you all something to remember. Bring popcorn.', tension: 4, hype: 6 },
        { mood: 'humble', preview: 'Thank the fans', quote: 'Thank you to the fans. To my team, my family, my coaches. I fight my heart out for you.', tension: -2, hype: 4 },
        { mood: 'trash', preview: 'Promise violence', quote: 'I am bringing violence Saturday. Pure violence. The fans deserve a show — they will get one.', tension: 8, hype: 7 },
        { mood: 'composed', preview: 'Keep it short', quote: 'See everybody Saturday. That is all I have to say.', tension: 0, hype: 1 }
    ]
};

const OPPONENT_QUOTES = {
    confident: [
        'I am in the best shape of my life. {opp} has never seen pressure like this.',
        'I know what I bring. Saturday night, the world finds out.',
        'I respect {opp} as a fighter. But the better man wins. That is me.'
    ],
    humble: [
        '{opp} is a tough guy. I have trained as hard as I can. Whatever happens, happens.',
        'I am grateful for the opportunity. We will find out who wants it more.',
        'I do not talk much. I just train. Fight night I show what I worked on.'
    ],
    trash: [
        '{opp}? Hype job. Watch what happens when I get in there.',
        'I have watched the tape. {opp} has no answers for me. Nowhere.',
        'I am going to put {opp} to sleep. First round. He is done.'
    ],
    hostile: [
        'I do not like {opp}. Saturday I make him answer for everything he said.',
        'He crossed a line. Now he gets to find out what that costs.',
        'I want to hurt him. That is the truth. I want him to remember my name.'
    ],
    composed: [
        'My approach is the same every fight. Prepare. Execute. Move on.',
        'I focus on what I control. {opp} is a problem to solve. Nothing more.',
        'I trust my preparation. The rest takes care of itself.'
    ],
    respectful: [
        '{opp} is a warrior. Whatever happens Saturday, I shake his hand after.',
        'I have huge respect for {opp}\'s career. Two pros. May the best man win.',
        'We are both putting it on the line. That deserves respect.'
    ],
    defensive: [
        'I do not need to prove anything. My record speaks for itself.',
        'I am not gonna get into that. I am here to fight. That is all.',
        'Doubters can stay doubting. I just keep working.'
    ]
};

const ARCHETYPE_PERSONALITY = {
    'Boxer': { confidence: 75, trashTalk: 60, humility: 35, respect: 50 },
    'Kick Boxer': { confidence: 70, trashTalk: 45, humility: 50, respect: 60 },
    'Wrestler': { confidence: 80, trashTalk: 35, humility: 45, respect: 60 },
    'Grappler': { confidence: 60, trashTalk: 30, humility: 65, respect: 70 },
    'All-Rounder': { confidence: 65, trashTalk: 35, humility: 60, respect: 70 }
};

// Module-local state. Reset whenever the scene opens for a new contract.
const interviewState = {
    contractId: null,
    questionIdx: 0,
    tension: 0,
    hype: 0,
    redMood: 'silent',
    blueMood: 'silent',
    waitingForAnswer: false,
    flashTimer: null,
    lastQuote: null,
    lastSpeakerCorner: null,
    advancingCb: null
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
}

function rng(min, max) {
    return min + Math.random() * (max - min);
}

function getOpponentLastName() {
    return state.career.selectedOpponent?.name.split(/\s+/).slice(-1)[0] || 'them';
}

function getPlayerLastName() {
    return state.setup.lastName || 'You';
}

function getPlayerFullName() {
    return [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Your Fighter';
}

function getOpponentPersonality() {
    const archetypeName = state.career.selectedOpponent?.archetype?.name || 'All-Rounder';
    return ARCHETYPE_PERSONALITY[archetypeName] || ARCHETYPE_PERSONALITY['All-Rounder'];
}

function ensureContractScoped() {
    const contractId = state.career.contract?.id || null;
    if (interviewState.contractId !== contractId) {
        interviewState.contractId = contractId;
        interviewState.questionIdx = 0;
        interviewState.tension = 0;
        interviewState.hype = 0;
        interviewState.redMood = 'silent';
        interviewState.blueMood = 'silent';
        interviewState.lastQuote = null;
        interviewState.lastSpeakerCorner = null;
    }
}

function opponentPickMood(topic, playerMood) {
    const p = getOpponentPersonality();
    if (topic === 'beef' || playerMood === 'trash' || playerMood === 'hostile') {
        if (p.trashTalk > 55) return 'hostile';
        if (p.respect > 65) return 'composed';
        return 'defensive';
    }
    if (topic === 'opponent_threat') {
        if (p.respect > 60) return 'respectful';
        if (p.trashTalk > 60) return 'trash';
        return 'composed';
    }
    const sum = p.confidence + p.humility + p.trashTalk + p.respect;
    const r = Math.random() * 100;
    if (r < (p.trashTalk / sum) * 100) return 'trash';
    if (r < ((p.trashTalk + p.confidence) / sum) * 100) return 'confident';
    if (r < ((p.trashTalk + p.confidence + p.humility) / sum) * 100) return 'humble';
    return 'respectful';
}

function getTensionLabel(value) {
    if (value < 25) return { label: 'Cordial', cls: 'low' };
    if (value < 55) return { label: 'Heated', cls: 'mid' };
    if (value < 85) return { label: 'Hostile', cls: 'high' };
    return { label: 'Boiling', cls: 'boil' };
}

function getHypeLabel(value) {
    if (value < 0) return { label: 'Forgotten', cls: 'low' };
    if (value < 20) return { label: 'Unknown', cls: 'mid' };
    if (value < 50) return { label: 'Prospect', cls: 'high' };
    if (value < 80) return { label: 'Star', cls: 'high' };
    return { label: 'Headliner', cls: 'high' };
}

function getCurrentQuestion() {
    return QUESTIONS[interviewState.questionIdx] || null;
}

function getCurrentReporter() {
    return REPORTERS[interviewState.questionIdx % REPORTERS.length];
}

function buildAnswerButton(choice, idx, opponentLast) {
    const quote = choice.quote.replace(/\{opp\}/g, opponentLast);
    const tensionStr = choice.tension > 0
        ? `<span class="${choice.tension > 8 ? 'neg' : ''}">Tension +${choice.tension}</span>`
        : choice.tension < 0
            ? `<span class="pos">Tension ${choice.tension}</span>`
            : '<span>Tension ±0</span>';
    const hypeStr = choice.hype > 0
        ? `<span class="pos">Hype +${choice.hype}</span>`
        : choice.hype < 0
            ? `<span class="neg">Hype ${choice.hype}</span>`
            : '';
    return `
        <button class="answer-btn" data-mood="${escapeHtml(choice.mood)}" data-answer-idx="${idx}">
            <div class="answer-btn-tag">${escapeHtml(choice.mood)} · ${escapeHtml(choice.preview)}</div>
            <div class="answer-btn-text">"${escapeHtml(quote)}"</div>
            <div class="answer-btn-effects">${tensionStr} ${hypeStr}</div>
        </button>
    `;
}

function renderAnswerPanel() {
    const question = getCurrentQuestion();
    if (!question) {
        return `
            <div class="answer-panel-eyebrow">Press Conference Complete</div>
            <div class="answer-choices">
                <button class="btn" data-interview-action="finish" style="grid-column: 1 / -1;">
                    Done · Continue to Weigh-In
                </button>
            </div>
        `;
    }

    const choices = ANSWER_CHOICES[question.topic] || [];
    const opponentLast = getOpponentLastName();
    return `
        <div class="answer-panel-eyebrow${interviewState.waitingForAnswer ? '' : ' waiting'}">
            ${interviewState.waitingForAnswer ? 'Awaiting opponent…' : 'Choose your response'}
        </div>
        <div class="answer-choices">
            ${interviewState.waitingForAnswer
                ? '<div class="answer-empty">The press is hearing from the opponent first…</div>'
                : choices.map((choice, idx) => buildAnswerButton(choice, idx, opponentLast)).join('')}
        </div>
    `;
}

function renderQuoteBlock() {
    if (!interviewState.lastQuote) {
        return `
            <div class="quote-quotemark">"</div>
            <div class="quote-text"><span style="color: var(--text-muted); font-style: italic; font-size: 16px;">Press conference begins…</span></div>
        `;
    }
    const speaker = interviewState.lastSpeakerCorner === 'red'
        ? getPlayerFullName()
        : (state.career.selectedOpponent?.name || 'Opponent');
    return `
        <div class="quote-quotemark">"</div>
        <div class="quote-text">${escapeHtml(interviewState.lastQuote)}</div>
        <div class="quote-attribution ${interviewState.lastSpeakerCorner}">
            <span class="dash"></span>
            <span class="name">${escapeHtml(speaker)}</span>
            <span class="dash"></span>
        </div>
    `;
}

function getPodiumMoodLabel(mood) {
    return mood.charAt(0).toUpperCase() + mood.slice(1);
}

function renderPodium(corner, name, flag, weightClass, mood) {
    const moodLabel = mood === 'silent' ? 'Silent' : getPodiumMoodLabel(mood);
    return `
        <div class="fighter-podium ${corner}">
            <div class="podium-portrait">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="${corner === 'red' ? '#e21d36' : '#2563eb'}" stroke-width="2" stroke-dasharray="3 4" opacity="0.5"/>
                    <path d="M 30 70 Q 50 50 70 70" fill="none" stroke="${corner === 'red' ? '#e21d36' : '#2563eb'}" stroke-width="4" stroke-linecap="round"/>
                    <circle cx="50" cy="42" r="16" fill="#1c1c24" stroke="${corner === 'red' ? '#e21d36' : '#2563eb'}" stroke-width="3"/>
                </svg>
            </div>
            <div class="podium-tag">${corner === 'red' ? 'Red Corner · You' : 'Blue Corner · Opponent'}</div>
            <div class="podium-name">${escapeHtml(name.toUpperCase())}</div>
            <div class="podium-flag">${escapeHtml(flag)} · ${escapeHtml(weightClass)}</div>
            <div class="podium-mood ${escapeHtml(mood)}">${escapeHtml(moodLabel)}</div>
        </div>
    `;
}

function getWeightClassLabel() {
    const w = state.career.selectedOpponent;
    if (!w) return 'Welterweight';
    const key = w.weightClassKey || 'welterweight';
    return key.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function renderInterviewScene() {
    const root = document.getElementById('scene-interview');
    if (!root) return;

    ensureContractScoped();

    if (!state.career.contract || !state.career.selectedOpponent) {
        root.innerHTML = `
            <div class="camp-empty-state">
                <p>No press conference scheduled — no fight is booked.</p>
                <button class="btn" data-interview-action="back">Back to Hub</button>
            </div>
        `;
        return;
    }

    const playerName = getPlayerFullName();
    const opponentName = state.career.selectedOpponent.name;
    const opponentFlag = state.career.selectedOpponent.country?.code || state.career.selectedOpponent.countryCode || '';
    const playerFlag = state.setup.country?.code || 'US';
    const weightClass = getWeightClassLabel();
    const question = getCurrentQuestion();
    const reporter = getCurrentReporter();
    const tensionInfo = getTensionLabel(interviewState.tension);
    const hypeInfo = getHypeLabel(interviewState.hype);
    const hypeVisualPct = ((interviewState.hype + 50) / 150) * 100;
    const eventName = state.career.contract.eventName;

    root.innerHTML = `
        <header class="media-header">
            <div>
                <div class="eyebrow">Pre-Fight Press · ${escapeHtml(eventName)}</div>
                <div class="title">
                    <span>${escapeHtml(playerName.toUpperCase())}</span>
                    <span class="vs">VS</span>
                    <span>${escapeHtml(opponentName.toUpperCase())}</span>
                </div>
            </div>
            <div class="phase-pill">Fight Week · Media Day</div>
        </header>

        <div class="media-stage" id="interview-stage">
            <div class="media-backdrop">
                <div class="media-backdrop-logo">OCTA<span style="color: rgba(225, 29, 54, 0.4);">GON</span></div>
                <div class="media-backdrop-event">${escapeHtml(eventName)} · Media Day</div>
            </div>

            <div class="quote-stage">
                ${renderPodium('red', playerName, playerFlag, weightClass, interviewState.redMood)}
                <div class="quote-block">
                    ${renderQuoteBlock()}
                </div>
                ${renderPodium('blue', opponentName, opponentFlag, weightClass, interviewState.blueMood)}
            </div>

            ${question ? `
                <div class="question-strip">
                    <div class="label">Question ${interviewState.questionIdx + 1} / ${QUESTIONS.length}</div>
                    <div class="question">"${escapeHtml(question.q)}"</div>
                    <div class="reporter">${escapeHtml(reporter.name)} · <span class="outlet">${escapeHtml(reporter.outlet)}</span></div>
                </div>
            ` : ''}

            <div class="media-meters-strip">
                <div class="meter-block">
                    <div class="meter-head">
                        <span class="lbl">Tension</span>
                        <span class="media-meter-readout ${tensionInfo.cls}">${Math.round(interviewState.tension)}% · ${escapeHtml(tensionInfo.label)}</span>
                    </div>
                    <div class="media-meter-bar tension"><div class="fill" style="width: ${Math.round(interviewState.tension)}%"></div></div>
                </div>
                <div class="meter-block">
                    <div class="meter-head">
                        <span class="lbl">Hype</span>
                        <span class="media-meter-readout ${hypeInfo.cls}">${Math.round(interviewState.hype)} · ${escapeHtml(hypeInfo.label)}</span>
                    </div>
                    <div class="media-meter-bar hype"><div class="fill" style="width: ${Math.round(hypeVisualPct)}%"></div></div>
                </div>
            </div>
        </div>

        <div class="answer-panel">
            ${renderAnswerPanel()}
        </div>

        <div class="continue-bar">
            <div class="text">
                <div class="head">Media obligations matter</div>
                <p>Tension shapes how aggressively your opponent comes out the gate. Hype banks reputation when the fight is done.</p>
            </div>
            <button class="btn ghost" data-interview-action="back">Back to Hub</button>
        </div>
    `;

    startCameraFlashes();
}

function startCameraFlashes() {
    if (interviewState.flashTimer) clearInterval(interviewState.flashTimer);
    const stage = document.getElementById('interview-stage');
    if (!stage) return;
    interviewState.flashTimer = setInterval(() => {
        if (Math.random() < 0.35 && document.getElementById('scene-interview')?.classList.contains('active')) {
            spawnFlash(stage);
        }
    }, 900);
}

function spawnFlash(stage) {
    const flash = document.createElement('div');
    flash.className = 'flash-burst';
    flash.style.left = `${rng(8, 92)}%`;
    flash.style.top = `${rng(60, 90)}%`;
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
}

export function stopInterviewFlashes() {
    if (interviewState.flashTimer) {
        clearInterval(interviewState.flashTimer);
        interviewState.flashTimer = null;
    }
}

/**
 * Player answer handler. Applies tension/hype, plays opponent reply,
 * advances the question pointer, and re-renders.
 */
export async function handleInterviewAnswer(answerIdx) {
    const question = getCurrentQuestion();
    if (!question) return;
    const choices = ANSWER_CHOICES[question.topic] || [];
    const choice = choices[answerIdx];
    if (!choice || interviewState.waitingForAnswer) return;

    const opponentLast = getOpponentLastName();
    const playerQuote = choice.quote.replace(/\{opp\}/g, opponentLast);

    interviewState.redMood = choice.mood;
    interviewState.lastQuote = playerQuote;
    interviewState.lastSpeakerCorner = 'red';
    interviewState.tension = clamp(interviewState.tension + choice.tension, 0, 100);
    interviewState.hype = clamp(interviewState.hype + choice.hype, -50, 100);
    interviewState.waitingForAnswer = true;
    renderInterviewScene();

    // Opponent reply after a beat.
    await new Promise(resolve => setTimeout(resolve, 1100));

    const opponentMood = opponentPickMood(question.topic, choice.mood);
    const playerLast = getPlayerLastName();
    const reply = pick(OPPONENT_QUOTES[opponentMood] || OPPONENT_QUOTES.composed).replace(/\{opp\}/g, playerLast);
    const oppDelta = opponentMood === 'hostile' ? 10
        : opponentMood === 'trash' ? 6
        : opponentMood === 'confident' ? 2
        : opponentMood === 'composed' ? -1
        : opponentMood === 'humble' || opponentMood === 'respectful' ? -4
        : 0;

    interviewState.blueMood = opponentMood;
    interviewState.lastQuote = reply;
    interviewState.lastSpeakerCorner = 'blue';
    interviewState.tension = clamp(interviewState.tension + oppDelta, 0, 100);
    interviewState.questionIdx += 1;
    interviewState.waitingForAnswer = false;

    renderInterviewScene();
}

export function getInterviewResult() {
    return {
        tension: interviewState.tension,
        hype: interviewState.hype,
        complete: interviewState.questionIdx >= QUESTIONS.length
    };
}

export function isInterviewComplete() {
    return interviewState.questionIdx >= QUESTIONS.length;
}

export function resetInterviewState() {
    interviewState.contractId = null;
    interviewState.questionIdx = 0;
    interviewState.tension = 0;
    interviewState.hype = 0;
    interviewState.redMood = 'silent';
    interviewState.blueMood = 'silent';
    interviewState.lastQuote = null;
    interviewState.lastSpeakerCorner = null;
    interviewState.waitingForAnswer = false;
}
