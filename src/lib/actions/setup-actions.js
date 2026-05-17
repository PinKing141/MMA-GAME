import { resetGame } from '../core.js';
import { showScene } from '../scene-controller.js';
import {
    randomiseFrame,
    randomiseIdentity,
    readSetupForm,
    renderNations,
    renderWeightClasses,
    syncFrameControls,
    syncSetupFormFromState,
    updatePreview
} from '../../scenes/setup.js';

export function initializeSetupScene() {
    renderNations();
    renderWeightClasses();
    syncSetupFormFromState();
    syncFrameControls({ preserveValues: false });
    updatePreview();
}

export function commitSetupForm() {
    readSetupForm();
}

export function randomizeIdentityAction() {
    randomiseIdentity();
}

export function randomizeProspectAction() {
    randomiseFrame();
}

export function restartGameAction() {
    resetGame();
    showScene('setup');
}