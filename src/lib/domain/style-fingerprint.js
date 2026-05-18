import { STYLES } from '../data/styles.js';

/**
 * A style fingerprint is the identity layer of a fighter: proportions
 * of disciplines that always sum to 1.0. It is NOT a list of styles
 * and NOT a stat block — those are separate concerns (attributes still
 * live in state.stats; the fingerprint lives alongside).
 *
 * Shape: { 'Boxing': 0.55, 'Wrestling': 0.30, 'Brazilian Jiu-Jitsu': 0.15 }
 *
 * Keys MUST match a Style name in src/lib/data/styles.js so the move
 * selector and dossier text can join back.
 */

const STYLE_LOOKUP = Object.fromEntries(STYLES.map(s => [s.Style, s]));

export function getStyleEntry(name) {
    return STYLE_LOOKUP[name] || null;
}

/**
 * Hybrid label thresholds — checked in order. First match wins.
 * Each rule: dominant style at >= a fraction, partner style at >= b fraction.
 * Labels favor terms real MMA analysts use over generic "X + Y" mashups.
 */
const HYBRID_RULES = [
    { dominant: 'Wrestling', dMin: 0.5, partner: 'Boxing', pMin: 0.25, label: 'Sprawl & Brawl' },
    { dominant: 'Wrestling', dMin: 0.5, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Top Grappler' },
    { dominant: 'Wrestling', dMin: 0.5, partner: 'Muay Thai', pMin: 0.25, label: 'Cage Grinder' },
    { dominant: 'Boxing', dMin: 0.5, partner: 'Wrestling', pMin: 0.25, label: 'Pressure Boxer' },
    { dominant: 'Boxing', dMin: 0.5, partner: 'Muay Thai', pMin: 0.25, label: 'Volume Striker' },
    { dominant: 'Boxing', dMin: 0.5, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Boxing-Submission Hybrid' },
    { dominant: 'Muay Thai', dMin: 0.45, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Vale Tudo Fighter' },
    { dominant: 'Muay Thai', dMin: 0.45, partner: 'Wrestling', pMin: 0.25, label: 'Clinch Specialist' },
    { dominant: 'Muay Thai', dMin: 0.45, partner: 'Boxing', pMin: 0.25, label: 'Eight-Limb Striker' },
    { dominant: 'Kickboxing', dMin: 0.45, partner: 'Wrestling', pMin: 0.25, label: 'Dutch Wrestler' },
    { dominant: 'Kickboxing', dMin: 0.45, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Kickbox-Grappler' },
    { dominant: 'Karate', dMin: 0.45, partner: 'Boxing', pMin: 0.25, label: 'Distance Striker' },
    { dominant: 'Karate', dMin: 0.45, partner: 'Brazilian Jiu-Jitsu', pMin: 0.20, label: 'Karate Grappler' },
    { dominant: 'Karate', dMin: 0.45, partner: 'Wrestling', pMin: 0.25, label: 'Blitz Wrestler' },
    { dominant: 'Tae Kwon Do', dMin: 0.45, partner: 'Boxing', pMin: 0.20, label: 'Kicker-Boxer' },
    { dominant: 'Tae Kwon Do', dMin: 0.45, partner: 'Wrestling', pMin: 0.25, label: 'Korean Wrestler' },
    { dominant: 'Sambo', dMin: 0.45, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Combat Sambist' },
    { dominant: 'Sambo', dMin: 0.45, partner: 'Boxing', pMin: 0.25, label: 'Sambo Striker' },
    { dominant: 'Brazilian Jiu-Jitsu', dMin: 0.5, partner: 'Wrestling', pMin: 0.25, label: 'Sub Hunter' },
    { dominant: 'Brazilian Jiu-Jitsu', dMin: 0.5, partner: 'Muay Thai', pMin: 0.25, label: 'BJJ Striker' },
    { dominant: 'Brazilian Jiu-Jitsu', dMin: 0.5, partner: 'Boxing', pMin: 0.25, label: 'BJJ Boxer' },
    { dominant: 'Judo', dMin: 0.45, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Judo-Submission Fighter' },
    { dominant: 'Capoeira', dMin: 0.4, partner: 'Brazilian Jiu-Jitsu', pMin: 0.25, label: 'Capoeira Grappler' },
    { dominant: 'Kyokushin', dMin: 0.45, partner: 'Boxing', pMin: 0.25, label: 'Knockdown Striker' }
];

const PURE_THRESHOLD = 0.7;

/**
 * Pure-style labels — what the analysts call someone whose game is one
 * discipline through and through.
 */
const PURE_LABELS = {
    'Wrestling': 'Pressure Wrestler',
    'Brazilian Jiu-Jitsu': 'Jiu-Jitsu Specialist',
    'Boxing': 'Pocket Boxer',
    'Muay Thai': 'Muay Thai Stylist',
    'Kickboxing': 'Dutch Kickboxer',
    'American Kickboxing': 'American Kickboxer',
    'Tae Kwon Do': 'Taekwondo Stylist',
    'Karate': 'Karate Stylist',
    'Kyokushin': 'Knockdown Karateka',
    'Sambo': 'Sambist',
    'Judo': 'Judoka',
    'Catch Wrestling': 'Catch Wrestler',
    'Jiu Jitsu': 'Jujutsu Stylist',
    'Capoeira': 'Capoeira Stylist',
    'Krav Maga': 'Krav Maga Fighter',
    'Sumo': 'Sumotori',
    'Savate': 'Savateur',
    'Kajukenbo': 'Kajukenbo Stylist',
    'Jeet Kune Do': 'JKD Practitioner',
    'Wai Wing Chun': 'Wing Chun Stylist',
    'Silat': 'Silat Stylist',
    'Bando': 'Bando Stylist',
    'Kenpo': 'Kenpo Stylist',
    'Goju Ryu': 'Goju Karateka',
    'Hsing-Yi': 'Internal Stylist',
    'Pakua': 'Internal Stylist',
    'Tai Sing Pek Kwar': 'Monkey-Style Stylist',
    'Lua': 'Lua Practitioner',
    'Dambe': 'Dambe Boxer',
    'Nuba Wrestling': 'Nuba Wrestler',
    'Kuntao': 'Kuntao Stylist',
    'African Kickfighting': 'African Kickfighter',
    'Kupigana Ngumi': 'East African Stylist',
    'Chulukua': 'Chulukua Fighter'
};

/**
 * Create a normalized fingerprint from an unweighted list or a partial map.
 */
export function createFingerprint(input) {
    if (!input) {
        return {};
    }

    if (Array.isArray(input)) {
        const map = {};
        input.forEach(name => {
            if (!getStyleEntry(name)) {
                return;
            }
            map[name] = (map[name] || 0) + 1;
        });
        return normalize(map);
    }

    const cleaned = {};
    Object.entries(input).forEach(([name, value]) => {
        if (!getStyleEntry(name) || !Number.isFinite(value) || value <= 0) {
            return;
        }
        cleaned[name] = value;
    });
    return normalize(cleaned);
}

/**
 * Normalize so values sum to 1.0. Returns a fresh object.
 */
export function normalize(fingerprint) {
    const total = Object.values(fingerprint).reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
        return {};
    }

    const out = {};
    Object.entries(fingerprint).forEach(([key, value]) => {
        const share = value / total;
        if (share > 0) {
            out[key] = share;
        }
    });
    return out;
}

/**
 * Add raw points to a fingerprint and renormalize. Used by training
 * drift — every camp session feeds points into the styles its gym
 * specializes in.
 */
export function addPoints(fingerprint, points) {
    const raw = {};
    // Reconstruct raw points so the merge is proportional rather than
    // overwriting existing percentages.
    const baseSum = 100;
    Object.entries(fingerprint).forEach(([key, share]) => {
        raw[key] = share * baseSum;
    });
    Object.entries(points).forEach(([key, value]) => {
        if (!getStyleEntry(key) || !Number.isFinite(value) || value <= 0) {
            return;
        }
        raw[key] = (raw[key] || 0) + value;
    });
    return normalize(raw);
}

/**
 * Sort entries strongest-first.
 */
export function getDominantStyles(fingerprint) {
    return Object.entries(fingerprint)
        .map(([name, share]) => ({ name, share }))
        .sort((a, b) => b.share - a.share);
}

/**
 * Get a human label: "Pure Wrestler" if dominant, hybrid label if a
 * combination matches, "Mixed Martial Artist" otherwise.
 */
export function getStyleLabel(fingerprint) {
    const dominants = getDominantStyles(fingerprint);
    if (dominants.length === 0) {
        return 'Untrained';
    }

    const top = dominants[0];
    if (top.share >= PURE_THRESHOLD) {
        return PURE_LABELS[top.name] || top.name;
    }

    for (const rule of HYBRID_RULES) {
        const d = fingerprint[rule.dominant] || 0;
        const p = fingerprint[rule.partner] || 0;
        if (d >= rule.dMin && p >= rule.pMin) {
            return rule.label;
        }
    }

    if (top.share >= 0.5) {
        // Fall back to the pure label without the "Pure" prefix when the
        // dominant style is over half but no specific hybrid rule matched.
        return PURE_LABELS[top.name] || `${top.name} Stylist`;
    }

    return 'Well-Rounded MMA';
}

/**
 * Tight one-line dossier from a fingerprint. Used for opponent scouting.
 */
export function getStyleDossier(fingerprint) {
    const dominants = getDominantStyles(fingerprint).slice(0, 3);
    if (dominants.length === 0) {
        return 'No tape yet — style profile unknown.';
    }
    const parts = dominants.map(({ name, share }) => `${name} ${Math.round(share * 100)}%`);
    return parts.join(' · ');
}

/**
 * Color palette per style for the fingerprint bar visualization.
 * Falls back to a hash-based color for unmapped styles so every style
 * still renders distinctly.
 */
const STYLE_COLORS = {
    'Boxing': '#e21d36',
    'Muay Thai': '#f59e0b',
    'Kickboxing': '#fb923c',
    'American Kickboxing': '#f87171',
    'Karate': '#fcd34d',
    'Kyokushin': '#facc15',
    'Tae Kwon Do': '#22d3ee',
    'Savate': '#a78bfa',
    'Wrestling': '#2563eb',
    'Sambo': '#3b82f6',
    'Catch Wrestling': '#60a5fa',
    'Judo': '#7c3aed',
    'Jiu Jitsu': '#9333ea',
    'Brazilian Jiu-Jitsu': '#a855f7',
    'Sumo': '#475569',
    'Capoeira': '#34d399',
    'Krav Maga': '#10b981',
    'Kajukenbo': '#14b8a6',
    'Jeet Kune Do': '#06b6d4',
    'Silat': '#84cc16',
    'Bando': '#ca8a04',
    'Kenpo': '#dc2626',
    'Goju Ryu': '#eab308',
    'Wai Wing Chun': '#0ea5e9',
    'Hsing-Yi': '#8b5cf6',
    'Pakua': '#c084fc',
    'Tai Sing Pek Kwar': '#f472b6',
    'Lua': '#fb7185',
    'Dambe': '#facc15',
    'Nuba Wrestling': '#1d4ed8',
    'Kuntao': '#65a30d',
    'African Kickfighting': '#fbbf24',
    'Kupigana Ngumi': '#d97706',
    'Chulukua': '#b45309'
};

export function getStyleColor(name) {
    if (STYLE_COLORS[name]) {
        return STYLE_COLORS[name];
    }
    // Hash-based fallback so unmapped styles still get a deterministic color.
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    }
    return `hsl(${hash % 360}, 60%, 55%)`;
}
