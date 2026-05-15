import allRounderIcon from '../../assets/presets/All_Rounder_ico.png';
import boxerIcon from '../../assets/presets/Boxer_ico.png';
import grapplerIcon from '../../assets/presets/Grappling_ico.png';
import kickboxerIcon from '../../assets/presets/Kickboxer_ico.png';
import wrestlerIcon from '../../assets/presets/Wrestling_Ico.png';

const BASE_WEIGHT = 1;

function buildWeights(overrides) {
    return {
        punchSpeed: BASE_WEIGHT,
        kickSpeed: BASE_WEIGHT,
        punchPower: BASE_WEIGHT,
        kickPower: BASE_WEIGHT,
        accuracy: BASE_WEIGHT,
        blocking: BASE_WEIGHT,
        headMovement: BASE_WEIGHT,
        footwork: BASE_WEIGHT,
        switchStance: BASE_WEIGHT,
        clinchOffense: BASE_WEIGHT,
        clinchDefense: BASE_WEIGHT,
        takedownOffense: BASE_WEIGHT,
        takedownDefense: BASE_WEIGHT,
        topControl: BASE_WEIGHT,
        bottomControl: BASE_WEIGHT,
        submissionOffense: BASE_WEIGHT,
        submissionDefense: BASE_WEIGHT,
        jointSubmission: BASE_WEIGHT,
        chokeSubmission: BASE_WEIGHT,
        grappleSpeed: BASE_WEIGHT,
        cardio: BASE_WEIGHT,
        chinStrength: BASE_WEIGHT,
        cutResistance: BASE_WEIGHT,
        bodyStrength: BASE_WEIGHT,
        legStrength: BASE_WEIGHT,
        fightIQ: BASE_WEIGHT,
        composure: BASE_WEIGHT,
        killerInstinct: BASE_WEIGHT,
        cunning: BASE_WEIGHT,
        ...overrides
    };
}

