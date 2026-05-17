/*
 * Fight-week adapter — converts career state into the simple
 * { name, nickname, country, flag, weightClass, ... } shape that
 * the weigh-in and press conference iframes expect.
 */

import { getWeightClassEntry, state } from './core.js';

const COUNTRY_FLAG_EMOJI = {
    US: '🇺🇸', CA: '🇨🇦', MX: '🇲🇽', BR: '🇧🇷', AR: '🇦🇷', CO: '🇨🇴',
    CL: '🇨🇱', PE: '🇵🇪', VE: '🇻🇪', EC: '🇪🇨', UY: '🇺🇾', CU: '🇨🇺',
    DO: '🇩🇴', PR: '🇵🇷', JM: '🇯🇲', PA: '🇵🇦',
    GB: '🇬🇧', IE: '🇮🇪', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', ES: '🇪🇸',
    PT: '🇵🇹', NL: '🇳🇱', BE: '🇧🇪', CH: '🇨🇭', SE: '🇸🇪', NO: '🇳🇴',
    DK: '🇩🇰', FI: '🇫🇮', PL: '🇵🇱', UA: '🇺🇦', RU: '🇷🇺', GE: '🇬🇪',
    AM: '🇦🇲', AZ: '🇦🇿', KZ: '🇰🇿', TR: '🇹🇷', GR: '🇬🇷', RO: '🇷🇴',
    HU: '🇭🇺', CZ: '🇨🇿', SK: '🇸🇰', RS: '🇷🇸', HR: '🇭🇷', BG: '🇧🇬',
    NG: '🇳🇬', GH: '🇬🇭', ZA: '🇿🇦', KE: '🇰🇪', MA: '🇲🇦', EG: '🇪🇬',
    CM: '🇨🇲', CI: '🇨🇮', SN: '🇸🇳',
    JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', TH: '🇹🇭', PH: '🇵🇭', VN: '🇻🇳',
    ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', IN: '🇮🇳',
    AU: '🇦🇺', NZ: '🇳🇿'
};

export function getFlagEmoji(countryCode) {
    if (!countryCode) return '🏳️';
    return COUNTRY_FLAG_EMOJI[countryCode] || '🏳️';
}

function eventTierToVenue(event) {
    if (!event) return 'regional';
    if (event.stageLabel === 'PPV Prelims' || event.stageLabel === 'Main Event') return 'stadium';
    if (event.stageLabel === 'TV Card' || event.stageLabel === 'Co-Main') return 'regional';
    return 'local';
}

export function getCurrentEventVenueTier() {
    const event = state.career.contract
        ? state.career.availableEvents.find(entry => entry.id === state.career.contract.eventId) || state.career.selectedEvent
        : state.career.selectedEvent;
    return eventTierToVenue(event);
}

function getPlayerFighterPayload() {
    const setup = state.setup;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unsigned Prospect';
    const targetWeight = getWeightClassEntry(setup.weight);
    return {
        name: fullName,
        nickname: '',
        flag: getFlagEmoji(setup.country?.code),
        country: setup.country?.name || '',
        weightClass: targetWeight?.name || `${setup.weight} lbs`,
        // Weigh-in expects a target weight
        targetWeight: setup.weight,
        actualWeight: setup.weight
    };
}

function getOpponentPersonality(opponent) {
    if (!opponent) return { confidence: 60, trashTalk: 40, humility: 50, respect: 50 };
    const archetype = opponent.archetype?.key || opponent.archetypeKey;
    // Personality bias from archetype as a sensible default until we author per-fighter bios.
    switch (archetype) {
        case 'boxer':       return { confidence: 70, trashTalk: 55, humility: 35, respect: 55 };
        case 'kickboxer':   return { confidence: 75, trashTalk: 35, humility: 45, respect: 60 };
        case 'wrestler':    return { confidence: 65, trashTalk: 30, humility: 55, respect: 70 };
        case 'grappler':    return { confidence: 60, trashTalk: 20, humility: 65, respect: 75 };
        case 'all-rounder': return { confidence: 70, trashTalk: 30, humility: 60, respect: 70 };
        default:            return { confidence: 60, trashTalk: 40, humility: 50, respect: 50 };
    }
}

function getOpponentFighterPayload(opponent) {
    if (!opponent) return null;
    const weightClass = getWeightClassEntry(state.setup.weight);
    return {
        name: opponent.name,
        nickname: opponent.nickname || '',
        flag: getFlagEmoji(opponent.country?.code || opponent.countryCode),
        country: opponent.country?.name || '',
        weightClass: weightClass?.name || '',
        targetWeight: weightClass?.max || state.setup.weight,
        actualWeight: weightClass?.max || state.setup.weight,
        personality: getOpponentPersonality(opponent)
    };
}

export function getFightWeekPayload() {
    const opponent = state.career.selectedOpponent;
    return {
        red: getPlayerFighterPayload(),
        blue: getOpponentFighterPayload(opponent),
        venue: getCurrentEventVenueTier()
    };
}

export function getPostFightPayload() {
    const lastResult = state.career.lastFightResult;
    const player = getPlayerFighterPayload();
    if (!lastResult) {
        return { red: player, blue: null, venue: 'regional' };
    }
    const opponent = lastResult.opponent;
    return {
        red: player,
        blue: opponent ? getOpponentFighterPayload(opponent) : null,
        venue: lastResult.eventName?.toLowerCase().includes('ppv') ? 'stadium' : 'regional'
    };
}
