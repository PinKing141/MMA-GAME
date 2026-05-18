import { COACHES } from '../lib/data.js';
import { state } from '../lib/core.js';
import { formatMoney } from '../lib/utils/formatters.js';
import { getCountryFlagSrc } from '../lib/data/countries.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const DISCIPLINE_LABEL = {
    boxing: 'Striking',
    wrestling: 'Grappling',
    roadwork: 'Cardio',
    film: 'Fight IQ',
    recovery: 'Recovery'
};

const GRADE_ACCENT = {
    A: { hex: '#f0c850', soft: 'rgba(212, 175, 55, 0.10)', stroke: '#d4af37' },
    B: { hex: '#e21d36', soft: 'rgba(225, 29, 54, 0.10)', stroke: '#e21d36' },
    C: { hex: '#2563eb', soft: 'rgba(37, 99, 235, 0.10)', stroke: '#2563eb' }
};

/**
 * Crest layout tuned per gym specialty for flavor. Plain SVG so we don't
 * need an asset pipeline. Each crest pulls a different shape so the gym
 * row reads distinct at a glance.
 */
function renderCrest(coach) {
    const grade = coach.grade || 'C';
    const colors = GRADE_ACCENT[grade] || GRADE_ACCENT.C;
    const initials = coach.gym.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const founded = coach.founded ? `EST · ${coach.founded}` : '';

    if (coach.specialty === 'Wrestling') {
        return `
            <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                <path d="M 65 8 L 122 65 L 65 122 L 8 65 Z" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
                <path d="M 65 18 L 112 65 L 65 112 L 18 65 Z" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
                <text x="65" y="58" text-anchor="middle" font-family="Anton, Impact" font-size="20" fill="#f1ede6" letter-spacing="3">${escapeHtml(initials)}</text>
                <text x="65" y="78" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="7" fill="#8a8a94" letter-spacing="2.5">${escapeHtml(coach.specialty.toUpperCase())}</text>
                <text x="65" y="94" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#54545e" letter-spacing="2">${escapeHtml(founded)}</text>
            </svg>
        `;
    }

    if (coach.specialty === 'Muay Thai') {
        return `
            <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                <path d="M 65 8 L 110 22 L 110 65 Q 110 100 65 122 Q 20 100 20 65 L 20 22 Z" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
                <path d="M 65 16 L 102 28 L 102 65 Q 102 94 65 113 Q 28 94 28 65 L 28 28 Z" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
                <text x="65" y="58" text-anchor="middle" font-family="Anton, Impact" font-size="20" fill="${colors.hex}" letter-spacing="3">${escapeHtml(initials)}</text>
                <line x1="38" y1="68" x2="92" y2="68" stroke="${colors.stroke}" stroke-width="1"/>
                <text x="65" y="83" text-anchor="middle" font-family="Anton, Impact" font-size="11" fill="#f1ede6" letter-spacing="2">MUAY THAI</text>
                <text x="65" y="98" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#8a8a94" letter-spacing="2">${escapeHtml(founded)}</text>
            </svg>
        `;
    }

    if (coach.specialty === 'Brazilian Jiu-Jitsu') {
        return `
            <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                <path d="M 28 22 L 102 22 L 102 75 Q 102 100 65 120 Q 28 100 28 75 Z" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
                <path d="M 36 30 L 94 30 L 94 73 Q 94 95 65 110 Q 36 95 36 73 Z" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
                <text x="65" y="60" text-anchor="middle" font-family="Anton, Impact" font-size="18" fill="#f1ede6" letter-spacing="3">${escapeHtml(initials)}</text>
                <text x="65" y="80" text-anchor="middle" font-family="Anton, Impact" font-size="14" fill="${colors.hex}" letter-spacing="3">BJJ</text>
                <text x="65" y="96" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#8a8a94" letter-spacing="2">${escapeHtml(founded)}</text>
            </svg>
        `;
    }

    if (coach.specialty === 'Taekwondo') {
        return `
            <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                <path d="M 65 10 L 110 25 L 110 100 L 65 120 L 20 100 L 20 25 Z" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
                <path d="M 65 20 L 102 32 L 102 95 L 65 110 L 28 95 L 28 32 Z" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
                <path d="M 50 50 Q 60 40 70 50 Q 80 60 70 70 Q 60 80 50 70" fill="none" stroke="${colors.stroke}" stroke-width="2.5"/>
                <text x="65" y="95" text-anchor="middle" font-family="Anton, Impact" font-size="11" fill="#f1ede6" letter-spacing="2">${escapeHtml(initials)}</text>
                <text x="65" y="106" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#8a8a94" letter-spacing="2">${escapeHtml(founded)}</text>
            </svg>
        `;
    }

    if (coach.specialty === 'Boxing') {
        return `
            <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
                <circle cx="65" cy="65" r="58" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
                <circle cx="65" cy="65" r="50" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
                <text x="65" y="62" text-anchor="middle" font-family="Anton, Impact" font-size="22" fill="#f1ede6" letter-spacing="3">${escapeHtml(initials)}</text>
                <line x1="42" y1="74" x2="88" y2="74" stroke="${colors.stroke}" stroke-width="1"/>
                <text x="65" y="88" text-anchor="middle" font-family="Anton, Impact" font-size="9" fill="${colors.hex}" letter-spacing="2">BOXING ROOM</text>
                <text x="65" y="100" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#8a8a94" letter-spacing="2">${escapeHtml(founded)}</text>
            </svg>
        `;
    }

    // Default crest — Tempo Lab / generic conditioning gym.
    return `
        <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
            <polygon points="65,8 105,28 122,65 105,102 65,122 25,102 8,65 25,28" fill="none" stroke="${colors.stroke}" stroke-width="3"/>
            <polygon points="65,18 95,32 110,65 95,98 65,112 35,98 20,65 35,32" fill="${colors.soft}" stroke="${colors.stroke}" stroke-width="1.5"/>
            <text x="65" y="60" text-anchor="middle" font-family="Anton, Impact" font-size="22" fill="${colors.hex}" letter-spacing="3">${escapeHtml(initials)}</text>
            <text x="65" y="80" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="7" fill="#f1ede6" letter-spacing="2.5">${escapeHtml(coach.specialty.toUpperCase())}</text>
            <text x="65" y="96" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#8a8a94" letter-spacing="2">${escapeHtml(founded)}</text>
        </svg>
    `;
}

