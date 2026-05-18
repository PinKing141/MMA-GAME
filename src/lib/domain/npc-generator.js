import { STYLES } from '../data/styles.js';
import { COUNTRIES } from '../data/countries.js';
import { createFingerprint } from './style-fingerprint.js';

/**
 * Map a fighter's country (from our 2-letter ISO data) to country names
 * styles.csv uses ("USA", "Russia", "South Korea", etc).
 */
const ISO_TO_STYLE_COUNTRY = {
    US: 'USA',
    RU: 'Russia',
    BR: 'Brazil',
    JP: 'Japan',
    KR: 'South Korea',
    TH: 'Thailand',
    NL: 'Netherlands',
    FR: 'France',
    NG: 'Nigeria',
    ID: 'Indonesia',
    MM: 'Myanmar',
    CN: 'China',
    MG: 'Madagascar',
    TZ: 'Tanzania',
    KE: 'Kenya',
    IL: 'Israel',
    SD: 'Sudan',
    DAG: 'Russia',
    CHE: 'Russia'
};

function getStyleCountryFromIso(iso) {
    return ISO_TO_STYLE_COUNTRY[iso] || null;
}

/**
 * Region mapping — every country in our COUNTRIES list maps to one of the
 * regions used by styles.csv. Falls back to "North America" for unknowns.
 */
const REGION_BY_ISO = {
    US: 'North America', CA: 'North America', MX: 'North America',
    BR: 'South America', AR: 'South America', CO: 'South America', CL: 'South America', PE: 'South America', VE: 'South America', EC: 'South America', UY: 'South America', CU: 'South America', DO: 'South America', PR: 'South America', JM: 'South America', PA: 'South America',
    GB: 'Europe', IE: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Europe', NL: 'Europe', BE: 'Europe', CH: 'Europe',
    RU: 'Eastern Europe', PL: 'Eastern Europe', UA: 'Eastern Europe', CZ: 'Eastern Europe', HU: 'Eastern Europe', RO: 'Eastern Europe', BG: 'Eastern Europe', GR: 'Eastern Europe',
    DAG: 'Eastern Europe', CHE: 'Eastern Europe',
    SE: 'Europe', NO: 'Europe', DK: 'Europe', FI: 'Europe', IS: 'Europe',
    JP: 'East Asia', KR: 'East Asia', CN: 'East Asia', TW: 'East Asia', HK: 'East Asia', MN: 'East Asia',
    TH: 'Southeast Asia', VN: 'Southeast Asia', PH: 'Southeast Asia', MY: 'Southeast Asia', ID: 'Southeast Asia', SG: 'Southeast Asia', MM: 'Southeast Asia',
    IL: 'Middle East', SA: 'Middle East', AE: 'Middle East', TR: 'Middle East', IR: 'Middle East', EG: 'Middle East',
    NG: 'Africa', GH: 'Africa', KE: 'Africa', TZ: 'Africa', ZA: 'Africa', MA: 'Africa', SD: 'Africa', ET: 'Africa', MG: 'Africa',
    AU: 'Pacific', NZ: 'Pacific'
};

function getRegionFromIso(iso) {
    return REGION_BY_ISO[iso] || 'North America';
}

/**
 * Score how likely a style is to be picked by a fighter from a country.
 *
 * Country match (exact) >> region match >> region-locked exclusion.
 * MMA Fit boosts likelihood proportionally (high-fit styles dominate
 * the talent pool). Rarity reduces likelihood (rare styles appear less
 * often).
 */
function scoreStyle(style, iso, rng) {
    const isCountryMatch = style.Country === getStyleCountryFromIso(iso);
    const isRegionMatch = style.Region === getRegionFromIso(iso);

    if (style['Region Lock'] && !isCountryMatch && !isRegionMatch) {
        return 0;
    }

    let base = 1;
    if (isCountryMatch) base = 8;
    else if (isRegionMatch) base = 3;

    const fit = (style['MMA Fit'] || 1) / 5;
    const rarityPenalty = 1 / ((style.Rarity || 1) ** 1.2);

    // A little jitter so two NPCs from the same country don't always pick
    // the same trio.
    const jitter = 0.6 + rng() * 0.8;

    return base * fit * rarityPenalty * jitter;
}

function weightedPick(items, scoreFn, rng) {
    const scored = items.map(item => ({ item, score: scoreFn(item) })).filter(s => s.score > 0);
    if (scored.length === 0) return null;
    const total = scored.reduce((sum, s) => sum + s.score, 0);
    let cursor = rng() * total;
    for (const s of scored) {
        cursor -= s.score;
        if (cursor <= 0) {
            return s.item;
        }
    }
    return scored[scored.length - 1].item;
}

/**
 * Generate a style fingerprint for an NPC from their country.
 *
 * @param {object} opts
 * @param {string} opts.countryCode  ISO 2/3 letter code.
 * @param {number} [opts.styleCount] How many styles to roll. Default 2.
 * @param {Function} [opts.rng]      RNG source.
 */
export function generateFingerprintForCountry({ countryCode, styleCount = 2, rng = Math.random } = {}) {
    const picked = [];
    const seen = new Set();

    for (let attempt = 0; attempt < styleCount * 5 && picked.length < styleCount; attempt += 1) {
        const candidate = weightedPick(
            STYLES.filter(s => !seen.has(s.Style)),
            style => scoreStyle(style, countryCode, rng),
            rng
        );
        if (!candidate) break;
        picked.push(candidate);
        seen.add(candidate.Style);
    }

    if (picked.length === 0) {
        return createFingerprint(['Wrestling', 'Boxing']);
    }

    // Distribute weight: first pick gets the lion's share, subsequent
    // picks get diminishing slices. Adds character authenticity without
    // every fighter being a 50/50 split.
    const raw = {};
    const baseWeights = [60, 30, 15, 8, 4];
    picked.forEach((style, idx) => {
        const jitter = 0.85 + rng() * 0.3;
        raw[style.Style] = (baseWeights[idx] || 4) * jitter;
    });

    return createFingerprint(raw);
}

/**
 * Generate a fingerprint biased by both country AND an existing archetype.
 * Used when we want to keep the current archetype identity (Boxer, Wrestler,
 * etc.) but flavor it with country-specific style mix.
 */
export function generateFingerprintForArchetype({ countryCode, archetypeKey, rng = Math.random } = {}) {
    const seedByArchetype = {
        boxer: { Boxing: 60 },
        kickboxer: { Kickboxing: 45, 'Muay Thai': 15 },
        wrestler: { Wrestling: 55 },
        grappler: { 'Brazilian Jiu-Jitsu': 55 },
        'all-rounder': {}
    };

    // Force this style to be the dominant pick for the archetype, but
    // still pull a country-flavored partner to make NPCs from the same
    // archetype feel different.
    const partner = generateFingerprintForCountry({
        countryCode,
        styleCount: 2,
        rng
    });

    const raw = { ...seedByArchetype[archetypeKey] };
    Object.entries(partner).forEach(([key, share]) => {
        if (!raw[key]) {
            raw[key] = share * 35;
        }
    });

    if (Object.keys(raw).length === 0) {
        return partner;
    }
    return createFingerprint(raw);
}

export function getAllStylesForCountry(countryCode) {
    return STYLES.filter(s => {
        const country = getStyleCountryFromIso(countryCode);
        const region = getRegionFromIso(countryCode);
        if (s['Region Lock']) {
            return s.Country === country || s.Region === region;
        }
        return true;
    });
}

export function getCountryFromIso(iso) {
    const country = COUNTRIES.find(c => c.code === iso);
    return country?.name || iso;
}
