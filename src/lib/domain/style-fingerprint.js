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
 * Single-word labels for a fighter dominant in one discipline. These
 * are the words MMA fans actually use — "He's a wrestler", "She's a
 * boxer", "He's a karateka". No flavor descriptors, no marketing tags.
 */
const PURE_LABELS = {
    'Wrestling': 'Wrestler',
    'Brazilian Jiu-Jitsu': 'Jiu-Jitsu Black Belt',
    'Boxing': 'Boxer',
    'Muay Thai': 'Muay Thai Fighter',
    'Kickboxing': 'Kickboxer',
    'American Kickboxing': 'Kickboxer',
    'Tae Kwon Do': 'Taekwondo Fighter',
    'Karate': 'Karateka',
    'Kyokushin': 'Kyokushin Karateka',
    'Sambo': 'Sambist',
    'Judo': 'Judoka',
    'Catch Wrestling': 'Catch Wrestler',
    'Jiu Jitsu': 'Jujutsu Fighter',
    'Capoeira': 'Capoeirista',
    'Krav Maga': 'Krav Maga Fighter',
    'Sumo': 'Sumotori',
    'Savate': 'Savateur',
    'Kajukenbo': 'Kajukenbo Fighter',
    'Jeet Kune Do': 'JKD Fighter',
    'Wai Wing Chun': 'Wing Chun Fighter',
    'Silat': 'Silat Fighter',
    'Bando': 'Bando Fighter',
    'Kenpo': 'Kenpo Fighter',
    'Goju Ryu': 'Goju Karateka',
    'Hsing-Yi': 'Hsing-Yi Fighter',
    'Pakua': 'Pakua Fighter',
    'Tai Sing Pek Kwar': 'Monkey-Style Fighter',
    'Lua': 'Lua Fighter',
    'Dambe': 'Dambe Boxer',
    'Nuba Wrestling': 'Nuba Wrestler',
    'Kuntao': 'Kuntao Fighter',
    'African Kickfighting': 'African Kickfighter',
    'Kupigana Ngumi': 'Kupigana Fighter',
    'Chulukua': 'Chulukua Fighter'
};

/**
 * Short-noun aliases used when building hybrid labels — "Wrestler-Boxer",
 * "Karate-Wrestler", etc. The dominant style appears first.
 */
const HYBRID_TOKEN = {
    'Wrestling': 'Wrestler',
    'Brazilian Jiu-Jitsu': 'Grappler',
    'Boxing': 'Boxer',
    'Muay Thai': 'Muay Thai',
    'Kickboxing': 'Kickboxer',
    'American Kickboxing': 'Kickboxer',
    'Tae Kwon Do': 'Taekwondo',
    'Karate': 'Karate',
    'Kyokushin': 'Kyokushin',
    'Sambo': 'Sambo',
    'Judo': 'Judoka',
    'Catch Wrestling': 'Catch Wrestler',
    'Jiu Jitsu': 'Jujutsu',
    'Capoeira': 'Capoeirista',
    'Savate': 'Savateur',
    'Kajukenbo': 'Kajukenbo',
    'Jeet Kune Do': 'JKD',
    'Wai Wing Chun': 'Wing Chun',
    'Silat': 'Silat',
    'Bando': 'Bando',
    'Kenpo': 'Kenpo',
    'Goju Ryu': 'Goju',
    'Sumo': 'Sumotori',
    'Krav Maga': 'Krav Maga',
    'Dambe': 'Dambe',
    'Nuba Wrestling': 'Nuba Wrestler',
    'African Kickfighting': 'Kickfighter'
};

/**
 * Hybrid rules. Most labels follow "Dominant-Partner" with agent nouns
 * (Wrestler-Boxer, Karate-Wrestler), built dynamically from HYBRID_TOKEN.
 * Real-world historical names override where they exist (Vale Tudo,
 * Combat Sambo) so the label sounds like something a fan would say.
 */
const HYBRID_OVERRIDES = [
    { dominant: 'Muay Thai', partner: 'Brazilian Jiu-Jitsu', label: 'Vale Tudo Fighter' },
    { dominant: 'Sambo', partner: 'Brazilian Jiu-Jitsu', label: 'Combat Sambo Fighter' },
    { dominant: 'Boxing', partner: 'Muay Thai', label: 'Striker' },
    { dominant: 'Muay Thai', partner: 'Boxing', label: 'Striker' },
    { dominant: 'Kickboxing', partner: 'Muay Thai', label: 'Striker' },
    { dominant: 'Muay Thai', partner: 'Kickboxing', label: 'Striker' },
    { dominant: 'Brazilian Jiu-Jitsu', partner: 'Wrestling', label: 'Grappler' },
    { dominant: 'Wrestling', partner: 'Brazilian Jiu-Jitsu', label: 'Grappler' }
];

const HYBRID_THRESHOLD_DOMINANT = 0.45;
const HYBRID_THRESHOLD_PARTNER = 0.25;
const PURE_THRESHOLD = 0.7;

function buildHybridLabel(dominantName, partnerName) {
    const override = HYBRID_OVERRIDES.find(
        rule => rule.dominant === dominantName && rule.partner === partnerName
    );
    if (override) {
        return override.label;
    }
    const dToken = HYBRID_TOKEN[dominantName] || dominantName;
    const pToken = HYBRID_TOKEN[partnerName] || partnerName;
    if (dToken === pToken) {
        return dToken;
    }
    return `${dToken}-${pToken}`;
}

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

    const second = dominants[1];
    if (top.share >= HYBRID_THRESHOLD_DOMINANT && second && second.share >= HYBRID_THRESHOLD_PARTNER) {
        return buildHybridLabel(top.name, second.name);
    }

    if (top.share >= 0.5) {
        // Dominant style over half but no meaningful partner — just call
        // them by their dominant identity, no robotic "Stylist" suffix.
        return PURE_LABELS[top.name] || top.name;
    }

    return 'Well-Rounded Fighter';
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
