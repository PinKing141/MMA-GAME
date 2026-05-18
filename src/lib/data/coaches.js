/**
 * Gyms in OCTAGON are MMA gyms — they all teach the full game, but each
 * has a dominant discipline that gives faster gains in that area and
 * shapes the fighter's identity over time. Multipliers scale per
 * session category (boxing / wrestling / roadwork / film / recovery).
 *
 * The id maps 1:1 to the legacy coach concept so existing save data
 * (coachRelationships) keeps working.
 */
export const COACHES = [
    {
        id: 'vega',
        name: 'Marta Vega',
        gym: 'Crown Forge',
        country: 'United States',
        countryCode: 'US',
        city: 'Las Vegas',
        founded: 2009,
        specialty: 'Boxing',
        specialtyTagline: 'Sharp hands, head movement, and counter rhythm',
        grade: 'C',
        specialty_blurb: 'Pocket boxing and reactive movement. Hands come out clean and entries get punished.',
        fee: 1200,
        reputationRequired: 0,
        gymReputationGain: 3,
        disciplineMultipliers: {
            boxing: 1.5,
            wrestling: 0.85,
            roadwork: 1.1,
            film: 1.05,
            recovery: 1.0
        },
        longTermTrait: {
            label: 'Padwork Rounds',
            description: 'Stay with Vega and your hands keep getting sharper from fight to fight.',
            statGrowth: { accuracy: 1, punchSpeed: 1 }
        },
        actionBonuses: {
            boxing: {
                stats: { accuracy: 1, punchSpeed: 1 },
                career: { sharpness: 2 }
            },
            film: {
                stats: { fightIQ: 1 },
                career: { morale: 1 }
            }
        },
        fatigueModifier: 1,
        injuryBuffer: 4,
        weightCutModifier: 1
    },
    {
        id: 'park',
        name: 'Master Park',
        gym: 'Flying Dragon',
        country: 'South Korea',
        countryCode: 'KR',
        city: 'Busan',
        founded: 1996,
        specialty: 'Taekwondo',
        specialtyTagline: 'Kicking range, blitz timing, switch-stance attacks',
        grade: 'C',
        specialty_blurb: 'Long-range kicks, distance management, and stance feints. Builds a unique striker.',
        fee: 1000,
        reputationRequired: 0,
        gymReputationGain: 3,
        disciplineMultipliers: {
            boxing: 1.3,
            wrestling: 0.85,
            roadwork: 1.15,
            film: 0.95,
            recovery: 1.0
        },
        longTermTrait: {
            label: 'Kicking Library',
            description: 'Camp after camp, the kicks get faster and the feet stay more active.',
            statGrowth: { kickSpeed: 1, footwork: 1 }
        },
        actionBonuses: {
            boxing: {
                stats: { kickSpeed: 1, kickPower: 1 },
                career: { sharpness: 1 }
            },
            roadwork: {
                stats: { legStrength: 1 },
                career: { fitness: 1 }
            }
        },
        fatigueModifier: 0,
        injuryBuffer: 3,
        weightCutModifier: 0
    },
    {
        id: 'almeida',
        name: 'Bruno Almeida',
        gym: 'Alliance BJJ',
        country: 'Brazil',
        countryCode: 'BR',
        city: 'São Paulo',
        founded: 1988,
        specialty: 'Brazilian Jiu-Jitsu',
        specialtyTagline: 'Submission chains, guard play, scramble survival',
        grade: 'B',
        specialty_blurb: 'Once it hits the floor, you own it. Submissions come fast and survival is automatic.',
        fee: 1600,
        reputationRequired: 2,
        gymReputationGain: 4,
        disciplineMultipliers: {
            boxing: 0.85,
            wrestling: 1.3,
            roadwork: 1.0,
            film: 1.15,
            recovery: 1.05
        },
        longTermTrait: {
            label: 'Submission Depth',
            description: 'Every camp deepens the submission game and the read on scrambles.',
            statGrowth: { submissionOffense: 1, submissionDefense: 1 }
        },
        actionBonuses: {
            wrestling: {
                stats: { submissionOffense: 1, jointSubmission: 1 },
                career: { sharpness: 1 }
            },
            film: {
                stats: { fightIQ: 1, composure: 1 },
                career: { morale: 1 }
            }
        },
        fatigueModifier: 0,
        injuryBuffer: 5,
        weightCutModifier: 0
    },
    {
        id: 'hayes',
        name: 'Darius Hayes',
        gym: 'Eagles MMA',
        country: 'Dagestan',
        countryCode: 'DAG',
        city: 'Makhachkala',
        founded: 2011,
        specialty: 'Wrestling',
        specialtyTagline: 'Cage wrestling, sambo throws, suffocating top control',
        grade: 'B',
        specialty_blurb: 'Single-minded wrestling room. Takedowns become automatic and rounds end on top.',
        fee: 1800,
        reputationRequired: 3,
        gymReputationGain: 4,
        disciplineMultipliers: {
            boxing: 0.85,
            wrestling: 1.6,
            roadwork: 1.2,
            film: 1.1,
            recovery: 0.95
        },
        longTermTrait: {
            label: 'Chain Wrestling',
            description: 'Stick with Hayes and your control game keeps getting tighter every camp.',
            statGrowth: { takedownDefense: 1, topControl: 1 }
        },
        actionBonuses: {
            wrestling: {
                stats: { takedownOffense: 1, topControl: 1 },
                career: { sharpness: 1 }
            },
            roadwork: {
                stats: { cardio: 1 },
                career: { fitness: 1 }
            }
        },
        fatigueModifier: 2,
        injuryBuffer: 2,
        weightCutModifier: 1
    },
    {
        id: 'kruvong',
        name: 'Kru Vong',
        gym: 'Tiger Muay Thai',
        country: 'Thailand',
        countryCode: 'TH',
        city: 'Phuket',
        founded: 2003,
        specialty: 'Muay Thai',
        specialtyTagline: 'Eight-limb striking, clinch knees, elbow exchanges',
        grade: 'A',
        specialty_blurb: 'Lumpinee-grade striking room. Knees, elbows, and clinch become the default answer.',
        fee: 2000,
        reputationRequired: 4,
        gymReputationGain: 5,
        disciplineMultipliers: {
            boxing: 1.4,
            wrestling: 0.8,
            roadwork: 1.2,
            film: 0.95,
            recovery: 1.0
        },
        longTermTrait: {
            label: 'Clinch Library',
            description: 'Years here means knees, elbows, and clinch positions become muscle memory.',
            statGrowth: { clinchOffense: 1, kickPower: 1 }
        },
        actionBonuses: {
            boxing: {
                stats: { clinchOffense: 1, kickPower: 1 },
                career: { sharpness: 1 }
            },
            roadwork: {
                stats: { legStrength: 1, cardio: 1 },
                career: { fitness: 1 }
            }
        },
        fatigueModifier: 1,
        injuryBuffer: 4,
        weightCutModifier: 0
    },
    {
        id: 'sato',
        name: 'Rin Sato',
        gym: 'Tempo Lab',
        country: 'Japan',
        countryCode: 'JP',
        city: 'Saitama',
        founded: 2015,
        specialty: 'Conditioning',
        specialtyTagline: 'Recovery science, pacing, late-round steadiness',
        grade: 'A',
        specialty_blurb: 'Sports-science gym. Bodies last longer here and bad cuts get fixed before they hurt.',
        fee: 2100,
        reputationRequired: 4,
        gymReputationGain: 5,
        disciplineMultipliers: {
            boxing: 1.0,
            wrestling: 1.0,
            roadwork: 1.4,
            film: 1.1,
            recovery: 1.3
        },
        longTermTrait: {
            label: 'Recovery Routine',
            description: 'Every camp makes you tougher and a little easier to keep healthy.',
            statGrowth: { cardio: 1, cutResistance: 1 }
        },
        actionBonuses: {
            roadwork: {
                stats: { cardio: 1, bodyStrength: 1 },
                career: { fitness: 2 }
            },
            recovery: {
                stats: { composure: 1, cutResistance: 1 },
                career: { morale: 1, sharpness: 1 }
            }
        },
        fatigueModifier: -2,
        injuryBuffer: 10,
        weightCutModifier: -3
    }
];
