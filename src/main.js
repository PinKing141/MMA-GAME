import './styles.css';

import { handleBuildReset, handlePresetSelection } from './scenes/allocation.js';
import {
    advanceProfileAction,
    applyCampAction,
    openFightSceneAction,
    openGymSceneAction,
    openOpponentSceneAction,
    openPostFightInterviewAction,
    openPreFightInterviewAction,
    openProfileSceneAction,
    openWeighInAction,
    selectCoachAction,
    selectEventAction,
    selectOpponentAction,
    signContractAction,
    simulateFightAction
} from './lib/actions/career-actions.js';
import { closeFightReplayModal, openFightReplayModal } from './lib/fight-engine-bridge.js';
import { closeInterviewModal } from './lib/interview-bridge.js';
import { closeWeighInModal } from './lib/weigh-in-bridge.js';
import { commitSetupForm, randomizeIdentityAction, randomizeProspectAction, restartGameAction } from './lib/actions/setup-actions.js';
import { state } from './lib/core.js';
import { formatSaveStatus, getSavedGameMeta, hasSavedGame, loadGameState, SAVE_META_EVENT, saveGameState, scheduleGameSave } from './lib/persistence.js';
import { getFightViewModel } from './lib/selectors/fight-selectors.js';
import { showScene } from './lib/scene-controller.js';
import { syncFrameControls, updatePreview } from './scenes/setup.js';

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

function updateSaveUi() {
    const saveStatus = document.getElementById('save-status');
    const loadButton = document.getElementById('btn-load-game');
    const saveMeta = getSavedGameMeta();

    if (saveStatus) {
        saveStatus.textContent = formatSaveStatus(saveMeta);
    }

    if (loadButton) {
        loadButton.disabled = !hasSavedGame();
    }
}

