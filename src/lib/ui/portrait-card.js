import { getCountryFlagSrc } from '../data/countries.js';

const TIER_TOKENS = {
    easy: {
        accent: '#16a34a',
        glow: 'rgba(22, 163, 74, 0.42)',
        bgTop: '#1c2a20',
        stamp: 'Easier Match'
    },
    medium: {
        accent: '#f0c850',
        glow: 'rgba(212, 175, 55, 0.45)',
        bgTop: '#2a261c',
        stamp: 'Even Fight'
    },
    hard: {
        accent: '#e21d36',
        glow: 'rgba(225, 29, 54, 0.5)',
        bgTop: '#2a1c20',
        stamp: 'Tougher Match'
    },
    elite: {
        accent: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.45)',
        bgTop: '#261c2a',
        stamp: 'Title Contender'
    },
    player: {
        accent: '#f0c850',
        glow: 'rgba(212, 175, 55, 0.4)',
        bgTop: '#1c1c26',
        stamp: 'Your Fighter'
    }
};

export function getTierTokens(tier) {
    return TIER_TOKENS[tier] || TIER_TOKENS.medium;
}

function getInitials(fullName) {
    if (!fullName) {
        return '—';
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '—';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Render a stylised portrait card for a fighter.
 * Uses initials + archetype-colored gradient instead of SVG silhouette.
 *
 * @param {object} params
 * @param {string} params.name
 * @param {string} [params.nickname]
 * @param {string} [params.tier]              easy | medium | hard | elite | player
 * @param {string} [params.countryCode]
 * @param {string} [params.archetypeLabel]    e.g. "Wrestler" — flavored archetype name
 * @param {string} [params.tierLabel]         overrides default tier stamp
 * @param {number} [params.overall]
 */
export function renderPortraitCard(params) {
    const tier = params.tier || 'medium';
    const tokens = getTierTokens(tier);
    const initials = getInitials(params.name);
    const flagSrc = params.countryCode ? getCountryFlagSrc(params.countryCode) : '';
    const flag = flagSrc
        ? `<span class="portrait-card-flag"><img src="${flagSrc}" alt="${escapeHtml(params.countryCode || '')} flag" loading="lazy"/>${escapeHtml((params.countryCode || '').toUpperCase())}</span>`
        : '';

    const style = [
        `--pc-accent:${tokens.accent}`,
        `--pc-glow:${tokens.glow}`,
        `--pc-bg-top:${tokens.bgTop}`
    ].join(';');

    const overallBadge = Number.isFinite(params.overall)
        ? `<div class="portrait-card-ovr"><div class="label">OVR</div><div class="value">${params.overall}</div></div>`
        : '';

    return `
        <div class="portrait-card" style="${style}">
            <div class="portrait-card-top">
                <span class="portrait-card-tier">${escapeHtml(params.tierLabel || tokens.stamp)}</span>
                ${flag}
            </div>
            <div class="portrait-card-monogram">
                <div class="initials">${escapeHtml(initials)}</div>
                ${params.archetypeLabel ? `<div class="style-stamp">${escapeHtml(params.archetypeLabel)}</div>` : ''}
            </div>
            ${overallBadge}
            <div class="portrait-card-bottom">
                <div class="name">${escapeHtml(params.name || 'Unknown')}</div>
                ${params.nickname ? `<div class="nickname">"${escapeHtml(params.nickname)}"</div>` : ''}
            </div>
        </div>
    `;
}
