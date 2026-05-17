import { COACHES } from '../data.js';
import { state } from '../core.js';
import { getContractPreview, signContractState } from './contract-actions.js';
import { selectEventState } from './event-actions.js';
import { applyCampWeekState } from './camp-state.js';
import { selectCoachState, selectOpponentState } from './career-state.js';
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