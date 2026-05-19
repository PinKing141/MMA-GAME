import { hydrateState, state } from './core.js';
import { migrateSnapshot } from './state/migrations.js';
import { SCHEMA_VERSION } from './state/schema-version.js';

/**
 * Multi-slot save system.
 *
 * Storage shape:
 *   cage-mma-career-save-index: { slots: [{ id, name, ... }], activeSlotId }
 *   cage-mma-career-slot-<id>: { version, savedAt, snapshot, meta }
 *
 * "Slot 0" is the auto-save slot — kept for backwards-compatibility
 * with the old single-save format and used by scheduleGameSave().
 *
 * Cloud-save equivalent: any slot can be exported to JSON and
 * imported on another device. The export format is portable and
 * versioned so it round-trips cleanly.
 */

const INDEX_KEY = 'cage-mma-career-save-index';
const SLOT_KEY_PREFIX = 'cage-mma-career-slot-';
const LEGACY_KEY = 'cage-mma-career-save-v1';
const STORAGE_VERSION = 2;
const SAVE_DELAY_MS = 180;
const AUTO_SLOT_ID = 'auto';
const MAX_SLOTS = 8;

export const SAVE_META_EVENT = 'cage:save-meta';
export const EXPORT_MIME = 'application/json';

let saveTimer = null;

function getStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function slotKey(id) {
    return `${SLOT_KEY_PREFIX}${id}`;
}

function readIndex() {
    const storage = getStorage();
    if (!storage) return { slots: [], activeSlotId: AUTO_SLOT_ID };
    try {
        const raw = storage.getItem(INDEX_KEY);
        if (!raw) return { slots: [], activeSlotId: AUTO_SLOT_ID };
        const parsed = JSON.parse(raw);
        return {
            slots: Array.isArray(parsed.slots) ? parsed.slots : [],
            activeSlotId: parsed.activeSlotId || AUTO_SLOT_ID
        };
    } catch {
        return { slots: [], activeSlotId: AUTO_SLOT_ID };
    }
}

function writeIndex(index) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(INDEX_KEY, JSON.stringify(index));
}

function readSlotPayload(slotId) {
    const storage = getStorage();
    if (!storage) return null;
    try {
        const raw = storage.getItem(slotKey(slotId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed.snapshot) return null;
        return parsed;
    } catch {
        return null;
    }
}

function buildSlotMeta(snapshot) {
    const career = snapshot.career || {};
    const record = career.record || { wins: 0, losses: 0, draws: 0, finishes: 0 };
    const setup = snapshot.setup || {};
    const fighterName = [setup.firstName, setup.lastName].filter(Boolean).join(' ').trim() || 'Unnamed Prospect';
    const totalFights = record.wins + record.losses + record.draws;
    return {
        fighterName,
        countryCode: setup.country?.code || null,
        countryName: setup.country?.name || null,
        record: `${record.wins}-${record.losses}-${record.draws}`,
        totalFights,
        finishes: record.finishes || 0,
        reputation: career.reputation || 0,
        cash: career.cash || 0,
        currentScene: snapshot.currentScene || 'setup',
        promotionId: career.playerPromotionId || null,
        worldWeek: career.world?.lastTickWeek || 0,
        rivalryCount: Object.keys(career.rivalries || {}).length,
        rankedSlot: getRankedSlotForPlayer(career)
    };
}

function getRankedSlotForPlayer(career) {
    if (!career?.world?.publishedRankings) return null;
    const promoId = career.playerPromotionId;
    const ranks = career.world.publishedRankings[promoId];
    if (!ranks) return null;
    for (const wcKey of Object.keys(ranks)) {
        const entry = (ranks[wcKey] || []).find(s => s.fighterId === 'PLAYER');
        if (entry) return { weightClassKey: wcKey, rank: entry.rank };
    }
    return null;
}

function buildPayload({ slotId, slotName }) {
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.saveVersion = SCHEMA_VERSION;
    const meta = buildSlotMeta(snapshot);
    return {
        version: STORAGE_VERSION,
        slotId,
        slotName: slotName || meta.fighterName,
        savedAt: new Date().toISOString(),
        meta,
        snapshot
    };
}

function emitSaveMeta(savedAt, slotId) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SAVE_META_EVENT, {
        detail: { savedAt, slotId }
    }));
}