function renderFlagPill(coach) {
    const src = getCountryFlagSrc(coach.countryCode);
    const codeLabel = coach.countryCode.length === 3
        ? coach.countryCode.toUpperCase()
        : `${coach.countryCode.toUpperCase()} · ${coach.city || ''}`.trim();

    if (!src) {
        return `<div class="flag-pill">${escapeHtml(codeLabel)}</div>`;
    }
    return `
        <div class="flag-pill flag-pill-img">
            <img src="${src}" alt="${escapeHtml(coach.country)} flag" loading="lazy" decoding="async"/>
            <span>${escapeHtml(coach.countryCode.toUpperCase())}</span>
        </div>
    `;
}

/**
 * Sort multipliers strongest-first so the gym's identity reads on the
 * first row. Clamp to top 4 so the perks list stays tight.
 */
function getMultiplierRows(coach) {
    const entries = Object.entries(coach.disciplineMultipliers || {})
        .map(([key, value]) => ({
            key,
            label: DISCIPLINE_LABEL[key] || key,
            value
        }))
        .sort((a, b) => b.value - a.value);
    return entries.slice(0, 4);
}

function renderGymCard(coach, relationship) {
    const grade = coach.grade || 'C';
    const reputationLocked = relationship.gymReputation < coach.reputationRequired;
    const cashLocked = state.career.cash < coach.fee;
    const isCurrentlySigned = state.career.selectedCoach?.id === coach.id;
    const switchLocked = state.career.campWeeksCompleted > 0 && !isCurrentlySigned && state.career.selectedCoach;
    const locked = reputationLocked || (switchLocked && !isCurrentlySigned);

    const lockReason = !cashLocked && reputationLocked
        ? `Need ${coach.reputationRequired} gym rep (you have ${relationship.gymReputation})`
        : switchLocked
            ? 'Camp already underway with another gym'
            : '';

    const multipliers = getMultiplierRows(coach);
    const multiplierMarkup = multipliers.map(entry => {
        const cls = entry.value >= 1.25 ? 'high' : entry.value >= 1.05 ? 'mid' : entry.value < 0.95 ? 'low' : 'neutral';
        return `<span class="mx-chip ${cls}">${escapeHtml(entry.label)} <strong>${entry.value.toFixed(2)}×</strong></span>`;
    }).join('');

    const footerHtml = isCurrentlySigned
        ? `<div class="gym-current-banner"><span class="check">✓</span> Currently Signed · ${state.career.campWeeksCompleted}/${state.career.campWeeksTotal} weeks</div>`
        : `<button class="gym-signup-button" data-gym-pick="${coach.id}" ${locked || cashLocked ? 'disabled' : ''}>
                ${locked ? 'Locked' : cashLocked ? 'Need ' + formatMoney(coach.fee - state.career.cash) : 'Sign Up'}
           </button>`;

    const lockedOverlay = locked && !isCurrentlySigned
        ? `<div class="gym-locked-overlay">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#f0c850" stroke-width="2">
                    <rect x="4" y="10" width="14" height="9" rx="1"/>
                    <path d="M 7 10 V 7 a 4 4 0 0 1 8 0 V 10"/>
                </svg>
                ${escapeHtml(lockReason)}
           </div>`
        : '';

    return `
        <article class="gym-card ${locked && !isCurrentlySigned ? 'locked' : ''}" data-grade="${grade}">
            <div class="top-stripe"></div>
            <div class="grade-badge">
                <div class="label">LVL</div>
                <div class="grade">${grade}</div>
            </div>
            ${renderFlagPill(coach)}

            <div class="gym-crest-area">
                ${renderCrest(coach)}
            </div>
            ${lockedOverlay}

            <div class="gym-name-banner">
                <div class="name">${escapeHtml(coach.gym.toUpperCase())}</div>
                <div class="coach">${escapeHtml(coach.city || '')} · ${escapeHtml(coach.country)} · Head Coach ${escapeHtml(coach.name)}</div>
            </div>

            <div class="gym-specialty-row">
                <div class="gym-specialty-pill">${escapeHtml(coach.specialty)} Specialist</div>
                <p class="gym-specialty-blurb">${escapeHtml(coach.specialty_blurb || coach.specialtyTagline || coach.specialty)}</p>
            </div>

            <div class="gym-multiplier-row">
                ${multiplierMarkup}
            </div>

            <div class="gym-fee-strip">
                <div class="gym-fee-row green">
                    <div class="icon">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" stroke-width="2"><path d="M3 5h10M3 11h10M5 3v10M11 3v10"/></svg>
                    </div>
                    <div class="label">Sign-Up Fee</div>
                    <div class="value">${formatMoney(coach.fee)}</div>
                </div>
                <div class="gym-fee-row rep">
                    <div class="icon">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#2563eb" stroke-width="2"><path d="M8 1l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z"/></svg>
                    </div>
                    <div class="label">Gym Rep Required</div>
                    <div class="value">${coach.reputationRequired} <small style="opacity:0.7">(you ${relationship.gymReputation})</small></div>
                </div>
                <div class="gym-fee-row trait">
                    <div class="icon">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#f0c850" stroke-width="2"><path d="M8 2l2 4 4 .6-3 3 .8 4.4L8 12l-3.8 2 .8-4.4-3-3 4-.6z"/></svg>
                    </div>
                    <div class="label">Long-Term Trait</div>
                    <div class="value">${escapeHtml(coach.longTermTrait.label)}</div>
                </div>
            </div>

            <div class="gym-perks-row">
                <div class="gym-perk-line">
                    <div class="icon"><svg viewBox="0 0 14 14" fill="none" stroke="#f0c850" stroke-width="2"><path d="M2 7l3 3 7-7"/></svg></div>
                    <div>${escapeHtml(coach.specialtyTagline || coach.specialty)}</div>
                </div>
                <div class="gym-perk-line">
                    <div class="icon"><svg viewBox="0 0 14 14" fill="none" stroke="#f0c850" stroke-width="2"><path d="M2 7l3 3 7-7"/></svg></div>
                    <div>${escapeHtml(coach.longTermTrait.description)}</div>
                </div>
                <div class="gym-perk-line">
                    <div class="icon"><svg viewBox="0 0 14 14" fill="none" stroke="#f0c850" stroke-width="2"><path d="M2 7l3 3 7-7"/></svg></div>
                    <div>Camps run · <strong>${relationship.campsCompleted}</strong> · Long-term boosts triggered <strong>${relationship.longTermBoosts}</strong></div>
                </div>
            </div>

            ${footerHtml}
        </article>
    `;
}

