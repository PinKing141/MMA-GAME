import { COACHES } from '../data.js';
import { state } from '../core.js';
import { getContractPreview, signContractState } from './contract-actions.js';
import { selectEventState, syncAvailableEvents } from './event-actions.js';
import { applyCampWeekState } from './camp-state.js';
import { selectCoachState, selectOpponentState, syncAvailableOpponents } from './career-state.js';
import { simulateFightState } from './fight-state.js';
import { refreshCurrentScene, showScene } from '../scene-controller.js';

function findCoach(coachId) {
    return COACHES.find(entry => entry.id === coachId) || null;
}

export function openOpponentSceneAction() {
    showScene('opponent');
}

export function openGymSceneAction() {
    if (!state.career.contract) {
        return false;
    }

    showScene('gym');
    return true;
}

export function openFightSceneAction() {
    if (!state.career.contract || state.career.campWeeksCompleted < state.career.campWeeksTotal) {
        return false;
    }

    showScene('fight');
    return true;
}

export function openProfileSceneAction() {
    showScene('profile');
}

export function advanceProfileAction() {
    if (!state.career.contract) {
        openOpponentSceneAction();
        return;
    }

    if (state.career.campWeeksCompleted >= state.career.campWeeksTotal) {
        openFightSceneAction();
        return;
    }

    openGymSceneAction();
}

export function selectOpponentAction(opponentId) {
    if (selectOpponentState(opponentId)) {
        refreshCurrentScene();
    }
}

export function selectEventAction(eventId) {
    if (selectEventState(eventId)) {
        refreshCurrentScene();
    }
}

/**
 * Lock in an offer (event + opponent) and route to the contract signing
 * scene. Contract is NOT signed yet — the player still has to put pen
 * to paper. Camp window is pre-staged from the offer's tier.
 */
export function proposeFightOfferAction({ opponentId, eventId, campWeeks }) {
    syncAvailableOpponents();
    syncAvailableEvents();

    if (!selectEventState(eventId)) {
        return false;
    }

    if (!selectOpponentState(opponentId)) {
        return false;
    }

    if (campWeeks && Number.isFinite(campWeeks)) {
        state.career.campWeeksTotal = campWeeks;
    }

    showScene('contract');
    return true;
}

/**
 * Finalize the proposed contract after the player has signed.
 * Promotes selectedEvent + selectedOpponent into state.career.contract
 * and opens the gym.
 */
export function signPendingContractAction() {
    if (!getContractPreview()) {
        return false;
    }

    if (!signContractState()) {
        return false;
    }

    showScene('gym');
    return true;
}

/**
 * Walk away from a proposed contract before signing. Clears the staged
 * event + opponent and sends the player back to the offer board.
 */
export function rejectPendingContractAction() {
    state.career.selectedEvent = null;
    state.career.selectedOpponent = null;
    state.career.contract = null;
    showScene('opponent');
    return true;
}

export function signContractAction() {
    if (!getContractPreview()) {
        return false;
    }

    if (signContractState()) {
        showScene('gym');
        return true;
    }

    return false;
}

export function selectCoachAction(coachId) {
    const coach = findCoach(coachId);
    const relationship = coach ? state.career.coachRelationships[coach.id] || null : null;

    if (selectCoachState(coach, relationship)) {
        refreshCurrentScene();
    }
}

export function applyCampAction(actionKey) {
    const coach = findCoach(state.career.selectedCoach?.id);

    if (applyCampWeekState(actionKey, coach)) {
        refreshCurrentScene();
    }
}

export function simulateFightAction() {
    if (simulateFightState()) {
        refreshCurrentScene();
        return true;
    }

    return false;
}