/* -------------------------------------------------------------- */
/* Legacy migration: hoist the v1 single-save into the auto slot.  */
/* -------------------------------------------------------------- */
function migrateLegacyIfNeeded() {
    const storage = getStorage();
    if (!storage) return;
    const legacy = storage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const indexExists = storage.getItem(INDEX_KEY);
    if (indexExists) return; // Already migrated.
    try {
        const parsed = JSON.parse(legacy);
        if (!parsed?.snapshot) return;
        const meta = buildSlotMeta(parsed.snapshot);
        storage.setItem(slotKey(AUTO_SLOT_ID), JSON.stringify({
            version: STORAGE_VERSION,
            slotId: AUTO_SLOT_ID,
            slotName: meta.fighterName,
            savedAt: parsed.savedAt || new Date().toISOString(),
            meta,
            snapshot: parsed.snapshot
        }));
        writeIndex({
            slots: [{
                id: AUTO_SLOT_ID,
                name: meta.fighterName,
                createdAt: parsed.savedAt || new Date().toISOString(),
                savedAt: parsed.savedAt || new Date().toISOString(),
                meta,
                isAuto: true
            }],
            activeSlotId: AUTO_SLOT_ID
        });
        storage.removeItem(LEGACY_KEY);
    } catch {
        /* ignore */
    }
}

migrateLegacyIfNeeded();

/* -------------------------------------------------------------- */
/* Slot CRUD                                                       */
/* -------------------------------------------------------------- */

/**
 * Return all save slots in display order (auto first, then newest
 * manual saves first).
 */
export function listSaveSlots() {
    const index = readIndex();
    const auto = index.slots.find(s => s.id === AUTO_SLOT_ID);
    const manual = index.slots
        .filter(s => s.id !== AUTO_SLOT_ID)
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    return [auto, ...manual].filter(Boolean);
}

export function getActiveSlotId() {
    return readIndex().activeSlotId;
}

export function setActiveSlot(slotId) {
    const index = readIndex();
    index.activeSlotId = slotId;
    writeIndex(index);
}