export function renderGymPickerScene() {
    const root = document.getElementById('scene-gym-picker');
    if (!root) return;

    const career = state.career;
    const signedCoachName = career.selectedCoach
        ? `${career.selectedCoach.name} · ${career.selectedCoach.gym}`
        : 'No gym signed yet';

    const opponentLine = career.selectedOpponent
        ? `Camp for ${career.selectedOpponent.name} · ${career.campWeeksTotal} weeks`
        : 'No opponent booked';

    // Sort by grade A → B → C, then by fee within tier, so the wall reads tier-down.
    const order = { A: 0, B: 1, C: 2 };
    const sortedCoaches = [...COACHES].sort((a, b) => {
        const tier = (order[a.grade] ?? 9) - (order[b.grade] ?? 9);
        if (tier !== 0) return tier;
        return a.fee - b.fee;
    });

    const cards = sortedCoaches.map(coach => {
        const relationship = career.coachRelationships[coach.id];
        return renderGymCard(coach, relationship);
    }).join('');

    root.innerHTML = `
        <div class="gym-picker-title-block">
            <div class="gym-picker-eyebrow">Camp Prep · Pick A Home Gym</div>
            <h1 class="hub-title-text">Where will you<br>train?</h1>
            <p class="hub-subtitle">Every MMA gym teaches the full game — but each one excels at its specialty. Wrestling rooms breed wrestlers, striking gyms build strikers, and the long-term trait stacks every camp you stay loyal.</p>
        </div>

        <div class="gym-picker-info-strip">
            <div>Bankroll · <span class="v">${formatMoney(career.cash)}</span> · ${escapeHtml(opponentLine)}</div>
            <div>${career.selectedCoach ? '<span class="signed">●</span> ' : ''}${escapeHtml(signedCoachName)}</div>
        </div>

        <div class="gym-picker-grid">
            ${cards}
        </div>

        <div class="continue-bar">
            <div class="text">
                <div class="head">Sign with a gym to start the camp</div>
                <p>The fee comes out of your bankroll. Multipliers scale every session's stat gain — train wrestling at Eagles MMA and you climb that bar faster than anywhere else.</p>
            </div>
            <button class="btn ghost" data-gym-picker-action="back">Back to Hub</button>
        </div>
    `;
}
