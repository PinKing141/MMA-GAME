export function gotoScene(sceneName) {
    document.querySelectorAll('.scene').forEach(scene => scene.classList.remove('active'));
    document.getElementById(`scene-${sceneName}`).classList.add('active');

    const phaseLabel = {
        setup: 'Phase 1',
        frame: 'Phase 2',
        allocate: 'Phase 3',
        profile: 'Phase 4',
        opponent: 'Phase 5',
        gym: 'Phase 6',
        fight: 'Phase 7'
    }[sceneName] || 'Phase 1';

    document.getElementById('phase-label').textContent = phaseLabel;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
