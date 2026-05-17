/*
 * Style flavor — show only the fighter's PRIMARY archetype, with a one-line
 * flavor note about what they've layered on top.
 *
 * The user direction: don't print compound labels like "Boxer Wrestler".
 * Print "Wrestler" and let the flavor line describe the cross-training:
 *   "Wrestler — sharpened jab work in regional camps."
 */

const STYLE_FLAVORS_BY_PRIMARY = {
    boxer: {
        kickboxer: 'Picked up southpaw kicks in regional camps.',
        wrestler:  'Added a thudding double-leg to keep brawls honest.',
        grappler:  'Drilled defensive ground game to stay standing.',
        'all-rounder': 'Rounded the toolkit with some MMA grappling drills.'
    },
    kickboxer: {
        boxer:    'Tightened the hands during a season in a boxing gym.',
        wrestler: 'Added enough takedown defense to stay vertical.',
        grappler: 'Studied submission defense after a bad night on the mat.',
        'all-rounder': 'Cross-trained the gaps to round out a striker base.'
    },
    wrestler: {
        boxer:    'Sharpened the hands in boxing camps for the hand-fight.',
        kickboxer: 'Worked clinch kicks to set up the level change.',
        grappler: 'Took to BJJ once the top control was easy.',
        'all-rounder': 'Filled in every striking gap a wrestler usually shows.'
    },
    grappler: {
        boxer:    'Polished pocket boxing to bait the level change.',
        kickboxer: 'Picked up long-range kicks to close distance.',
        wrestler: 'Hardened the wrestling base before chasing submissions.',
        'all-rounder': 'Built a striking shell around the submission game.'
    },
    'all-rounder': {
        boxer:    'Spent recent camps deepening the boxing game.',
        kickboxer: 'Has been touching up the kicking arsenal lately.',
        wrestler: 'Has been drilling takedowns hard between fights.',
        grappler: 'Has been chasing submission tape every camp.'
    }
};

const DEFAULT_FLAVOR = 'Stays inside their primary style and earns rounds with it.';

function pickSecondary(stats, primaryKey) {
    if (!stats) return null;

    const totals = {
        boxer: (stats.punchSpeed || 0) + (stats.punchPower || 0) + (stats.headMovement || 0) + (stats.accuracy || 0),
        kickboxer: (stats.kickSpeed || 0) + (stats.kickPower || 0) + (stats.footwork || 0) + (stats.switchStance || 0),
        wrestler: (stats.takedownOffense || 0) + (stats.clinchOffense || 0) + (stats.topControl || 0) + (stats.takedownDefense || 0),
        grappler: (stats.submissionOffense || 0) + (stats.jointSubmission || 0) + (stats.chokeSubmission || 0) + (stats.grappleSpeed || 0),
        'all-rounder': (stats.fightIQ || 0) + (stats.composure || 0) + (stats.cardio || 0) + (stats.cunning || 0)
    };

    delete totals[primaryKey];

    return Object.entries(totals).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
}

export function describeFighterStyle(primaryArchetype, stats) {
    const primaryKey = primaryArchetype?.key;
    const primaryName = primaryArchetype?.name || 'Fighter';
    if (!primaryKey) {
        return { primary: primaryName, flavor: DEFAULT_FLAVOR };
    }

    const secondaryKey = pickSecondary(stats, primaryKey);
    const flavor = (STYLE_FLAVORS_BY_PRIMARY[primaryKey] && STYLE_FLAVORS_BY_PRIMARY[primaryKey][secondaryKey])
        || DEFAULT_FLAVOR;

    return { primary: primaryName, flavor };
}

export function describeOpponentStyle(opponent) {
    return describeFighterStyle(opponent.archetype, opponent.stats);
}
