import { SCHEMA_VERSION } from './schema-version.js';

// Each migration is keyed by the source version and returns the next-version snapshot.
// When introducing a breaking state change, bump SCHEMA_VERSION and add an entry here that
// upgrades the previous shape to the new one.
const MIGRATIONS = {};

function detectVersion(snapshot) {
    if (Number.isInteger(snapshot.saveVersion)) {
        return snapshot.saveVersion;
    }
    return 1;
}

export function migrateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return null;
    }

    let current = snapshot;
    let version = detectVersion(current);

    if (version > SCHEMA_VERSION) {
        return null;
    }

    while (version < SCHEMA_VERSION) {
        const step = MIGRATIONS[version];
        if (typeof step !== 'function') {
            return null;
        }
        current = step(current);
        version += 1;
    }

    return { ...current, saveVersion: SCHEMA_VERSION };
}
