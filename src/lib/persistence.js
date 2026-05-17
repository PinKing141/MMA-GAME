import { hydrateState, state } from './core.js';
import { migrateSnapshot } from './state/migrations.js';
import { SCHEMA_VERSION } from './state/schema-version.js';

const STORAGE_KEY = 'cage-mma-career-save-v1';
const STORAGE_VERSION = 1;
const SAVE_DELAY_MS = 180;

export const SAVE_META_EVENT = 'cage:save-meta';

let saveTimer = null;

function getStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function readPayload() {
    const storage = getStorage();
    if (!storage) {
        return null;
    }

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const payload = JSON.parse(raw);
        if (payload?.version !== STORAGE_VERSION || !payload.snapshot) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

function emitSaveMeta(savedAt) {
    window.dispatchEvent(new CustomEvent(SAVE_META_EVENT, {
        detail: { savedAt }
    }));
}

function buildPayload() {
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.saveVersion = SCHEMA_VERSION;
    return {
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        snapshot
    };
}

export function formatSaveStatus(meta) {
    if (!meta?.savedAt) {
        return 'No save yet';
    }

    const savedAt = new Date(meta.savedAt);
    if (Number.isNaN(savedAt.getTime())) {
        return 'Save ready';
    }

    return `Saved ${savedAt.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })}`;
}

export function getSavedGameMeta() {
    const payload = readPayload();
    return payload ? { savedAt: payload.savedAt } : null;
}

export function hasSavedGame() {
    return Boolean(readPayload());
}

export function saveGameState() {
    const storage = getStorage();
    if (!storage) {
        return null;
    }

    const payload = buildPayload();
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    emitSaveMeta(payload.savedAt);
    return { savedAt: payload.savedAt };
}

export function scheduleGameSave() {
    if (!getStorage()) {
        return false;
    }

    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
        saveGameState();
    }, SAVE_DELAY_MS);
    return true;
}

export function loadGameState() {
    const payload = readPayload();
    if (!payload) {
        return false;
    }

    const migrated = migrateSnapshot(payload.snapshot);
    if (!migrated) {
        return false;
    }

    const didHydrate = hydrateState(migrated);
    if (!didHydrate) {
        return false;
    }

    emitSaveMeta(payload.savedAt);
    return true;
}