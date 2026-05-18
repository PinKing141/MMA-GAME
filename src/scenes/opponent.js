import { syncAvailableEvents } from '../lib/actions/event-actions.js';
import { syncAvailableOpponents } from '../lib/actions/career-state.js';
import { state, getOverallAverage } from '../lib/core.js';
import { formatMoney, formatRecord, getRankLabel } from '../lib/utils/formatters.js';
import { buildFightOffers } from '../lib/selectors/fight-offer-selectors.js';
import { renderPortraitCard, getTierTokens } from '../lib/ui/portrait-card.js';
import { getDominantStyles, getStyleColor, getStyleLabel } from '../lib/domain/style-fingerprint.js';
import { getPersonalityTag } from '../lib/domain/personality.js';

const pickerState = {
    phase: 'picker',
    selectedOfferIndex: null,
    offers: []
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Personality + rivalry block under the specialty card. Reads the
 * opponent's personality tag plus any persistent rivalry tension the
 * player has built up across previous fights / press conferences.
 */
function renderOpponentPersonality(opponent) {
    const personalityTag = getPersonalityTag(opponent.personality);
    const rivalry = state.career.rivalries?.[opponent.id];
    const rivalryRow = rivalry && rivalry.level !== 'cordial'
        ? `<div class="opp-rivalry-row">
                <span class="opp-rivalry-pill ${escapeHtml(rivalry.level)}">${escapeHtml(rivalry.level.toUpperCase())}</span>
                <span class="opp-rivalry-note">${rivalry.tension}% tension carried over · ${rivalry.history?.length || 0} prior incident${rivalry.history?.length === 1 ? '' : 's'}</span>
           </div>`
        : '';
    return `
        <div class="opp-personality-row">
            <span class="opp-personality-label">Personality</span>
            <span class="opp-personality-tag">${escapeHtml(personalityTag)}</span>
        </div>
        ${rivalryRow}
    `;
}

/**
 * Scouting dossier readout for the opponent detail view. Shows up to
 * the opponent's top three styles as proportional pills.
 */
function renderOpponentFingerprint(fingerprint) {
    if (!fingerprint) return '';
    const dominants = getDominantStyles(fingerprint).slice(0, 3);
    if (dominants.length === 0) return '';

    const segments = dominants.map(s =>
        `<div class="hub-fp-segment" style="background:${getStyleColor(s.name)}; width:${Math.round(s.share * 100)}%"></div>`
    ).join('');
    const rows = dominants.map(s => `
        <span class="hub-fp-chip" style="border-left-color:${getStyleColor(s.name)}">${escapeHtml(s.name)} <strong>${Math.round(s.share * 100)}%</strong></span>
    `).join('');

    return `
        <div class="opponent-fingerprint">
            <div class="hub-fp-bar">${segments}</div>
            <div class="hub-fp-legend">${rows}</div>
        </div>
    `;
}

function getStyleDescription(name) {
    return {
        Boxer: 'Stays at boxing range. Sharp hands, head movement, and counters that punish bad entries.',
        'Kick Boxer': 'Range management with kicks and stance switches. Wants you walking through damage to get inside.',
        Wrestler: 'Single-mindedly chains takedowns and breaks you on the fence. Get ready to fight off your back.',
        Grappler: 'Wants the fight on the floor. Hunts submissions from any position and is dangerous off their back.',
        'All-Rounder': 'No glaring weakness. Reads what you give them — can box, can wrestle, can grapple.'
    }[name] || 'Mixed mixed-martial-arts approach with no obvious dead zone.';
}

function renderOfferCard(offer, index) {
    const { opponent, tier, tierLabel, campWeeks, event, locked, lockReason } = offer;
    const tokens = getTierTokens(tier);

    const portrait = renderPortraitCard({
        name: opponent.name,
        nickname: opponent.nickname,
        tier,
        countryCode: opponent.country?.code || opponent.countryCode,
        archetypeLabel: opponent.archetype.name,
        overall: opponent.overall,
        tierLabel
    });

    const eventLine = event
        ? `<strong>${escapeHtml(event.name)}</strong><br/>${escapeHtml(event.stageLabel)} · ${escapeHtml(event.location)}`
        : '<strong>No card available</strong>';

    const lockOverlay = locked
        ? `<div class="offer-card-lock">${escapeHtml(lockReason || 'Locked')}</div>`
        : '';

    return `
        <button class="offer-card"
                data-offer-index="${index}"
                data-locked="${locked ? 'true' : 'false'}"
                style="--pc-accent:${tokens.accent};--pc-glow:${tokens.glow}"
                ${locked ? 'aria-disabled="true"' : ''}>
            ${portrait}
            <div class="offer-card-meta">
                <div class="offer-card-stats">
                    <div class="cell wins"><div class="label">W</div><div class="value">${opponent.record.wins}</div></div>
                    <div class="cell losses"><div class="label">L</div><div class="value">${opponent.record.losses}</div></div>
                    <div class="cell"><div class="label">Rank</div><div class="value">${escapeHtml(getRankLabel(opponent.rank))}</div></div>
                    <div class="cell gold"><div class="label">OVR</div><div class="value">${opponent.overall}</div></div>
                </div>
                <div class="offer-card-event">${eventLine}</div>
                <div class="offer-card-camp">
                    <span><strong>${campWeeks}</strong> week camp</span>
                    <span>Purse ${formatMoney(opponent.purse)}</span>
                </div>
            </div>
            ${lockOverlay}
        </button>
    `;
}

function renderPickerPhase(offers, playerOverall) {
    const playerName = [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Your Fighter';

    return `
        <div class="picker-phase active" data-phase="picker">
            <div class="picker-eyebrow">Manager's Office · ${escapeHtml(playerName)} · OVR ${playerOverall}</div>
            <h1 class="hub-title-text">Pick your<br>opponent.</h1>
            <p class="hub-subtitle">Three options on the table. Higher tiers mean longer camps, bigger purses, and bigger risk. Locked offers open up as your reputation grows.</p>

            <div class="tier-legend">
                <span class="swatch easy">Easier match</span>
                <span class="swatch medium">Even fight</span>
                <span class="swatch hard">Step-up</span>
                <span class="swatch elite">Title contender</span>
            </div>

            <div class="offers-grid">
                ${offers.length === 0
                    ? '<p class="opponent-summary-empty">No matchups in this division yet.</p>'
                    : offers.map(renderOfferCard).join('')}
            </div>

            <div class="picker-footer">
                Click any card to review the contract terms
            </div>

            <div class="continue-bar">
                <div class="text">
                    <div class="head">Picking a fight commits you to a camp</div>
                    <p>Once you sign, the matchup, camp length, and purse are locked in. Choose carefully.</p>
                </div>
                <button class="btn ghost" id="btn-back-profile-from-opponent">Back to Hub</button>
            </div>
        </div>
    `;
}

function renderDetailPhase(offer) {
    const { opponent, event, tier, tierLabel, campWeeks, risk, locked, lockReason, contractPreview } = offer;
    const tokens = getTierTokens(tier);
    const portrait = renderPortraitCard({
        name: opponent.name,
        nickname: opponent.nickname,
        tier,
        countryCode: opponent.country?.code || opponent.countryCode,
        archetypeLabel: opponent.archetype.name,
        overall: opponent.overall,
        tierLabel
    });

    const stylePhrase = opponent.archetype.styleNote || getStyleDescription(opponent.archetype.name);
    const showMoney = contractPreview ? contractPreview.showMoney : (event?.showMoney || 0);
    const winBonus = contractPreview ? contractPreview.winBonus : (event?.winBonus || 0);

    return `
        <div class="picker-phase active" data-phase="detail">
            <div class="picker-eyebrow">Bout Agreement · ${escapeHtml(event ? event.name : 'No Event')}</div>
            <h1 class="hub-title-text">Review the<br>contract.</h1>
            <p class="hub-subtitle">Look the deal over. Camp length, payout, and risk all sit in one place. Sign to lock it in or back out and pick someone else.</p>

            <div class="detail-grid">
                <div class="detail-card opponent-side">
                    <div class="detail-portrait-wrap">${portrait}</div>
                    <div class="detail-name-banner">
                        <div class="name">${escapeHtml(opponent.name)}</div>
                        ${opponent.nickname ? `<div class="nickname">"${escapeHtml(opponent.nickname)}"</div>` : ''}
                    </div>
                    <div class="opponent-detail-stats">
                        <div class="cell"><div class="label">Record</div><div class="value">${escapeHtml(formatRecord(opponent.record))}</div></div>
                        <div class="cell"><div class="label">Rank</div><div class="value">${escapeHtml(getRankLabel(opponent.rank))}</div></div>
                        <div class="cell wins"><div class="label">Wins</div><div class="value">${opponent.record.wins}</div></div>
                        <div class="cell losses"><div class="label">Losses</div><div class="value">${opponent.record.losses}</div></div>
                        <div class="cell gold"><div class="label">Overall</div><div class="value">${opponent.overall}</div></div>
                        <div class="cell"><div class="label">Difficulty</div><div class="value">${escapeHtml(opponent.difficulty)}</div></div>
                    </div>
                    <div class="archetype-block" style="border-left-color:${tokens.accent}">
                        <div class="label" style="color:${tokens.accent}">Specialty</div>
                        <div class="style">${escapeHtml(getStyleLabel(opponent.fingerprint || {}))}</div>
                        <div class="desc">${escapeHtml(stylePhrase)}</div>
                        ${renderOpponentFingerprint(opponent.fingerprint)}
                        ${renderOpponentPersonality(opponent)}
                    </div>
                </div>

                <div class="detail-card terms-side">
                    <div class="terms-header">
                        <div class="eyebrow">Bout Agreement</div>
                        <div class="title">Fight Terms</div>
                    </div>
                    <div class="terms-body">
                        <div class="terms-row">
                            <span class="label">Promotion</span>
                            <span class="value">${escapeHtml(event ? event.name : '—')}</span>
                        </div>
                        <div class="terms-row">
                            <span class="label">Card Position</span>
                            <span class="value">${escapeHtml(event ? event.stageLabel : '—')}</span>
                        </div>
                        <div class="terms-row">
                            <span class="label">Venue</span>
                            <span class="value">${escapeHtml(event ? event.location : '—')}</span>
                        </div>
                        <div class="terms-row">
                            <span class="label">Camp Time</span>
                            <span class="value weeks">${campWeeks} <span class="unit">weeks</span></span>
                        </div>
                        <div class="terms-row">
                            <span class="label">Base Purse</span>
                            <span class="value gold">${formatMoney(showMoney)}</span>
                        </div>
                        <div class="terms-row">
                            <span class="label">Win Bonus</span>
                            <span class="value gold">${formatMoney(winBonus)}</span>
                        </div>

                        <div class="risk-indicator tier-${tier}">
                            <div class="label">Risk Assessment</div>
                            <div class="text">${escapeHtml(risk)}</div>
                        </div>

                        ${locked ? `<p class="opponent-summary-empty">${escapeHtml(lockReason)}</p>` : ''}

                        <div class="detail-actions">
                            <button class="btn-detail accept" data-offer-action="accept" ${locked ? 'disabled' : ''}>
                                Review Contract
                                <span class="sub">${campWeeks} weeks of camp</span>
                            </button>
                            <button class="btn-detail back" data-offer-action="back">
                                Back
                                <span class="sub">Other offers</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderOpponentScene() {
    syncAvailableOpponents();
    syncAvailableEvents();

    const root = document.getElementById('scene-opponent');
    if (!root) {
        return;
    }

    const offers = buildFightOffers();
    const playerOverall = getOverallAverage(state.stats);

    pickerState.offers = offers;

    if (pickerState.phase === 'detail' && pickerState.selectedOfferIndex !== null && offers[pickerState.selectedOfferIndex]) {
        root.innerHTML = renderDetailPhase(offers[pickerState.selectedOfferIndex]);
    } else {
        pickerState.phase = 'picker';
        pickerState.selectedOfferIndex = null;
        root.innerHTML = renderPickerPhase(offers, playerOverall);
    }
}

export function selectOfferByIndex(index) {
    const offer = pickerState.offers[index];
    if (!offer || offer.locked) {
        return false;
    }
    pickerState.phase = 'detail';
    pickerState.selectedOfferIndex = index;
    return true;
}

export function backToPicker() {
    pickerState.phase = 'picker';
    pickerState.selectedOfferIndex = null;
}

export function getSelectedOffer() {
    return pickerState.offers[pickerState.selectedOfferIndex] || null;
}

export function resetPickerPhase() {
    pickerState.phase = 'picker';
    pickerState.selectedOfferIndex = null;
}
