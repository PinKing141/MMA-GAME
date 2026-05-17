/*
 * Interview bridge — loads /interview/index.html in the modal iframe,
 * waits for its window.Interview API, configures the fighters/format,
 * and starts the press conference.
 */

const INTERVIEW_SRC = '/interview/index.html?embed=1';

let loadPromise = null;

function getFrame() {
    return document.getElementById('interview-frame');
}

function getModal() {
    return document.getElementById('interview-modal');
}

function waitForApi(frame) {
    return new Promise(resolve => {
        let attempts = 0;
        const tryResolve = () => {
            const api = frame?.contentWindow?.Interview;
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
        frame.setAttribute('src', INTERVIEW_SRC);
    }

    if (frame.contentWindow?.Interview) {
        return Promise.resolve(frame.contentWindow.Interview);
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

function updateModalChrome({ format }) {
    const titleEl = document.getElementById('interview-modal-title');
    const eyebrowEl = document.getElementById('interview-modal-eyebrow');
    if (format === 'post_fight') {
        if (eyebrowEl) eyebrowEl.textContent = 'After The Bell';
        if (titleEl) titleEl.textContent = 'Post-Fight Press Conference';
    } else {
        if (eyebrowEl) eyebrowEl.textContent = 'Fight Week';
        if (titleEl) titleEl.textContent = 'Pre-Fight Press Conference';
    }
}

export function openInterviewModal({ red, blue, venue = 'regional', format = 'pre_fight', hype = 0 } = {}) {
    updateModalChrome({ format });
    toggleModal(true);
    return ensureLoaded().then(api => {
        if (!api) return null;
        api.setVenue(venue);
        api.setFormat(format);
        api.setFighters(red, blue);
        api.setHype(hype);
        return api.run();
    });
}

export function closeInterviewModal() {
    toggleModal(false);
}
