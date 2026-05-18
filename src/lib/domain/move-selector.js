import { STYLE_MOVES } from '../data/style-moves.js';
import { STYLES } from '../data/styles.js';

const STYLE_LOOKUP = Object.fromEntries(STYLES.map(s => [s.Style, s]));

/**
 * Pre-index moves by range for O(1) range queries. Loaded once.
 */
const MOVES_BY_RANGE = STYLE_MOVES.reduce((map, move) => {
    const key = move.Range || 'Mid';
    if (!map[key]) map[key] = [];
    map[key].push(move);
    return map;
}, {});

/**
 * Pre-index moves by style for the dossier "what does this fighter do" view.
 */
const MOVES_BY_STYLE = STYLE_MOVES.reduce((map, move) => {
    if (!map[move.Style]) map[move.Style] = [];
    map[move.Style].push(move);
    return map;
}, {});

export const VALID_RANGES = ['Long', 'Mid', 'Close', 'Clinch', 'Ground'];

/**
 * Returns all moves at the given range across all styles. Used as the
 * raw pool for `pickMove` to weight against a fingerprint.
 */
export function getMovesAtRange(range) {
    return MOVES_BY_RANGE[range] || [];
}

export function getMovesForStyle(styleName) {
    return MOVES_BY_STYLE[styleName] || [];
}

/**
 * Weighted random range pick for a fighter based on their style
 * fingerprint. Each style's Primary Range gets full weight, Secondary
 * Range gets half — so a Wrestler-heavy fingerprint preferentially
 * sits at Clinch / Close, a Karate-heavy fighter at Long / Mid.
 */
export function pickRange({ fingerprint, modifiers = {}, rng = Math.random }) {
    const buckets = {};
    Object.entries(fingerprint || {}).forEach(([styleName, share]) => {
        const entry = STYLE_LOOKUP[styleName];
        if (!entry || share <= 0) return;
        const primary = entry['Primary Range'];
        const secondary = entry['Secondary Range'];
        if (primary) buckets[primary] = (buckets[primary] || 0) + share;
        if (secondary) buckets[secondary] = (buckets[secondary] || 0) + share * 0.5;
    });

    // Wrestler intent forces transitions toward Clinch / Ground when
    // the aggressor wants to grapple.
    if (modifiers.wantsGrapple) {
        buckets.Clinch = (buckets.Clinch || 0) + 0.6;
        buckets.Ground = (buckets.Ground || 0) + 0.4;
    }
    if (modifiers.wantsDistance) {
        buckets.Long = (buckets.Long || 0) + 0.5;
        buckets.Mid = (buckets.Mid || 0) + 0.3;
    }

    const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);
    if (total <= 0) return 'Mid';

    let cursor = rng() * total;
    for (const [range, weight] of Object.entries(buckets)) {
        cursor -= weight;
        if (cursor <= 0) return range;
    }
    return 'Mid';
}

/**
 * Build the weighted move pool for a fighter at a given range.
 *
 * Each move's selection weight is the fighter's proportion of that
 * move's style. A move from a style the fighter doesn't train (0%)
 * gets weight 0 and never appears. A move from a style the fighter
 * trains heavily (e.g. 0.6) appears with weight 0.6.
 *
 * Context modifiers (optional):
 *  - `hurt: true` halves the weight of high-risk moves
 *  - `winning: true` halves the weight of high-risk moves and boosts
 *    low-risk control moves
 *  - `aggression: 0..1` biases toward higher-Power moves
 */
export function buildWeightedPool({ fingerprint, range, modifiers = {} }) {
    const moves = getMovesAtRange(range);
    if (moves.length === 0) {
        return [];
    }

    const aggression = Number.isFinite(modifiers.aggression) ? modifiers.aggression : 0.5;
    const hurt = Boolean(modifiers.hurt);
    const winning = Boolean(modifiers.winning);

    const weighted = [];
    moves.forEach(move => {
        const styleShare = fingerprint[move.Style] || 0;
        if (styleShare <= 0) {
            return;
        }

        let weight = styleShare;

        // Risk dampening for hurt / winning fighters.
        const risk = Number(move.Risk) || 0;
        if (hurt && risk >= 4) {
            weight *= 0.4;
        } else if (winning && risk >= 4) {
            weight *= 0.6;
        }

        // Aggression bias on Power. Low aggression pulls power down toward
        // a flat average; high aggression rewards heavy power.
        const power = Number(move.Power) || 0;
        weight *= 0.7 + (aggression * (power / 5) * 0.6);

        if (weight > 0) {
            weighted.push({ move, weight });
        }
    });

    return weighted;
}

/**
 * Weighted-random pick from a weighted pool. Returns null if the pool
 * is empty.
 */
export function sampleWeighted(weighted, rng = Math.random) {
    if (!weighted || weighted.length === 0) {
        return null;
    }
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) {
        return weighted[0].move;
    }
    let cursor = rng() * total;
    for (const entry of weighted) {
        cursor -= entry.weight;
        if (cursor <= 0) {
            return entry.move;
        }
    }
    return weighted[weighted.length - 1].move;
}

/**
 * Public API. Returns a move appropriate for the fighter at the range.
 */
export function pickMove({ fingerprint, range, modifiers, rng = Math.random }) {
    const pool = buildWeightedPool({ fingerprint, range, modifiers });
    return sampleWeighted(pool, rng);
}

/**
 * Plain-text commentary for a move. Used for play-by-play and dossier
 * lines like "Adesina rips a Tae Tat — classic Muay Thai shin to the ribs."
 */
export function describeMove(move, fighterName) {
    if (!move) {
        return `${fighterName || 'The fighter'} circles out, looking for an opening.`;
    }
    const noteFragment = move.Notes ? ` — ${move.Notes.toLowerCase()}` : '';
    const verb = pickVerb(move);
    return `${fighterName || 'The fighter'} ${verb} ${move.Move}${noteFragment}.`;
}

function pickVerb(move) {
    const type = (move.Type || '').toLowerCase();
    switch (type) {
        case 'punch': return 'rips';
        case 'kick': return 'whips';
        case 'knee': return 'drives';
        case 'elbow': return 'cuts with';
        case 'takedown': return 'shoots';
        case 'throw': return 'launches';
        case 'submission': return 'attacks with';
        case 'sweep': return 'sweeps with';
        case 'defense': return 'reads with';
        case 'control': return 'locks down with';
        case 'clinch': return 'clinches with';
        case 'headbutt': return 'lands';
        default: return 'lands';
    }
}