function generateSlotId() {
    return `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Save the current state into a slot. If no slotId is provided,
 * saves into the auto slot. If the slot doesn't exist, it's created.
 */
export function saveToSlot({ slotId = AUTO_SLOT_ID, name = null, isAuto = slotId === AUTO_SLOT_ID } = {}) {
    const storage = getStorage();
    if (!storage) return null;

    const index = readIndex();
    const existing = index.slots.find(s => s.id === slotId);
    const payload = buildPayload({ slotId, slotName: name || existing?.name });
    storage.setItem(slotKey(slotId), JSON.stringify(payload));

    const entry = {
        id: slotId,
        name: payload.slotName,
        createdAt: existing?.createdAt || payload.savedAt,
        savedAt: payload.savedAt,
        meta: payload.meta,
        isAuto
    };

    if (existing) {
        Object.assign(existing, entry);
    } else {
        index.slots.push(entry);
    }
    // Cap manual slots so the index doesn't grow unbounded.
    const manualSlots = index.slots.filter(s => s.id !== AUTO_SLOT_ID);
    if (manualSlots.length > MAX_SLOTS) {
        const oldest = manualSlots.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt))[0];
        storage.removeItem(slotKey(oldest.id));
        index.slots = index.slots.filter(s => s.id !== oldest.id);
    }
    index.activeSlotId = slotId;
    writeIndex(index);

    emitSaveMeta(payload.savedAt, slotId);
    return { slotId, savedAt: payload.savedAt, meta: payload.meta };
}

/**
 * Manual "save as" — always creates a fresh slot with a name.
 */
export function createNewSlot(name) {
    return saveToSlot({ slotId: generateSlotId(), name, isAuto: false });
}

/**
 * Load a specific slot into the live state.
 */
export function loadFromSlot(slotId = AUTO_SLOT_ID) {
    const payload = readSlotPayload(slotId);
    if (!payload) return false;
    const migrated = migrateSnapshot(payload.snapshot);
    if (!migrated) return false;
    if (!hydrateState(migrated)) return false;
    setActiveSlot(slotId);
    emitSaveMeta(payload.savedAt, slotId);
    return true;
}

export function deleteSlot(slotId) {
    if (slotId === AUTO_SLOT_ID) return false; // Auto slot is protected.
    const storage = getStorage();
    if (!storage) return false;
    storage.removeItem(slotKey(slotId));
    const index = readIndex();
    index.slots = index.slots.filter(s => s.id !== slotId);
    if (index.activeSlotId === slotId) {
        index.activeSlotId = AUTO_SLOT_ID;
    }
    writeIndex(index);
    return true;
}

export function renameSlot(slotId, name) {
    const storage = getStorage();
    if (!storage) return false;
    const payload = readSlotPayload(slotId);
    if (!payload) return false;
    payload.slotName = name;
    storage.setItem(slotKey(slotId), JSON.stringify(payload));
    const index = readIndex();
    const entry = index.slots.find(s => s.id === slotId);
    if (entry) entry.name = name;
    writeIndex(index);
    return true;
}

/* -------------------------------------------------------------- */
/* Export / Import (cloud-equivalent portability)                  */
/* -------------------------------------------------------------- */

/**
 * Build an exportable JSON string for a slot. Used by the "Export"
 * button in the save manager.
 */
export function exportSlotJson(slotId = AUTO_SLOT_ID) {
    const payload = readSlotPayload(slotId);
    if (!payload) return null;
    return JSON.stringify({
        format: 'cage-mma-save',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        slotName: payload.slotName,
        savedAt: payload.savedAt,
        meta: payload.meta,
        snapshot: payload.snapshot,
        schemaVersion: payload.snapshot?.saveVersion || SCHEMA_VERSION
    }, null, 2);
}

/**
 * Import a previously-exported save into a new slot. Returns the
 * created slot id, or null on failure.
 */
export function importSlotJson(jsonString) {
    let payload;
    try {
        payload = JSON.parse(jsonString);
    } catch {
        return null;
    }
    if (payload?.format !== 'cage-mma-save' || !payload?.snapshot) {
        return null;
    }
    const id = generateSlotId();
    const storage = getStorage();
    if (!storage) return null;
    const slotName = payload.slotName || payload.meta?.fighterName || 'Imported save';
    const savedAt = payload.savedAt || new Date().toISOString();
    storage.setItem(slotKey(id), JSON.stringify({
        version: STORAGE_VERSION,
        slotId: id,
        slotName,
        savedAt,
        meta: payload.meta || buildSlotMeta(payload.snapshot),
        snapshot: payload.snapshot
    }));
    const index = readIndex();
    index.slots.push({
        id,
        name: slotName,
        createdAt: savedAt,
        savedAt,
        meta: payload.meta || buildSlotMeta(payload.snapshot),
        isAuto: false,
        imported: true
    });
    writeIndex(index);
    return id;
}

/**
 * Trigger a browser download of the slot JSON. The save manager UI
 * uses this directly.
 */
export function downloadSlotExport(slotId, filename = null) {
    const json = exportSlotJson(slotId);
    if (!json) return false;
    const blob = new Blob([json], { type: EXPORT_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slot = readIndex().slots.find(s => s.id === slotId);
    const safeName = (slot?.name || 'save').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    a.href = url;
    a.download = filename || `cage-${safeName}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
}

/* -------------------------------------------------------------- */
/* Status helpers (backwards-compatible API used by main.js)       */
/* -------------------------------------------------------------- */

export function formatSaveStatus(meta) {
    if (!meta?.savedAt) return 'No save yet';
    const savedAt = new Date(meta.savedAt);
    if (Number.isNaN(savedAt.getTime())) return 'Save ready';
    return `Saved ${savedAt.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })}`;
}

export function getSavedGameMeta() {
    const activeId = getActiveSlotId();
    const slots = listSaveSlots();
    const slot = slots.find(s => s.id === activeId) || slots[0];
    return slot ? { savedAt: slot.savedAt, slotId: slot.id, name: slot.name, meta: slot.meta } : null;
}

export function hasSavedGame() {
    return listSaveSlots().length > 0;
}

/* -------------------------------------------------------------- */
/* Back-compat API used by existing callers                        */
/* -------------------------------------------------------------- */

export function saveGameState() {
    return saveToSlot({ slotId: AUTO_SLOT_ID, isAuto: true });
}

export function scheduleGameSave() {
    if (!getStorage()) return false;
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveGameState(), SAVE_DELAY_MS);
    return true;
}

export function loadGameState() {
    const activeId = getActiveSlotId();
    return loadFromSlot(activeId);
}
