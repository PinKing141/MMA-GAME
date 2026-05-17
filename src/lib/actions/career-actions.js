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
 * Accept a packaged fight offer (opponent + event together).
 * Used by the new opponent picker — pairs the two selections and signs
 * the contract in one motion.
 */
export function acceptFightOfferAction({ opponentId, eventId, campWeeks }) {
    syncAvailableOpponents();
    syncAvailableEvents();

    if (!selectEventState(eventId)) {
        return false;
    }

    if (!selectOpponentState(opponentId)) {
        return false;
    }

    if (!signContractState()) {
        return false;
    }

    if (campWeeks && Number.isFinite(campWeeks)) {
        state.career.campWeeksTotal = campWeeks;
    }

    showScene('gym');
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