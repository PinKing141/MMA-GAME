const FIGHT_ENGINE_SRC = '/fight-engine/index.html';

let loadPromise = null;

function getFrame() {
    return document.getElementById('fight-engine-frame');
}

function getModal() {
    return document.getElementById('fight-replay-modal');
}

function waitForApi(frame) {
    return new Promise(resolve => {
        let attempts = 0;

        function tryResolve() {
            const api = frame?.contentWindow?.OctagonSim;
            if (api) {
                resolve(api);
                return true;
            }

            attempts += 1;
            if (attempts >= 80) {
                resolve(null);
                return true;
            }

            return false;
        }

        if (tryResolve()) {
            return;
        }

        const interval = window.setInterval(() => {
            if (tryResolve()) {
                window.clearInterval(interval);
            }
        }, 50);
    });
}

function ensureLoaded() {
    const frame = getFrame();
    if (!frame) {
        return Promise.resolve(null);
    }

    if (!frame.getAttribute('src')) {
        frame.setAttribute('src', FIGHT_ENGINE_SRC);
    }

    if (frame.contentWindow?.OctagonSim) {
        return Promise.resolve(frame.contentWindow.OctagonSim);
    }

    if (!loadPromise) {
        loadPromise = new Promise(resolve => {
            const complete = () => {
                waitForApi(frame).then(resolve);
            };

            frame.addEventListener('load', complete, { once: true });
        });
    }

    return loadPromise;
}

function toggleModal(open) {
    const modal = getModal();
    if (!modal) {
        return;
    }

    modal.hidden = !open;
    modal.classList.toggle('open', open);
    document.body.classList.toggle('fight-replay-open', open);
}

function loadReplayIntoFrame(api, replay) {
    if (!api || !replay) {
        return false;
    }

    api.pause();
    api.loadReplay(replay);
    return true;
}

export function openFightReplayModal(vm) {
    if (!vm?.replay) {
        return false;
    }

    toggleModal(true);

    ensureLoaded().then(api => {
        if (loadReplayIntoFrame(api, vm.replay)) {
            api.play();
        }
    });

    return true;
}

export function closeFightReplayModal() {
    ensureLoaded().then(api => {
        api?.pause();
    });

    toggleModal(false);
}