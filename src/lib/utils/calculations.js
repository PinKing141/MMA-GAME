import { ARCHETYPES } from '../data/archetypes.js';
import { ALL_ATTRIBUTES, ATTRIBUTE_GROUP_ORDER, MAX_ATTRIBUTE, MIN_ATTRIBUTE, POINTS_BUDGET } from '../data/attributes.js';

const ROOKIE_BASELINE_BONUS = 15;
const ROOKIE_TEMPLATE_BUDGET = 700;
const ROOKIE_TEMPLATE_CAP = 68;

export function roundStat(value) {
    return Math.max(MIN_ATTRIBUTE, Math.min(MAX_ATTRIBUTE, Math.round(value)));
}

export function getAttributeAverage(stats, groupKey, groups) {
    const attributes = groups[groupKey].attributes;
    const total = attributes.reduce((sum, attribute) => sum + stats[attribute.key], 0);
    return total / attributes.length;
}

export function getOverallAverage(stats) {
    const total = ALL_ATTRIBUTES.reduce((sum, attribute) => sum + stats[attribute.key], 0);
    return Math.round(total / ALL_ATTRIBUTES.length);
}

export function getDistribution(stats) {
    const totalSpend = ALL_ATTRIBUTES.reduce((sum, attribute) => sum + (stats[attribute.key] - MIN_ATTRIBUTE), 0);
    if (totalSpend <= 0) {
        return Object.fromEntries(ALL_ATTRIBUTES.map(attribute => [attribute.key, 0]));
    }

    return Object.fromEntries(
        ALL_ATTRIBUTES.map(attribute => [attribute.key, (stats[attribute.key] - MIN_ATTRIBUTE) / totalSpend])
    );
}

export function getArchetypeDistance(stats, archetype) {
    const actual = getDistribution(stats);
    const weightTotal = Object.values(archetype.weights).reduce((sum, value) => sum + value, 0);

    return ALL_ATTRIBUTES.reduce((distance, attribute) => {
        const target = archetype.weights[attribute.key] / weightTotal;
        return distance + Math.abs(actual[attribute.key] - target);
    }, 0);
}

export function detectArchetype(stats) {
    return ARCHETYPES.reduce((closest, archetype) => {
        const distance = getArchetypeDistance(stats, archetype);
        if (!closest || distance < closest.distance) {
            return { archetype, distance };
        }
        return closest;
    }, null)?.archetype || ARCHETYPES[0];
}

export function buildPresetStats(archetype) {
    const stats = Object.fromEntries(ALL_ATTRIBUTES.map(attribute => [attribute.key, MIN_ATTRIBUTE]));

    const baselineSpend = ROOKIE_BASELINE_BONUS * ALL_ATTRIBUTES.length;
    const weightedBudget = Math.max(0, Math.min(POINTS_BUDGET, ROOKIE_TEMPLATE_BUDGET) - baselineSpend);
    const activeKeys = ALL_ATTRIBUTES.map(attribute => attribute.key);
    const weightTotal = activeKeys.reduce((sum, key) => sum + archetype.weights[key], 0);

    activeKeys.forEach(key => {
        stats[key] = Math.min(ROOKIE_TEMPLATE_CAP, MIN_ATTRIBUTE + ROOKIE_BASELINE_BONUS);
    });

    if (weightedBudget <= 0 || weightTotal <= 0) {
        return stats;
    }

    const weightedShares = activeKeys.map(key => {
        const exactShare = (weightedBudget * archetype.weights[key]) / weightTotal;
        const room = Math.max(0, ROOKIE_TEMPLATE_CAP - stats[key]);
        const wholeShare = Math.min(room, Math.floor(exactShare));

        return {
            key,
            exactShare,
            wholeShare,
            room,
            remainder: exactShare - Math.floor(exactShare)
        };
    });

    let spent = 0;
    weightedShares.forEach(share => {
        stats[share.key] += share.wholeShare;
        spent += share.wholeShare;
    });

    let leftover = weightedBudget - spent;
    if (leftover > 0) {
        weightedShares
            .sort((a, b) => {
                if (b.remainder !== a.remainder) {
                    return b.remainder - a.remainder;
                }
                return archetype.weights[b.key] - archetype.weights[a.key];
            })
            .forEach(share => {
                if (leftover <= 0) {
                    return;
                }

                const room = ROOKIE_TEMPLATE_CAP - stats[share.key];
                if (room <= 0) {
                    return;
                }

                stats[share.key] += 1;
                leftover -= 1;
            });
    }

    return stats;
}

export function getCategorySnapshot(stats, groups) {
    return ATTRIBUTE_GROUP_ORDER.map(groupKey => ({
        key: groupKey,
        label: groups[groupKey].label,
        tag: groups[groupKey].tag,
        average: Math.round(getAttributeAverage(stats, groupKey, groups))
    }));
}
