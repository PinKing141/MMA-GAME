import { state } from '../core.js';
import { EVENTS, getEventLockReason } from '../data/events.js';
import { getPlayerRank } from '../selectors/career-selectors.js';

export function syncAvailableEvents() {
    state.career.availableEvents = EVENTS.map(event => ({ ...event }));
}

export function getEventGateInfo(event) {
    const playerRank = getPlayerRank();
    return getEventLockReason(event, state.career, playerRank);
}

export function selectEventState(eventId) {
    const event = state.career.availableEvents.find(entry => entry.id === eventId);
    if (!event) return false;
    if (getEventGateInfo(event)) return false;

    state.career.selectedEvent = event;
    state.career.contract = null;
    return true;
}