function wireEvents() {
    ['f-first', 'f-last', 'f-nation', 'f-age', 'f-height-slider', 'f-reach-slider', 'f-weight-slider'].forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('input', () => {
            clearValidationError('setup-error');
            clearValidationError('frame-error');
            updatePreview();
            scheduleGameSave();
        });
        element.addEventListener('change', () => {
            clearValidationError('setup-error');
            clearValidationError('frame-error');
            updatePreview();
            scheduleGameSave();
        });
    });

    document.getElementById('f-weight-class').addEventListener('change', () => {
        clearValidationError('frame-error');
        syncFrameControls({ preserveValues: false });
        updatePreview();
        scheduleGameSave();
    });

    document.querySelectorAll('input[name="hand"]').forEach(element => {
        element.addEventListener('change', () => {
            clearValidationError('frame-error');
            updatePreview();
            scheduleGameSave();
        });
    });

    document.getElementById('btn-randomize').addEventListener('click', () => {
        clearValidationError('frame-error');
        randomizeProspectAction();
        scheduleGameSave();
    });
    document.getElementById('btn-randomise-identity').addEventListener('click', () => {
        clearValidationError('setup-error');
        randomizeIdentityAction();
        scheduleGameSave();
    });

    document.getElementById('btn-save-game').addEventListener('click', () => {
        saveGameState();
    });

    document.getElementById('btn-load-game').addEventListener('click', () => {
        if (loadGameState()) {
            clearValidationError('setup-error');
            clearValidationError('frame-error');
            showScene(state.currentScene);
        }
    });

    document.getElementById('btn-to-frame').addEventListener('click', () => {
        commitSetupForm();
        if (!state.setup.firstName || !state.setup.lastName) {
            showValidationError('setup-error', 'Enter both a first name and a last name before continuing.');
            focusMissingNameField();
            return;
        }

        clearValidationError('setup-error');

        showScene('frame');
    });

    document.getElementById('btn-allocate').addEventListener('click', () => {
        commitSetupForm();
        if (!state.setup.firstName || !state.setup.lastName) {
            showValidationError('frame-error', 'Finish the fighter identity before moving into allocation.');
            focusMissingNameField();
            return;
        }

        clearValidationError('frame-error');
        showScene('allocate');
    });

    document.getElementById('btn-back-frame').addEventListener('click', () => {
        showScene('frame');
    });

    document.getElementById('btn-back-setup').addEventListener('click', () => {
        showScene('setup');
    });

    document.getElementById('btn-finalize').addEventListener('click', () => {
        openProfileSceneAction();
    });

    document.getElementById('btn-profile-progress').addEventListener('click', () => {
        advanceProfileAction();
    });

    document.getElementById('btn-back-profile-from-opponent').addEventListener('click', () => {
        openProfileSceneAction();
    });

    document.getElementById('btn-begin-camp').addEventListener('click', () => {
        signContractAction();
    });

    document.getElementById('btn-back-profile-from-gym').addEventListener('click', () => {
        openProfileSceneAction();
    });

    document.getElementById('btn-fight-night').addEventListener('click', () => {
        if (!openWeighInAction()) {
            openFightSceneAction();
        }
    });

    document.getElementById('btn-close-weigh-in').addEventListener('click', () => {
        closeWeighInModal();
        openPreFightInterviewAction();
    });

    document.getElementById('btn-close-interview').addEventListener('click', () => {
        closeInterviewModal();
        // After a pre-fight presser, advance into the fight scene if camp is ready.
        // After a post-fight presser, drop back to the career hub.
        if (state.career.lastFightResult && state.career.contract === null) {
            openProfileSceneAction();
        } else {
            openFightSceneAction();
        }
    });

    document.getElementById('btn-back-gym').addEventListener('click', () => {
        openGymSceneAction();
    });

    document.getElementById('btn-simulate-fight').addEventListener('click', () => {
        if (simulateFightAction()) {
            openFightReplayModal(getFightViewModel());
        }
    });

    document.getElementById('btn-open-fight-replay').addEventListener('click', () => {
        openFightReplayModal(getFightViewModel());
    });

    document.getElementById('btn-close-fight-replay').addEventListener('click', () => {
        closeFightReplayModal();
    });

    document.getElementById('btn-post-fight-presser').addEventListener('click', () => {
        openPostFightInterviewAction();
    });

    document.getElementById('btn-fight-back-profile').addEventListener('click', () => {
        openProfileSceneAction();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        if (window.confirm('Start over from scratch? Your fighter will be discarded.')) {
            restartGameAction();
        }
    });

    document.getElementById('btn-reset-build').addEventListener('click', () => {
        handleBuildReset();
    });

    document.addEventListener('click', event => {
        if (event.target.closest('[data-close-fight-replay]')) {
            closeFightReplayModal();
            return;
        }

        if (event.target.closest('[data-close-weigh-in]')) {
            closeWeighInModal();
            openPreFightInterviewAction();
            return;
        }

        if (event.target.closest('[data-close-interview]')) {
            closeInterviewModal();
            return;
        }

        const presetButton = event.target.closest('[data-preset]');
        if (presetButton) {
            handlePresetSelection(presetButton.dataset.preset);
        }

        const opponentButton = event.target.closest('[data-opponent-id]');
        if (opponentButton) {
            selectOpponentAction(opponentButton.dataset.opponentId);
        }

        const eventButton = event.target.closest('[data-event-id]');
        if (eventButton) {
            selectEventAction(eventButton.dataset.eventId);
        }

        const coachButton = event.target.closest('[data-coach-id]');
        if (coachButton) {
            selectCoachAction(coachButton.dataset.coachId);
        }

        const gymActionButton = event.target.closest('[data-gym-action]');
        if (gymActionButton) {
            applyCampAction(gymActionButton.dataset.gymAction);
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeFightReplayModal();
            closeWeighInModal();
            closeInterviewModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    window.addEventListener(SAVE_META_EVENT, updateSaveUi);
    updateSaveUi();

    if (hasSavedGame()) {
        loadGameState();
    }

    showScene(state.currentScene);
});
