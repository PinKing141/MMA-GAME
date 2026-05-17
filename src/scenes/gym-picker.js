import { COACHES } from '../lib/data.js';
import { state } from '../lib/core.js';
import { formatMoney } from '../lib/utils/formatters.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Coach reputation requirement → tier grade.
 * vega (0) = C, hayes (2) = B, sato (4) = A.
 */
function getGradeForCoach(coach) {
    if (coach.reputationRequired >= 4) return 'A';
    if (coach.reputationRequired >= 2) return 'B';
    return 'C';
}

/**
 * Crest SVG per coach gym — initials + gym-tier framing.
 * Visual flavor only, no game data.
 */
function renderCrest(coach, grade) {
    const accent = grade === 'A' ? '#f0c850' : grade === 'B' ? '#e21d36' : '#2563eb';
    const accentSoft = grade === 'A' ? 'rgba(212, 175, 55, 0.10)' : grade === 'B' ? 'rgba(225, 29, 54, 0.10)' : 'rgba(37, 99, 235, 0.10)';
    const gymInitials = coach.gym.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase();
    const coachLast = coach.name.split(/\s+/).slice(-1)[0].toUpperCase();
    return `
        <svg class="gym-crest-svg" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
            <polygon points="65,8 105,28 122,65 105,102 65,122 25,102 8,65 25,28"
                     fill="none" stroke="${accent}" stroke-width="3"/>
            <polygon points="65,18 95,32 110,65 95,98 65,112 35,98 20,65 35,32"
                     fill="${accentSoft}" stroke="${accent}" stroke-width="1.5"/>
            <text x="65" y="58" text-anchor="middle" font-family="Anton, Impact" font-size="22" fill="#f1ede6" letter-spacing="3">${escapeHtml(gymInitials)}</text>
            <text x="65" y="76" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="7" fill="#8a8a94" letter-spacing="2.5">${escapeHtml(coachLast)}</text>
            <text x="65" y="92" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="6" fill="#54545e" letter-spacing="2">${escapeHtml(grade)}-TIER GYM</text>
        </svg>
    `;
}

/**
 * Match the gym's specialty back to the most useful style flavor.
 * Pulls from coach.actionBonuses keys.
 */
function getGymSpecialty(coach) {
    const bonusKeys = Object.keys(coach.actionBonuses || {});
    const labelMap = {
        boxing: 'Boxing · Striking Focus',
        wrestling: 'Wrestling · Grind Camp',
        roadwork: 'Conditioning · Cardio Lab',
        film: 'Film · Fight IQ',
        recovery: 'Recovery · Camp Management'
    };
    return labelMap[bonusKeys[0]] || 'Mixed Game';
}

function renderGymCard(coach, relationship) {
    const grade = getGradeForCoach(coach);
    const reputationLocked = relationship.gymReputation < coach.reputationRequired;
    const cashLocked = state.career.cash < coach.fee;
    const isCurrentlySigned = state.career.selectedCoach?.id === coach.id;
    const switchLocked = state.career.campWeeksCompleted > 0 && !isCurrentlySigned && state.career.selectedCoach;
    const locked = reputationLocked || (switchLocked && !isCurrentlySigned);

    const lockReason = !cashLocked && reputationLocked
        ? `Need ${coach.reputationRequired} gym rep`
        : switchLocked
            ? 'Camp already underway with another gym'
            : '';

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
            <div class="flag-pill">${escapeHtml(grade)}-TIER</div>

            <div class="gym-crest-area">
                ${renderCrest(coach, grade)}
            </div>
            ${lockedOverlay}

            <div class="gym-name-banner">
                <div class="name">${escapeHtml(coach.gym.toUpperCase())}</div>
                <div class="coach">Head Coach · ${escapeHtml(coach.name)}</div>
            </div>

            <div class="gym-specialty-row">
                <div class="gym-specialty-pill">${escapeHtml(getGymSpecialty(coach))}</div>
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
                    <div class="value">${coach.reputationRequired}<small style="opacity:0.7"> / you ${relationship.gymReputation}</small></div>
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
                    <div>${escapeHtml(coach.specialty)}</div>
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
    if (!root) {
        return;
    }

    const career = state.career;
    const signedCoachName = career.selectedCoach
        ? `${career.selectedCoach.name} · ${career.selectedCoach.gym}`
        : 'No gym signed yet';

    const opponentLine = career.selectedOpponent
        ? `Camp for ${career.selectedOpponent.name} · ${career.campWeeksTotal} weeks`
        : 'No opponent booked';

    const cards = COACHES.map(coach => {
        const relationship = career.coachRelationships[coach.id];
        return renderGymCard(coach, relationship);
    }).join('');

    root.innerHTML = `
        <div class="gym-picker-title-block">
            <div class="gym-picker-eyebrow">Camp Prep · Pick A Home Gym</div>
            <h1 class="hub-title-text">Where will you<br>train?</h1>
            <p class="hub-subtitle">A gym isn't just a building — it's a culture. Sign up here and the head coach takes over your camp. Higher-tier gyms cost more and demand more rep, but every week with them sharpens you for longer than just this fight.</p>
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
                <p>The fee comes out of your bankroll. Stay loyal — the long-term trait stacks across camps when you keep showing up.</p>
            </div>
            <button class="btn ghost" data-gym-picker-action="back">Back to Hub</button>
        </div>
    `;
}
