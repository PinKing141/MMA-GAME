export const COACHES = [
    {
        id: 'vega',
        name: 'Marta Vega',
        gym: 'Crown Forge',
        specialty: 'Sharp hands, cleaner reads, and controlled sparring rhythm.',
        fee: 1200,
        reputationRequired: 0,
        gymReputationGain: 3,
        longTermTrait: {
            label: 'Technical Layering',
            description: 'Striking-focused camps slowly raise technical ceilings across future bookings.',
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
        id: 'hayes',
        name: 'Darius Hayes',
        gym: 'Chain House',
        specialty: 'Clinch pressure, wall wrestling, and suffocating top control.',
        fee: 1600,
        reputationRequired: 2,
        gymReputationGain: 4,
        longTermTrait: {
            label: 'Mat Tax',
            description: 'Repeated camps improve grind-heavy stats even outside dedicated wrestling weeks.',
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
        id: 'sato',
        name: 'Rin Sato',
        gym: 'Tempo Lab',
        specialty: 'Conditioning science, recovery balance, and disciplined camp management.',
        fee: 2100,
        reputationRequired: 4,
        gymReputationGain: 5,
        longTermTrait: {
            label: 'Longevity Program',
            description: 'Each completed camp improves durability and lowers future wear.',
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
