import { EVENTS } from '../data.js';
import { state } from '../core.js';

export function syncAvailableEvents() {
    state.career.availableEvents = EVENTS.map(event => ({ ...event }));
}

export function selectEventState(eventId) {
    const event = state.career.availableEvents.find(entry => entry.id === eventId);
    if (!event || state.career.reputation < event.reputationRequired) {
        return false;
    }

    state.career.selectedEvent = event;
    state.career.contract = null;
    return true;
}
