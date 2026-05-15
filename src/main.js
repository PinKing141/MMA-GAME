import './styles.css';

import { resetBuild, applyPreset, drawHexagon, renderAllocateCategories, selectStat, updateAllocHeader } from './scenes/allocation.js';
import { resetStats, state } from './lib/core.js';
import { gotoScene } from './lib/navigation.js';
import { applyGymAction, renderGymScene, selectCoach } from './scenes/gym.js';
import { renderOpponentScene, selectOpponent } from './scenes/opponent.js';
import { renderFightScene, simulateFight } from './scenes/fight.js';
import { renderProfile } from './scenes/profile.js';
import { randomiseFrame, readSetupForm, renderNations, renderWeightClasses, syncFrameControls, updatePreview } from './scenes/setup.js';
import { ALL_ATTRIBUTES } from './lib/data.js';

function showValidationError(id, message) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.textContent = message;
    element.hidden = false;
}

function clearValidationError(id) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }

    element.textContent = '';
    element.hidden = true;
}

function focusMissingNameField() {
    const input = document.getElementById(state.setup.firstName ? 'f-last' : 'f-first');
    input.style.borderColor = 'var(--accent-hot)';
    input.focus();
    setTimeout(() => {
        input.style.borderColor = '';
    }, 1500);
}

function wireEvents() {
    ['f-first', 'f-last', 'f-nation', 'f-age', 'f-height-slider', 'f-reach-slider', 'f-weight-slider'].forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('input', () => {
            clearValidationError('setup-error');
            clearValidationError('frame-error');
            updatePreview();
        });
        element.addEventListener('change', () => {
            clearValidationError('setup-error');
            clearValidationError('frame-error');
            updatePreview();
        });
    });

    document.getElementById('f-weight-class').addEventListener('change', () => {
        clearValidationError('frame-error');
        syncFrameControls({ preserveValues: false });
        updatePreview();
    });

    document.querySelectorAll('input[name="hand"]').forEach(element => {
        element.addEventListener('change', () => {
            clearValidationError('frame-error');
            updatePreview();
        });
    });

    document.getElementById('btn-randomize').addEventListener('click', () => {
        clearValidationError('frame-error');
        randomiseFrame();
    });
    document.getElementById('btn-randomise-identity').addEventListener('click', () => {
        clearValidationError('setup-error');
        randomiseFrame();
    });

    document.getElementById('btn-to-frame').addEventListener('click', () => {
        readSetupForm();
        if (!state.setup.firstName || !state.setup.lastName) {
            showValidationError('setup-error', 'Enter both a first name and a last name before continuing.');
            focusMissingNameField();
            return;
        }

        clearValidationError('setup-error');

        gotoScene('frame');
    });

    document.getElementById('btn-allocate').addEventListener('click', () => {
        readSetupForm();
        if (!state.setup.firstName || !state.setup.lastName) {
            showValidationError('frame-error', 'Finish the fighter identity before moving into allocation.');
            focusMissingNameField();
            return;
        }

        clearValidationError('frame-error');

        document.getElementById('alloc-name').textContent = `${state.setup.firstName} ${state.setup.lastName} · ${state.setup.country.name}`;
        renderAllocateCategories();
        updateAllocHeader();
        drawHexagon();
        selectStat(ALL_ATTRIBUTES[0].key);
        gotoScene('allocate');
    });

    document.getElementById('btn-back-frame').addEventListener('click', () => {
        gotoScene('frame');
    });

    document.getElementById('btn-back-setup').addEventListener('click', () => {
        gotoScene('setup');
    });

    document.getElementById('btn-finalize').addEventListener('click', () => {
        renderProfile();
        gotoScene('profile');
    });

    document.getElementById('btn-profile-progress').addEventListener('click', () => {
        if (!state.career.selectedOpponent) {
            renderOpponentScene();
            gotoScene('opponent');
            return;
        }

        if (state.career.campWeeksCompleted >= state.career.campWeeksTotal) {
            renderFightScene();
            gotoScene('fight');
            return;
        }

        renderGymScene();
        gotoScene('gym');
    });

    document.getElementById('btn-back-profile-from-opponent').addEventListener('click', () => {
        renderProfile();
        gotoScene('profile');
    });

    document.getElementById('btn-begin-camp').addEventListener('click', () => {
        if (!state.career.selectedOpponent) {
            return;
        }

        renderGymScene();
        gotoScene('gym');
    });

    document.getElementById('btn-back-profile-from-gym').addEventListener('click', () => {
        renderProfile();
        gotoScene('profile');
    });

    document.getElementById('btn-fight-night').addEventListener('click', () => {
        if (state.career.campWeeksCompleted < state.career.campWeeksTotal) {
            return;
        }

        renderFightScene();
        gotoScene('fight');
    });

    document.getElementById('btn-back-gym').addEventListener('click', () => {
        renderGymScene();
        gotoScene('gym');
    });

    document.getElementById('btn-simulate-fight').addEventListener('click', () => {
        simulateFight();
    });

    document.getElementById('btn-fight-back-profile').addEventListener('click', () => {
        renderProfile();
        gotoScene('profile');
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        if (window.confirm('Start over from scratch? Your fighter will be discarded.')) {
            resetStats();
            updatePreview();
            gotoScene('setup');
        }
    });

    document.getElementById('btn-reset-build').addEventListener('click', () => {
        resetBuild();
    });

    document.addEventListener('click', event => {
        const presetButton = event.target.closest('[data-preset]');
        if (presetButton) {
            applyPreset(presetButton.dataset.preset);
        }

        const opponentButton = event.target.closest('[data-opponent-id]');
        if (opponentButton) {
            selectOpponent(opponentButton.dataset.opponentId);
        }

        const coachButton = event.target.closest('[data-coach-id]');
        if (coachButton) {
            selectCoach(coachButton.dataset.coachId);
        }

        const gymActionButton = event.target.closest('[data-gym-action]');
        if (gymActionButton) {
            applyGymAction(gymActionButton.dataset.gymAction);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderNations();
    renderWeightClasses();
    syncFrameControls({ preserveValues: false });
    wireEvents();
    updatePreview();
});
