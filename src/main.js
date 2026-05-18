import './styles.css';
import './scenes/career-screens.css';

import { handleBuildReset, handlePresetSelection } from './scenes/allocation.js';
import {
    advanceProfileAction,
    applyCampAction,
    openFightSceneAction,
    openGymPickerSceneAction,
    openGymSceneAction,
    openInterviewSceneAction,
    openOpponentSceneAction,
    openProfileSceneAction,
    openWeighInSceneAction,
    proposeFightOfferAction,
    rejectPendingContractAction,
    selectCoachAction,
    selectGymAction,
    signPendingContractAction,
    simulateFightAction
} from './lib/actions/career-actions.js';
import { getSelectedCampSession, selectCampSession } from './scenes/gym.js';
import { getInterviewResult, handleInterviewAnswer, isInterviewComplete } from './scenes/interview.js';
import { isWeighInComplete } from './scenes/weigh-in.js';
import {
    backToPicker as backToOpponentPicker,
    getSelectedOffer,
    resetPickerPhase as resetOpponentPickerPhase,
    selectOfferByIndex
} from './scenes/opponent.js';
import {
    cancelSigningMode as cancelContractSigningMode,
    clearSignatureInk,
    enterSigningMode as enterContractSigningMode,
    hasSignatureInk,
    playStampAndExit
} from './scenes/contract.js';
import { closeFightReplayModal, openFightReplayModal } from './lib/fight-engine-bridge.js';
import { commitSetupForm, randomizeIdentityAction, randomizeProspectAction, restartGameAction } from './lib/actions/setup-actions.js';
import { state } from './lib/core.js';
import { formatSaveStatus, getSavedGameMeta, hasSavedGame, loadGameState, SAVE_META_EVENT, saveGameState, scheduleGameSave } from './lib/persistence.js';
import { getFightViewModel } from './lib/selectors/fight-selectors.js';
import { refreshCurrentScene, showScene } from './lib/scene-controller.js';
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
        resetOpponentPickerPhase();
        openProfileSceneAction();
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

    document.getElementById('btn-fight-back-profile').addEventListener('click', () => {
        openProfileSceneAction();
    });

    document.getElementById('btn-reset-build').addEventListener('click', () => {
        handleBuildReset();
    });

    document.addEventListener('click', event => {
        if (event.target.closest('[data-close-fight-replay]')) {
            closeFightReplayModal();
            return;
        }

        const presetButton = event.target.closest('[data-preset]');
        if (presetButton) {
            handlePresetSelection(presetButton.dataset.preset);
        }

        const offerCard = event.target.closest('[data-offer-index]');
        if (offerCard && offerCard.dataset.locked !== 'true') {
            const index = Number(offerCard.dataset.offerIndex);
            if (selectOfferByIndex(index)) {
                refreshCurrentScene();
            }
            return;
        }

        const offerActionButton = event.target.closest('[data-offer-action]');
        if (offerActionButton) {
            const action = offerActionButton.dataset.offerAction;
            if (action === 'back') {
                backToOpponentPicker();
                refreshCurrentScene();
                return;
            }
            if (action === 'accept') {
                const offer = getSelectedOffer();
                if (offer && offer.event && !offer.locked) {
                    proposeFightOfferAction({
                        opponentId: offer.opponent.id,
                        eventId: offer.event.id,
                        campWeeks: offer.campWeeks
                    });
                    resetOpponentPickerPhase();
                }
            }
            return;
        }

        const contractButton = event.target.closest('[data-contract-action]');
        if (contractButton) {
            const action = contractButton.dataset.contractAction;
            if (action === 'enter-sign') {
                enterContractSigningMode();
            } else if (action === 'clear') {
                clearSignatureInk();
            } else if (action === 'cancel-sign') {
                cancelContractSigningMode();
            } else if (action === 'confirm-sign') {
                if (!hasSignatureInk()) {
                    return;
                }
                playStampAndExit(() => signPendingContractAction());
            } else if (action === 'reject') {
                rejectPendingContractAction();
            } else if (action === 'back') {
                openOpponentSceneAction();
            }
            return;
        }

        const hubActionButton = event.target.closest('[data-hub-action]');
        if (hubActionButton) {
            if (hubActionButton.disabled) {
                return;
            }
            const action = hubActionButton.dataset.hubAction;
            if (action === 'fight-offers') {
                resetOpponentPickerPhase();
                openOpponentSceneAction();
            } else if (action === 'continue-camp') {
                openGymSceneAction();
            } else if (action === 'fight-night') {
                openFightSceneAction();
            }
            return;
        }

        const profileProgressButton = event.target.closest('#btn-profile-progress');
        if (profileProgressButton) {
            resetOpponentPickerPhase();
            advanceProfileAction();
            return;
        }

        const restartButton = event.target.closest('#btn-restart');
        if (restartButton) {
            if (window.confirm('Start over from scratch? Your fighter will be discarded.')) {
                restartGameAction();
            }
            return;
        }

        const backFromOpponent = event.target.closest('#btn-back-profile-from-opponent');
        if (backFromOpponent) {
            resetOpponentPickerPhase();
            openProfileSceneAction();
            return;
        }

        const answerButton = event.target.closest('[data-answer-idx]');
        if (answerButton) {
            if (answerButton.disabled) return;
            handleInterviewAnswer(Number(answerButton.dataset.answerIdx));
            return;
        }

        const interviewActionButton = event.target.closest('[data-interview-action]');
        if (interviewActionButton) {
            const action = interviewActionButton.dataset.interviewAction;
            if (action === 'finish') {
                if (isInterviewComplete()) {
                    const result = getInterviewResult();
                    // Bank earned hype as a pre-fight reputation bump.
                    const repBump = Math.max(0, Math.round(result.hype / 8));
                    if (repBump > 0) {
                        state.career.reputation += repBump;
                    }
                    openWeighInSceneAction();
                }
            } else if (action === 'back') {
                openProfileSceneAction();
            }
            return;
        }

        const weighActionButton = event.target.closest('[data-weigh-action]');
        if (weighActionButton) {
            if (weighActionButton.disabled) return;
            const action = weighActionButton.dataset.weighAction;
            if (action === 'walk') {
                if (isWeighInComplete()) {
                    openFightSceneAction();
                }
            } else if (action === 'back') {
                openProfileSceneAction();
            }
            return;
        }

        const gymPickButton = event.target.closest('[data-gym-pick]');
        if (gymPickButton) {
            if (gymPickButton.disabled) {
                return;
            }
            selectGymAction(gymPickButton.dataset.gymPick);
            return;
        }

        const gymPickerActionButton = event.target.closest('[data-gym-picker-action]');
        if (gymPickerActionButton) {
            if (gymPickerActionButton.dataset.gymPickerAction === 'back') {
                openProfileSceneAction();
            }
            return;
        }

        const sessionRow = event.target.closest('[data-session-key]');
        if (sessionRow) {
            if (sessionRow.disabled) {
                return;
            }
            selectCampSession(sessionRow.dataset.sessionKey);
            refreshCurrentScene();
            return;
        }

        const campActionButton = event.target.closest('[data-camp-action]');
        if (campActionButton) {
            const action = campActionButton.dataset.campAction;
            if (action === 'commit') {
                const campDone = state.career.campWeeksCompleted >= state.career.campWeeksTotal;
                if (campDone) {
                    openFightSceneAction();
                    return;
                }
                applyCampAction(getSelectedCampSession());
            } else if (action === 'back') {
                openProfileSceneAction();
            } else if (action === 'goto-picker') {
                openGymPickerSceneAction();
            }
            return;
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
