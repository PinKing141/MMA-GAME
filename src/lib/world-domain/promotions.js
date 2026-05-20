/**
 * Multi-promotion catalog. Each promotion sits at a tier on the
 * career ladder: a fighter starts on a regional CIRCUIT, gets noticed
 * by a FRONTIER promotion (PFL/Bellator equivalent), and eventually
 * earns a contract with an APEX promotion (UFC equivalent).
 *
 * Tier shapes payout, exposure, ranking weight, and the roster size
 * each promotion maintains per weight class.
 */

export const PROMOTION_TIERS = {
    APEX: {
        key: 'APEX',
        label: 'Apex',
        prestige: 100,
        showMoneyMin: 10000,
        showMoneyMax: 250000,
        winBonusMult: 1.0,
        rosterPerWeightClass: 24,
        rankingWeight: 1.0,
        publishesTop15: true,
        signs: 'Champions, contenders, blue-chip prospects.'
    },
    BANNER: {
        key: 'BANNER',
        label: 'Banner',
        prestige: 72,
        showMoneyMin: 5000,
        showMoneyMax: 150000,
        winBonusMult: 0.85,
        rosterPerWeightClass: 18,
        rankingWeight: 0.6,
        publishesTop15: true,
        signs: 'Veterans on second contracts, regional champions, hype-train prospects.'
    },
    FRONTIER: {
        key: 'FRONTIER',
        label: 'Frontier',
        prestige: 60,
        showMoneyMin: 3000,
        showMoneyMax: 100000,
        winBonusMult: 0.75,
        rosterPerWeightClass: 14,
        rankingWeight: 0.5,
        publishesTop15: true,
        signs: 'Tournament fighters, technique-first specialists, late bloomers.'
    },
    CIRCUIT: {
        key: 'CIRCUIT',
        label: 'Circuit',
        prestige: 28,
        showMoneyMin: 800,
        showMoneyMax: 8000,
        winBonusMult: 0.6,
        rosterPerWeightClass: 8,
        rankingWeight: 0.25,
        publishesTop15: false,
        signs: 'Locals, debuts, fighters on the way up or down.'
    }
};

/**
 * The catalog of known promotions in the world. Each league has a
 * tier, an identity (name, tagline), a region of operation, and a
 * couple of presentation hints.
 */
export const PROMOTIONS = [
    {
        id: 'octagon-global',
        name: 'OCTAGON Global',
        shortName: 'OCG',
        tier: 'APEX',
        region: 'global',
        tagline: 'The sport\'s biggest stage.',
        eventCadenceWeeks: 1,
        venuePool: ['Apex Arena', 'Madison Square Garden', 'O2 Arena', 'Etihad Arena']
    },
    {
        id: 'banner-fights',
        name: 'Banner Fights',
        shortName: 'BFC',
        tier: 'BANNER',
        region: 'americas',
        tagline: 'Where champions get a second life.',
        eventCadenceWeeks: 2,
        venuePool: ['Mohegan Sun Arena', 'Long Beach Arena', 'Coliseo Coca-Cola']
    },
    {
        id: 'frontier-grand-prix',
        name: 'Frontier Grand Prix',
        shortName: 'FGP',
        tier: 'FRONTIER',
        region: 'global',
        tagline: 'Win the tournament, win the contract.',
        eventCadenceWeeks: 3,
        venuePool: ['Hulu Theater', 'Saitama Super Arena', 'OVO Wembley']
    },
    {
        id: 'cage-southwest',
        name: 'CAGE Southwest',
        shortName: 'CGSW',
        tier: 'CIRCUIT',
        region: 'us-southwest',
        tagline: 'Texas, Arizona, New Mexico — the regional pipeline.',
        eventCadenceWeeks: 3,
        venuePool: ['Buckhead Theatre', 'WinStar World Casino', 'Pala Casino']
    },
    {
        id: 'east-coast-combat',
        name: 'East Coast Combat',
        shortName: 'ECC',
        tier: 'CIRCUIT',
        region: 'us-east',
        tagline: 'The grimiest gyms in the country fight here.',
        eventCadenceWeeks: 4,
        venuePool: ['Foxwoods', 'Boardwalk Hall', '2300 Arena']
    },
    {
        id: 'pacific-rim-mma',
        name: 'Pacific Rim MMA',
        shortName: 'PRM',
        tier: 'CIRCUIT',
        region: 'asia-pacific',
        tagline: 'Tokyo to Sydney — Pacific\'s feeder league.',
        eventCadenceWeeks: 4,
        venuePool: ['Korakuen Hall', 'Margaret Court Arena', 'Cotai Arena']
    }
];

export function getPromotion(id) {
    return PROMOTIONS.find(p => p.id === id) || null;
}

export function getPromotionTier(promotionId) {
    const promo = getPromotion(promotionId);
    return promo ? PROMOTION_TIERS[promo.tier] : null;
}

/**
 * Pre-grouped lookup of all promotions at each tier — used by the
 * progression-ladder logic so we can answer "where does a fighter at
 * this prestige level get signed next?"
 */
export const PROMOTIONS_BY_TIER = PROMOTIONS.reduce((map, promo) => {
    if (!map[promo.tier]) map[promo.tier] = [];
    map[promo.tier].push(promo);
    return map;
}, {});

/**
 * Career-progression ladder. Returns the next-tier promotions a
 * fighter with the given prestige is eligible to be poached by. The
 * threshold widens slowly: a CIRCUIT champion gets a FRONTIER look at
 * prestige 30, a BANNER look at 55, an APEX look at 75.
 */
export function getEligiblePoachers(fighterPrestige) {
    const eligible = [];
    if (fighterPrestige >= 75) eligible.push(...(PROMOTIONS_BY_TIER.APEX || []));
    if (fighterPrestige >= 55) eligible.push(...(PROMOTIONS_BY_TIER.BANNER || []));
    if (fighterPrestige >= 30) eligible.push(...(PROMOTIONS_BY_TIER.FRONTIER || []));
    return eligible;
}

/**
 * Compute a fighter's running prestige from their record and current
 * promotion. Used to decide poaching and contender placement.
 */
export function computeFighterPrestige({
    wins = 0,
    losses = 0,
    finishes = 0,
    titleWins = 0,
    currentPromotionTier = 'CIRCUIT',
    rank = null
}) {
    const tier = PROMOTION_TIERS[currentPromotionTier] || PROMOTION_TIERS.CIRCUIT;
    const tierFloor = tier.prestige * 0.4;
    const recordScore = (wins * 4) - (losses * 3) + (finishes * 2) + (titleWins * 14);
    const rankBonus = rank !== null && rank <= 15 ? (16 - rank) * 1.5 : 0;
    return Math.max(0, Math.min(100, tierFloor + recordScore + rankBonus));
}
