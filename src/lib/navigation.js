const SCENE_META = {
    setup: { phaseLabel: 'Phase 1', phaseName: 'Create Fighter' },
    frame: { phaseLabel: 'Phase 2', phaseName: 'Set Frame' },
    allocate: { phaseLabel: 'Phase 3', phaseName: 'Build Style' },
    profile: { phaseLabel: 'Phase 4', phaseName: 'Career Hub' },
    opponent: { phaseLabel: 'Phase 5', phaseName: 'Fight Offers' },
    contract: { phaseLabel: 'Phase 6', phaseName: 'Contract Office' },
    gym: { phaseLabel: 'Phase 7', phaseName: 'Training Camp' },
    fight: { phaseLabel: 'Phase 8', phaseName: 'Fight Night' }
};

export function gotoScene(sceneName) {
    document.querySelectorAll('.scene').forEach(scene => scene.classList.remove('active'));
    document.getElementById(`scene-${sceneName}`).classList.add('active');

    const sceneMeta = SCENE_META[sceneName] || SCENE_META.setup;

    document.getElementById('phase-label').textContent = sceneMeta.phaseLabel;
    const phaseName = document.getElementById('phase-name');
    if (phaseName) {
        phaseName.textContent = sceneMeta.phaseName;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
