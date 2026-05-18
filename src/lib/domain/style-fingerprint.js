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
 * Specialty label = the discipline a fighter is most adept at. The
 * fingerprint percentages underneath show the full mix; this label
 * names the spine. We use the discipline name itself, not a "Wrestler"
 * agent noun, because every fighter in MMA mixes — "Specialty:
 * Wrestling" reads cleaner than "He's a wrestler" without the
 * one-trick-pony implication.
 */
const SPECIALTY_LABELS = {
    'Wrestling': 'Wrestling',
    'Brazilian Jiu-Jitsu': 'Brazilian Jiu-Jitsu',
    'Boxing': 'Boxing',
    'Muay Thai': 'Muay Thai',
    'Kickboxing': 'Kickboxing',
    'American Kickboxing': 'American Kickboxing',
    'Tae Kwon Do': 'Tae Kwon Do',
    'Karate': 'Karate',
    'Kyokushin': 'Kyokushin Karate',
    'Sambo': 'Sambo',
    'Judo': 'Judo',
    'Catch Wrestling': 'Catch Wrestling',
    'Jiu Jitsu': 'Japanese Jujutsu',
    'Capoeira': 'Capoeira',
    'Krav Maga': 'Krav Maga',
    'Sumo': 'Sumo',
    'Savate': 'Savate',
    'Kajukenbo': 'Kajukenbo',
    'Jeet Kune Do': 'Jeet Kune Do',
    'Wai Wing Chun': 'Wing Chun',
    'Silat': 'Silat',
    'Bando': 'Bando',
    'Kenpo': 'Kenpo',
    'Goju Ryu': 'Goju Ryu Karate',
    'Hsing-Yi': 'Hsing-Yi',
    'Pakua': 'Pakua',
    'Tai Sing Pek Kwar': 'Monkey Kung Fu',
    'Lua': 'Lua',
    'Dambe': 'Dambe',
    'Nuba Wrestling': 'Nuba Wrestling',
    'Kuntao': 'Kuntao',
    'African Kickfighting': 'African Kickfighting',
    'Kupigana Ngumi': 'Kupigana Ngumi',
    'Chulukua': 'Chulukua'
};

/**
 * Historical named hybrid styles — when a specific combination has its
 * own well-known name in MMA history, use it instead of the dominant
 * style's name. Vale Tudo describes a Brazilian striker-grappler
 * tradition; Combat Sambo is a recognized Russian discipline.
 */
const NAMED_HYBRIDS = [
    { primary: 'Muay Thai', secondary: 'Brazilian Jiu-Jitsu', label: 'Vale Tudo' },
    { primary: 'Brazilian Jiu-Jitsu', secondary: 'Muay Thai', label: 'Vale Tudo' },
    { primary: 'Sambo', secondary: 'Brazilian Jiu-Jitsu', label: 'Combat Sambo' }
];

const HYBRID_THRESHOLD_DOMINANT = 0.4;
const HYBRID_THRESHOLD_PARTNER = 0.3;
const PURE_THRESHOLD = 0.55;

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
    const second = dominants[1];

    // Check historical named hybrids first — these only fire when both
    // styles are reasonably balanced (a 50/30 split fits, an 80/15
    // does not).
    if (second && top.share >= HYBRID_THRESHOLD_DOMINANT && second.share >= HYBRID_THRESHOLD_PARTNER) {
        const named = NAMED_HYBRIDS.find(
            rule => rule.primary === top.name && rule.secondary === second.name
        );
        if (named) {
            return named.label;
        }
    }

    // Otherwise just name the spine. The percentage bar underneath
    // shows the rest of the mix.
    if (top.share >= PURE_THRESHOLD || (top.share >= HYBRID_THRESHOLD_DOMINANT && !second)) {
        return SPECIALTY_LABELS[top.name] || top.name;
    }

    if (top.share >= HYBRID_THRESHOLD_DOMINANT) {
        return SPECIALTY_LABELS[top.name] || top.name;
    }

    return 'Mixed Background';
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
