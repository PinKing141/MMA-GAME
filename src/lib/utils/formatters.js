import { WEIGHT_CLASSES } from '../data/attributes.js';

export function getWeightClassEntry(weight) {
    for (const weightClass of WEIGHT_CLASSES) {
        if (weight <= weightClass.max) {
            return weightClass;
        }
    }
    return WEIGHT_CLASSES[WEIGHT_CLASSES.length - 1];
}

export function getWeightClassByKey(key) {
    return WEIGHT_CLASSES.find(weightClass => weightClass.key === key) || WEIGHT_CLASSES[0];
}

export function getWeightClass(weight) {
    return getWeightClassEntry(weight).name;
}

export function getStance(hand) {
    return hand === 'left' ? 'Southpaw' : 'Orthodox';
}

export function feetInchesString(feet, inches) {
    return `${feet}'${inches}"`;
}

export function inchesToFeetInchesString(totalInches) {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return feetInchesString(feet, inches);
}

export function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

export function formatRecord(record) {
    return `${record.wins}-${record.losses}-${record.draws}`;
}

export function getRankLabel(rank) {
    return rank ? `#${rank}` : 'NR';
}

export function statColorClass(value) {
    if (value < 30) {
        return 's-red';
    }
    if (value < 45) {
        return 's-orange';
    }
    if (value < 55) {
        return 's-amber';
    }
    if (value < 70) {
        return 's-purple';
    }
    if (value < 85) {
        return 's-blue';
    }
    return 's-green';
}
