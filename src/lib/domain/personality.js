/**
 * Fighter personality — the social/mental layer separate from fight
 * attributes. Drives interview behavior, rivalry formation, walkout
 * energy, and post-fight reactions. Lives on every fighter (player +
 * roster NPCs).
 *
 * Fields are all 0-100. They are NOT mutually exclusive — a fighter
 * can be both confident AND respectful (Holloway), or both humble AND
 * trash-talking (rare but real).
 */

export const PERSONALITY_FIELDS = {
    confidence: 'Self-belief on the mic and in the cage',
    trashTalk: 'How much they run their mouth before fights',
    humility: 'How gracious in win and loss',
    respect: 'How they treat opponents publicly',
    showmanship: 'Walkouts, celebrations, playing the crowd',
    vendetta: 'How hard they hold a grudge across fights'
};

/**
 * Archetype-flavored base personality. Each archetype skews differently
 * — boxers tend to talk more, wrestlers to grind quietly, grapplers to
 * stay humble. NPC generator adds jitter on top so two boxers don't
 * read identical.
 */
const ARCHETYPE_BASE = {
    boxer: { confidence: 75, trashTalk: 55, humility: 40, respect: 55, showmanship: 60, vendetta: 50 },
    kickboxer: { confidence: 70, trashTalk: 40, humility: 55, respect: 65, showmanship: 65, vendetta: 40 },
    wrestler: { confidence: 78, trashTalk: 35, humility: 50, respect: 60, showmanship: 40, vendetta: 55 },
    grappler: { confidence: 60, trashTalk: 25, humility: 70, respect: 75, showmanship: 35, vendetta: 30 },
    'all-rounder': { confidence: 65, trashTalk: 30, humility: 65, respect: 70, showmanship: 50, vendetta: 35 }
};

function clamp(value, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, value));
}

function jitter(value, range = 20, rng = Math.random) {
    return clamp(Math.round(value + (rng() - 0.5) * range * 2));
}

export function getArchetypeBasePersonality(archetypeKey) {
    return ARCHETYPE_BASE[archetypeKey] || ARCHETYPE_BASE['all-rounder'];
}

/**
 * Generate a personality from an archetype key with random jitter so
 * two fighters with the same archetype feel different.
 */
export function generatePersonality(archetypeKey, rng = Math.random) {
    const base = getArchetypeBasePersonality(archetypeKey);
    return {
        confidence: jitter(base.confidence, 15, rng),
        trashTalk: jitter(base.trashTalk, 25, rng),
        humility: jitter(base.humility, 20, rng),
        respect: jitter(base.respect, 18, rng),
        showmanship: jitter(base.showmanship, 22, rng),
        vendetta: jitter(base.vendetta, 25, rng)
    };
}

/**
 * Default player personality when they first reach the hub. Skewed
 * neutral — players reveal their personality through their answers.
 */
export function createPlayerDefaultPersonality(archetypeKey) {
    return getArchetypeBasePersonality(archetypeKey);
}

/**
 * Build a short tag line describing the personality. Used for opponent
 * scouting dossiers and the player's hub readout.
 */
export function getPersonalityTag(personality) {
    if (!personality) return 'Unknown personality';

    const tags = [];
    if (personality.trashTalk >= 70) tags.push('Talker');
    else if (personality.trashTalk <= 25 && personality.humility >= 60) tags.push('Quiet pro');
    if (personality.vendetta >= 70) tags.push('Holds grudges');
    if (personality.showmanship >= 70) tags.push('Showman');
    if (personality.respect >= 75 && personality.humility >= 60) tags.push('Sportsman');
    if (personality.confidence >= 80) tags.push('Brash');
    else if (personality.confidence <= 35) tags.push('Self-doubting');

    return tags.length === 0 ? 'Balanced personality' : tags.join(' · ');
}

/**
 * Mood selection for an opponent reacting to the player's answer in a
 * press conference. Replaces the old archetype-only lookup with
 * per-fighter personality.
 */
export function selectOpponentMood({ personality, topic, playerMood, rivalryTension = 0, rng = Math.random }) {
    if (!personality) {
        return 'composed';
    }

    const heatedTopics = topic === 'beef' || topic === 'callout' || topic === 'opponent_threat';
    const playerProvoked = playerMood === 'trash' || playerMood === 'hostile';

    // Rivalry tension elevates the chance of a hostile reply — past
    // beef makes every question feel like a callout.
    const heat = rivalryTension / 100;

    if (heatedTopics || playerProvoked) {
        if (personality.trashTalk > 60 || (heat > 0.4 && personality.vendetta > 50)) {
            return rng() < 0.6 ? 'hostile' : 'trash';
        }
        if (personality.respect > 70) {
            return 'composed';
        }
        return 'defensive';
    }

    // Non-confrontational topics: weight by personality.
    const sum = personality.confidence + personality.humility + personality.trashTalk + personality.respect;
    const r = rng() * sum;
    if (r < personality.trashTalk) return 'trash';
    if (r < personality.trashTalk + personality.confidence) return 'confident';
    if (r < personality.trashTalk + personality.confidence + personality.humility) return 'humble';
    return 'respectful';
}
