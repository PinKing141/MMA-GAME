/**
 * Cross-save meta store. Lives in its own localStorage key so it
 * survives individual save slots being deleted — players keep their
 * achievements and leaderboard standings across multiple careers and
 * across New Game+ runs.
 *
 * Shape:
 *   {
 *     formatVersion: 1,
 *     achievements: { [achievementId]: { unlockedAt, careerId } },
 *     leaderboards: { [boardKey]: LeaderboardEntry[] },
 *     ngPlusTier: 0,
 *     completedCareers: CompletedCareerSummary[],
 *     settings: { difficulty: 'normal', audio: {...} }
 *   }
 */

const META_KEY = 'cage-mma-meta-v1';
const FORMAT_VERSION = 1;
const MAX_LEADERBOARD_ENTRIES = 20;
const MAX_COMPLETED_CAREERS = 50;

function getStorage() {
    try { return window.localStorage; } catch { return null; }
}

function readRaw() {
    const storage = getStorage();
    if (!storage) return defaultMeta();
    try {
        const raw = storage.getItem(META_KEY);
        if (!raw) return defaultMeta();
        const parsed = JSON.parse(raw);
        return { ...defaultMeta(), ...parsed };
    } catch {
        return defaultMeta();
    }
}

function writeRaw(meta) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(META_KEY, JSON.stringify(meta));
}

function defaultMeta() {
    return {
        formatVersion: FORMAT_VERSION,
        achievements: {},
        leaderboards: {},
        ngPlusTier: 0,
        completedCareers: [],
        settings: {
            difficulty: 'normal',
            audio: { master: 0.65 }
        }
    };
}

/* ----- Achievements ----- */
export function getUnlockedAchievements() {
    return readRaw().achievements;
}

export function isAchievementUnlocked(id) {
    return Boolean(readRaw().achievements[id]);
}

export function unlockAchievement(id, careerId = null) {
    const meta = readRaw();
    if (meta.achievements[id]) return false;
    meta.achievements[id] = {
        unlockedAt: new Date().toISOString(),
        careerId
    };
    writeRaw(meta);
    return true;
}

/* ----- Leaderboards ----- */
export function getLeaderboard(boardKey) {
    return readRaw().leaderboards[boardKey] || [];
}

export function getAllLeaderboards() {
    return readRaw().leaderboards;
}

/**
 * Submit an entry to a leaderboard. Boards are sorted by `value`
 * descending (or ascending if `lowerIsBetter`). Top MAX_LEADERBOARD_ENTRIES
 * are kept.
 */
export function submitLeaderboardEntry(boardKey, entry, { lowerIsBetter = false } = {}) {
    const meta = readRaw();
    const board = meta.leaderboards[boardKey] || [];
    board.push({
        ...entry,
        submittedAt: new Date().toISOString()
    });
    board.sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
    meta.leaderboards[boardKey] = board.slice(0, MAX_LEADERBOARD_ENTRIES);
    writeRaw(meta);
    return meta.leaderboards[boardKey];
}

/* ----- Settings ----- */
export function getMetaSettings() {
    return readRaw().settings;
}

export function setDifficulty(level) {
    const meta = readRaw();
    meta.settings.difficulty = level;
    writeRaw(meta);
}

export function getDifficulty() {
    return readRaw().settings.difficulty || 'normal';
}

/* ----- NG+ ----- */
export function getNGPlusTier() {
    return readRaw().ngPlusTier || 0;
}

export function bumpNGPlusTier() {
    const meta = readRaw();
    meta.ngPlusTier = (meta.ngPlusTier || 0) + 1;
    writeRaw(meta);
    return meta.ngPlusTier;
}

/* ----- Career completion ----- */
export function recordCompletedCareer(summary) {
    const meta = readRaw();
    meta.completedCareers.unshift({
        ...summary,
        recordedAt: new Date().toISOString()
    });
    meta.completedCareers = meta.completedCareers.slice(0, MAX_COMPLETED_CAREERS);
    writeRaw(meta);
}

export function getCompletedCareers() {
    return readRaw().completedCareers;
}
