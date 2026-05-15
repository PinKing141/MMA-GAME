export const WEIGHT_CLASSES = [
    { key: 'strawweight', min: 105, max: 115, name: 'Strawweight', heightMin: 60, heightMax: 66, reachMin: 60, reachMax: 68 },
    { key: 'flyweight', min: 116, max: 125, name: 'Flyweight', heightMin: 62, heightMax: 68, reachMin: 62, reachMax: 70 },
    { key: 'bantamweight', min: 126, max: 135, name: 'Bantamweight', heightMin: 64, heightMax: 70, reachMin: 64, reachMax: 72 },
    { key: 'featherweight', min: 136, max: 145, name: 'Featherweight', heightMin: 65, heightMax: 71, reachMin: 65, reachMax: 73 },
    { key: 'lightweight', min: 146, max: 155, name: 'Lightweight', heightMin: 66, heightMax: 72, reachMin: 66, reachMax: 75 },
    { key: 'welterweight', min: 156, max: 170, name: 'Welterweight', heightMin: 67, heightMax: 74, reachMin: 67, reachMax: 77 },
    { key: 'middleweight', min: 171, max: 185, name: 'Middleweight', heightMin: 68, heightMax: 76, reachMin: 68, reachMax: 79 },
    { key: 'light-heavyweight', min: 186, max: 205, name: 'Light Heavyweight', heightMin: 70, heightMax: 78, reachMin: 70, reachMax: 81 },
    { key: 'heavyweight', min: 206, max: 265, name: 'Heavyweight', heightMin: 72, heightMax: 81, reachMin: 72, reachMax: 84 },
    { key: 'super-heavyweight', min: 266, max: 320, name: 'Super Heavyweight', heightMin: 73, heightMax: 84, reachMin: 73, reachMax: 87 }
];

export const POINTS_BUDGET = 1000;
export const MIN_ATTRIBUTE = 10;
export const MAX_ATTRIBUTE = 99;

export const ATTRIBUTE_GROUPS = {
    standup: {
        label: 'Standup',
        tag: 'STU',
        color: 'standup',
        summary: 'Speed, range control, and clean striking mechanics.',
        attributes: [
            { key: 'punchSpeed', label: 'Punch Speed', desc: 'Affects the speed of punches.' },
            { key: 'kickSpeed', label: 'Kick Speed', desc: 'Affects the speed of kicks.' },
            { key: 'punchPower', label: 'Punch Power', desc: 'Determines damage caused by punches.' },
            { key: 'kickPower', label: 'Kick Power', desc: 'Determines damage caused by kicks.' },
            { key: 'accuracy', label: 'Accuracy', desc: 'Affects strike precision.' },
            { key: 'blocking', label: 'Blocking', desc: 'Affects effectiveness of blocking incoming strikes.' },
            { key: 'headMovement', label: 'Head Movement', desc: 'Determines evasion speed and effectiveness.' },
            { key: 'footwork', label: 'Footwork', desc: 'Affects movement speed and evasion in open space.' },
            { key: 'switchStance', label: 'Switch Stance', desc: 'Affects effectiveness in the non-dominant stance.' }
        ]
    },
    grappling: {
        label: 'Grappling',
        tag: 'GRP',
        color: 'grappling',
        summary: 'Clinch work, takedowns, control, and submission sequencing.',
        attributes: [
            { key: 'clinchOffense', label: 'Clinch Offence', desc: 'Forces tie-ups, wins inside position, and creates damaging or grappling entries from the clinch.' },
            { key: 'clinchDefense', label: 'Clinch Defence', desc: 'Denies tie-ups, breaks grips, and escapes or neutralises clinch pressure.' },
            { key: 'takedownOffense', label: 'Takedown Offence', desc: 'Success rate of shooting for takedowns.' },
            { key: 'takedownDefense', label: 'Takedown Defence', desc: 'Ability to stop takedowns.' },
            { key: 'topControl', label: 'Top Control', desc: 'Efficiency of grappling in top position.' },
            { key: 'bottomControl', label: 'Bottom Control', desc: 'Efficiency of grappling in bottom position.' },
            { key: 'submissionOffense', label: 'Submission Offence', desc: 'Ability to finish submissions.' },
            { key: 'submissionDefense', label: 'Submission Defence', desc: 'Ability to escape submissions.' },
            { key: 'jointSubmission', label: 'Joint Submission', desc: 'Specific to joint locks, both offence and defence reads.' },
            { key: 'chokeSubmission', label: 'Choke Submission', desc: 'Specific to chokes, both offence and defence reads.' },
            { key: 'grappleSpeed', label: 'Grapple Speed', desc: 'Speed of transitions.' }
        ]
    },
    health: {
        label: 'Health',
        tag: 'HLT',
        color: 'health',
        summary: 'Durability, stamina, and damage resistance.',
        attributes: [
            { key: 'cardio', label: 'Cardio', desc: 'Determines how fast stamina drains and recovers.' },
            { key: 'chinStrength', label: 'Chin Strength', desc: 'Resistance to being rocked or knocked out by head strikes.' },
            { key: 'cutResistance', label: 'Cut Resistance', desc: 'Resistance to cuts and facial damage.' },
            { key: 'bodyStrength', label: 'Body Strength', desc: 'Resistance to damage to the body.' },
            { key: 'legStrength', label: 'Leg Strength', desc: 'Resistance to damage to the legs.' }
        ]
    },
    mind: {
        label: 'Mind',
        tag: 'MND',
        color: 'mind',
        summary: 'Decision-making, composure, and trap-setting.',
        attributes: [
            { key: 'fightIQ', label: 'Fight IQ', desc: 'Reads patterns, pacing, and matchup adjustments.' },
            { key: 'composure', label: 'Composure', desc: 'Stays calm when pressured or hurt.' },
            { key: 'killerInstinct', label: 'Killer Instinct', desc: 'Closes exchanges when an opponent is vulnerable.' },
            { key: 'cunning', label: 'Cunning', desc: 'Feigns looks, sets traps, and manipulates reactions.' }
        ]
    }
};

export const ATTRIBUTE_GROUP_ORDER = Object.keys(ATTRIBUTE_GROUPS);

export const ALL_ATTRIBUTES = ATTRIBUTE_GROUP_ORDER.flatMap(groupKey =>
    ATTRIBUTE_GROUPS[groupKey].attributes.map(attribute => ({
        ...attribute,
        group: groupKey,
        groupLabel: ATTRIBUTE_GROUPS[groupKey].label,
        tag: ATTRIBUTE_GROUPS[groupKey].tag,
        color: ATTRIBUTE_GROUPS[groupKey].color
    }))
);

export const ATTRIBUTE_LOOKUP = Object.fromEntries(
    ALL_ATTRIBUTES.map(attribute => [attribute.key, attribute])
);
