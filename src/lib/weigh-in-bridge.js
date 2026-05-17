/*
 * Weigh-in bridge — loads /weigh-in/index.html in the modal iframe,
 * waits for its window.WeighIn API, hands over the two fighters,
 * runs the ceremony, then resolves with the outcome.
 */

const WEIGH_IN_SRC = '/weigh-in/index.html?embed=1';

let loadPromise = null;

function getFrame() {
    return document.getElementById('weigh-in-frame');
}

function getModal() {
    return document.getElementById('weigh-in-modal');
}

function waitForApi(frame) {
    return new Promise(resolve => {
        let attempts = 0;
        const tryResolve = () => {
            const api = frame?.contentWindow?.WeighIn;
            if (api) { resolve(api); return true; }
            attempts += 1;
            if (attempts >= 80) { resolve(null); return true; }
            return false;
        };
        if (tryResolve()) return;
        const interval = window.setInterval(() => {
            if (tryResolve()) window.clearInterval(interval);
        }, 50);
    });
}

function ensureLoaded() {
    const frame = getFrame();
    if (!frame) return Promise.resolve(null);

    if (!frame.getAttribute('src')) {
        frame.setAttribute('src', WEIGH_IN_SRC);
    }

    if (frame.contentWindow?.WeighIn) {
        return Promise.resolve(frame.contentWindow.WeighIn);
    }

    if (!loadPromise) {
        loadPromise = new Promise(resolve => {
            const complete = () => waitForApi(frame).then(resolve);
            frame.addEventListener('load', complete, { once: true });
        });
    }
    return loadPromise;
}

function toggleModal(open) {
    const modal = getModal();
    if (!modal) return;
    modal.hidden = !open;
    modal.classList.toggle('open', open);
    document.body.classList.toggle('fight-replay-open', open);
}

export function openWeighInModal({ red, blue, venue = 'regional' } = {}) {
    toggleModal(true);
    return ensureLoaded().then(api => {
        if (!api) return null;
        api.setVenue(venue);
        api.setFighters(red, blue);
        return api.autoRun();
    });
}

export function closeWeighInModal() {
    toggleModal(false);
}
