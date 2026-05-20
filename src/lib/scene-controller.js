import { state } from './core.js';
import { gotoScene } from './navigation.js';
import { scheduleGameSave } from './persistence.js';
import { renderAllocationScene } from '../scenes/allocation.js';
import { renderContractScene } from '../scenes/contract.js';
import { renderFightScene } from '../scenes/fight.js';
import { renderPostFightScene } from '../scenes/post-fight.js';
import { renderGymPickerScene } from '../scenes/gym-picker.js';
import { renderGymScene } from '../scenes/gym.js';
import { renderInterviewScene } from '../scenes/interview.js';
import { renderOpponentScene } from '../scenes/opponent.js';
import { renderWeighInScene } from '../scenes/weigh-in.js';
import { renderProfile } from '../scenes/profile.js';
import { renderNations, renderWeightClasses, syncFrameControls, syncSetupFormFromState, updatePreview } from '../scenes/setup.js';

function renderSetupLikeScene() {
    renderNations();
    renderWeightClasses();
    syncSetupFormFromState();
    syncFrameControls({ preserveValues: false });
    updatePreview();
}

function renderAllocateScene() {
    document.getElementById('alloc-name').textContent = `${state.setup.firstName} ${state.setup.lastName} · ${state.setup.country.name}`;
    renderAllocationScene();
}

const SCENE_RENDERERS = {
    setup: renderSetupLikeScene,
    frame: renderSetupLikeScene,
    allocate: renderAllocateScene,
    profile: renderProfile,
    opponent: renderOpponentScene,
    contract: renderContractScene,
    'gym-picker': renderGymPickerScene,
    gym: renderGymScene,
    interview: renderInterviewScene,
    'weigh-in': renderWeighInScene,
    fight: renderFightScene,
    'post-fight': renderPostFightScene
};

export function renderScene(sceneName = state.currentScene) {
    const render = SCENE_RENDERERS[sceneName];
    if (render) {
        render();
    }
}

export function refreshCurrentScene() {
    renderScene(state.currentScene);
    scheduleGameSave();
}

export function showScene(sceneName) {
    state.currentScene = sceneName;
    renderScene(sceneName);
    gotoScene(sceneName);
    scheduleGameSave();
}