export const ARCHETYPES = [
    {
        key: 'boxer',
        name: 'Boxer',
        icon: boxerIcon,
        blurb: 'Fast hands, sharp head movement, and compact damage windows.',
        styleNote: 'Wins exchanges inside the pocket and punishes bad entries.',
        detail: 'This build is built around clean boxing mechanics inside MMA. The hands are the first layer, but the real value is in rhythm, timing, slips, and short counters that punish lazy entries. A good boxer pressures with the jab, makes opponents reset, and turns tight exchanges into rounds won without needing wild volume.',
        famousFighters: ['Max Holloway', 'Dustin Poirier', 'Ilia Topuria', 'Petr Yan'],
        strengths: [
            { key: 'punchSpeed', label: 'Punch Speed', modifier: '+8%' },
            { key: 'punchPower', label: 'Punch Power', modifier: '+7%' },
            { key: 'headMovement', label: 'Head Movement', modifier: '+6%' },
            { key: 'accuracy', label: 'Accuracy', modifier: '+5%' }
        ],
        weaknesses: [
            { key: 'clinchOffense', label: 'Clinch Offence', modifier: '-5%' },
            { key: 'clinchDefense', label: 'Clinch Defence', modifier: '-4%' },
            { key: 'kickPower', label: 'Kick Power', modifier: '-5%' },
            { key: 'submissionOffense', label: 'Submission Offence', modifier: '-7%' }
        ],
        weights: buildWeights({
            punchSpeed: 8,
            punchPower: 7,
            accuracy: 6,
            headMovement: 6,
            footwork: 5,
            blocking: 5,
            cardio: 5,
            composure: 4,
            clinchOffense: 1,
            clinchDefense: 2,
            kickSpeed: 2,
            kickPower: 1,
            submissionOffense: 1,
            jointSubmission: 1,
            chokeSubmission: 1,
            bottomControl: 1
        })
    },
    {
        key: 'kickboxer',
        name: 'Kick Boxer',
        icon: kickboxerIcon,
        blurb: 'Long-range weapons, stance switches, and layered body work.',
        styleNote: 'Controls distance and stacks damage with varied entries.',
        detail: 'This style is about range management and layered striking. A kick boxer uses kicks, stance changes, and long straight attacks to keep opponents reacting instead of setting their feet. The style feels best when you are touching all levels, forcing reads, and making the other fighter walk through damage to get close.',
        famousFighters: ['Israel Adesanya', 'Alex Pereira', 'Edson Barboza', 'Joanna Jedrzejczyk'],
        strengths: [
            { key: 'kickSpeed', label: 'Kick Speed', modifier: '+8%' },
            { key: 'kickPower', label: 'Kick Power', modifier: '+8%' },
            { key: 'clinchOffense', label: 'Clinch Offence', modifier: '+7%' },
            { key: 'clinchDefense', label: 'Clinch Defence', modifier: '+5%' },
            { key: 'switchStance', label: 'Switch Stance', modifier: '+6%' },
            { key: 'footwork', label: 'Footwork', modifier: '+5%' }
        ],
        weaknesses: [
            { key: 'topControl', label: 'Top Control', modifier: '-5%' },
            { key: 'bottomControl', label: 'Bottom Control', modifier: '-5%' },
            { key: 'jointSubmission', label: 'Joint Submission', modifier: '-7%' }
        ],
        weights: buildWeights({
            kickSpeed: 8,
            kickPower: 8,
            clinchOffense: 7,
            clinchDefense: 5,
            footwork: 6,
            switchStance: 6,
            accuracy: 5,
            punchSpeed: 4,
            blocking: 4,
            cardio: 5,
            cunning: 4,
            topControl: 1,
            bottomControl: 1,
            jointSubmission: 1,
            chokeSubmission: 1
        })
    },
    {
        key: 'wrestler',
        name: 'Wrestler',
        icon: wrestlerIcon,
        blurb: 'Relentless level changes, rides, and pace that buries opponents.',
        styleNote: 'Owns territory, forces scrambles, and wins round control.',
        detail: 'This is a pressure style built on takedowns, mat returns, and positional control. Wrestlers dictate where the fight happens and make opponents work every second of the round. Even without a finish, the style is brutal because it drains confidence, drains gas, and forces people to defend instead of attack.',
        famousFighters: ['Khabib Nurmagomedov', 'Georges St-Pierre', 'Merab Dvalishvili', 'Daniel Cormier'],
        strengths: [
            { key: 'clinchOffense', label: 'Clinch Offence', modifier: '+8%' },
            { key: 'clinchDefense', label: 'Clinch Defence', modifier: '+8%' },
            { key: 'takedownOffense', label: 'Takedown Offence', modifier: '+8%' },
            { key: 'takedownDefense', label: 'Takedown Defence', modifier: '+7%' }
        ],
        weaknesses: [
            { key: 'switchStance', label: 'Switch Stance', modifier: '-4%' },
            { key: 'kickPower', label: 'Kick Power', modifier: '-5%' },
            { key: 'chokeSubmission', label: 'Choke Submission', modifier: '-4%' }
        ],
        weights: buildWeights({
            clinchOffense: 8,
            clinchDefense: 8,
            takedownOffense: 8,
            takedownDefense: 7,
            topControl: 7,
            grappleSpeed: 5,
            cardio: 6,
            bodyStrength: 5,
            chinStrength: 4,
            fightIQ: 4,
            kickPower: 1,
            switchStance: 1,
            chokeSubmission: 2,
            jointSubmission: 2
        })
    },
    {
        key: 'grappler',
        name: 'Grappler',
        icon: grapplerIcon,
        blurb: 'Submission chains, reversals, and fast control transitions.',
        styleNote: 'Turns small mistakes into dominant positions and finishes.',
        detail: 'This style is about control leading directly into danger. Grapplers thrive in transitions, scrambles, and submission chains where one defensive mistake turns into a finish. The build works best when you can stay calm on the mat, improve position quickly, and always threaten the neck or limbs once the fight hits the floor.',
        famousFighters: ['Charles Oliveira', 'Demian Maia', 'Mackenzie Dern', 'Brian Ortega'],
        strengths: [
            { key: 'clinchOffense', label: 'Clinch Offence', modifier: '+5%' },
            { key: 'submissionOffense', label: 'Submission Offence', modifier: '+8%' },
            { key: 'submissionDefense', label: 'Submission Defence', modifier: '+6%' },
            { key: 'chokeSubmission', label: 'Choke Submission', modifier: '+6%' }
        ],
        weaknesses: [
            { key: 'punchPower', label: 'Punch Power', modifier: '-4%' },
            { key: 'kickPower', label: 'Kick Power', modifier: '-4%' },
            { key: 'blocking', label: 'Blocking', modifier: '-5%' }
        ],
        weights: buildWeights({
            clinchOffense: 5,
            clinchDefense: 4,
            submissionOffense: 8,
            submissionDefense: 6,
            jointSubmission: 7,
            chokeSubmission: 7,
            bottomControl: 6,
            topControl: 5,
            grappleSpeed: 6,
            fightIQ: 4,
            cunning: 4,
            blocking: 1,
            punchPower: 2,
            kickPower: 2
        })
    },
    {
        key: 'all-rounder',
        name: 'All-Rounder',
        icon: allRounderIcon,
        blurb: 'Balanced everywhere, hard to gameplan against, no dead zones.',
        styleNote: 'Does not spike as high as specialists but closes fewer doors.',
        detail: 'This is the most flexible base in the game. An all-rounder does not dominate one phase as hard as a specialist, but they can adapt round to round and match up cleanly with almost anyone. It suits players who want to blend striking and grappling without feeling locked into one route to victory.',
        famousFighters: ['Jon Jones', 'Valentina Shevchenko', 'Amanda Nunes', 'Georges St-Pierre'],
        strengths: [
            { key: 'accuracy', label: 'Accuracy', modifier: '+4%' },
            { key: 'clinchOffense', label: 'Clinch Offence', modifier: '+4%' },
            { key: 'clinchDefense', label: 'Clinch Defence', modifier: '+4%' },
            { key: 'takedownDefense', label: 'Takedown Defence', modifier: '+4%' },
            { key: 'cardio', label: 'Cardio', modifier: '+4%' }
        ],
        weaknesses: [
            { key: 'punchPower', label: 'Punch Power', modifier: '-2%' },
            { key: 'submissionOffense', label: 'Submission Offence', modifier: '-2%' },
            { key: 'killerInstinct', label: 'Killer Instinct', modifier: '-2%' }
        ],
        weights: buildWeights({
            punchSpeed: 4,
            kickSpeed: 4,
            punchPower: 4,
            kickPower: 4,
            accuracy: 5,
            blocking: 4,
            headMovement: 4,
            footwork: 4,
            switchStance: 3,
            clinchOffense: 4,
            clinchDefense: 4,
            takedownOffense: 4,
            takedownDefense: 5,
            topControl: 4,
            bottomControl: 4,
            submissionOffense: 4,
            submissionDefense: 5,
            jointSubmission: 3,
            chokeSubmission: 3,
            grappleSpeed: 4,
            cardio: 5,
            chinStrength: 4,
            cutResistance: 4,
            bodyStrength: 4,
            legStrength: 4,
            fightIQ: 5,
            composure: 4,
            killerInstinct: 3,
            cunning: 5
        })
    }
];

export const ARCHETYPE_LOOKUP = Object.fromEntries(
    ARCHETYPES.map(archetype => [archetype.key, archetype])
);
