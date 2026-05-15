import { getOverallAverage, getWeightClassEntry, state } from '../lib/core.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

function formatRecord(record) {
    return `${record.wins}-${record.losses}-${record.draws}`;
}

function getPlayerRankingKey() {
    return getWeightClassEntry(state.setup.weight).key;
}

function getPlayerRank() {
    return state.career.playerRankings[getPlayerRankingKey()] ?? null;
}

function getRankLabel(rank) {
    return rank ? `#${rank}` : 'NR';
}

function getWeightCutBaseline(opponent = null) {
    const weightClass = getWeightClassEntry(state.setup.weight);
    const spread = Math.max(1, weightClass.max - weightClass.min);
    const classRatio = (state.setup.weight - weightClass.min) / spread;
    const opponentAdjustment = opponent ? Math.max(0, 7 - (Math.min(opponent.rank || 30, 30) / 5)) : 0;
    return clamp(Math.round(14 + (classRatio * 18) + opponentAdjustment), 10, 48);
}

function syncAvailableOpponents() {
    const weightClassKey = getPlayerRankingKey();
    state.career.availableOpponents = state.career.roster
        .filter(opponent => opponent.weightClassKey === weightClassKey)
        .sort((left, right) => left.rank - right.rank);
}

function renderRankingBoard() {
    const playerRank = getPlayerRank();
    const rankingRows = [
        ...state.career.availableOpponents.map(opponent => ({
            key: opponent.id,
            rank: opponent.rank,
            label: opponent.name,
            meta: `${opponent.nickname} · ${formatRecord(opponent.record)}`,
            isPlayer: false
        })),
        {
            key: 'player',
            rank: playerRank,
            label: [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter',
            meta: playerRank ? 'Player ranking' : 'Unranked contender',
            isPlayer: true
        }
    ].sort((left, right) => {
        if (left.rank === null && right.rank === null) {
            return left.label.localeCompare(right.label);
        }

        if (left.rank === null) {
            return 1;
        }

        if (right.rank === null) {
            return -1;
        }

        return left.rank - right.rank;
    });

    return rankingRows.map(entry => `
        <div class="ranking-row ${entry.isPlayer ? 'player' : ''}">
            <span class="ranking-rank">${getRankLabel(entry.rank)}</span>
            <div>
                <div class="ranking-name">${entry.label}</div>
                <div class="ranking-meta">${entry.meta}</div>
            </div>
        </div>
    `).join('');
}

function renderOpponentCards() {
    return state.career.availableOpponents.map(opponent => `
        <button class="opponent-card ${state.career.selectedOpponent?.id === opponent.id ? 'selected' : ''}" data-opponent-id="${opponent.id}">
            <div class="opponent-card-head">
                <div>
                    <div class="opponent-card-name">${opponent.name}</div>
                    <div class="opponent-card-sub">${opponent.nickname} · ${formatRecord(opponent.record)}</div>
                </div>
                <div class="opponent-ovr">${opponent.overall}</div>
            </div>
            <div class="opponent-card-meta">${getRankLabel(opponent.rank)} · ${opponent.archetype.name} · ${opponent.difficulty}</div>
            <p class="opponent-card-copy">${opponent.blurb}</p>
            <div class="opponent-card-economy">Purse ${formatMoney(opponent.purse)} · Gym pull ${opponent.gymReputation}</div>
        </button>
    `).join('');
}

function renderSelectedOpponentSummary() {
    const opponent = state.career.selectedOpponent;

    if (!opponent) {
        return '<p class="opponent-summary-empty">No opponent selected yet. Pick the matchup before camp starts.</p>';
    }

    return `
        <div class="opponent-summary-block">
            <div class="opponent-summary-name">${opponent.name}</div>
            <div class="opponent-summary-meta">${opponent.nickname} · ${formatRecord(opponent.record)} · ${opponent.archetype.name}</div>
            <p class="opponent-summary-copy">${opponent.blurb}</p>
        </div>
        <div class="career-row opponent-summary-stats">
            <div class="career-stat">
                <div class="label">Rank</div>
                <div class="value">${getRankLabel(opponent.rank)}</div>
            </div>
            <div class="career-stat">
                <div class="label">Overall</div>
                <div class="value">${opponent.overall}</div>
            </div>
            <div class="career-stat">
                <div class="label">Difficulty</div>
                <div class="value">${opponent.difficulty}</div>
            </div>
            <div class="career-stat">
                <div class="label">Purse</div>
                <div class="value opponent-money">${formatMoney(opponent.purse)}</div>
            </div>
        </div>
    `;
}

export function renderOpponentScene() {
    syncAvailableOpponents();

    document.getElementById('opponent-player-ovr').textContent = getOverallAverage(state.stats);
    document.getElementById('opponent-player-class').textContent = getWeightClassEntry(state.setup.weight).name;
    document.getElementById('opponent-player-rank').textContent = getRankLabel(getPlayerRank());
    document.getElementById('opponent-player-cash').textContent = formatMoney(state.career.cash);
    document.getElementById('opponent-cards').innerHTML = renderOpponentCards();
    document.getElementById('opponent-summary').innerHTML = renderSelectedOpponentSummary();
    document.getElementById('opponent-rankings').innerHTML = renderRankingBoard();
    document.getElementById('opponent-cut-note').textContent = `Projected weight-cut pressure starts around ${getWeightCutBaseline(state.career.selectedOpponent)}% before camp choices shift it.`;
    document.getElementById('btn-begin-camp').disabled = !state.career.selectedOpponent;
}

export function selectOpponent(opponentId) {
    const opponent = state.career.availableOpponents.find(entry => entry.id === opponentId);
    if (!opponent) {
        return;
    }

    state.career.selectedOpponent = opponent;
    state.career.selectedCoach = null;
    state.career.campWeeksCompleted = 0;
    state.career.campWeeksTotal = 4;
    state.career.fatigue = 0;
    state.career.weightCutPressure = getWeightCutBaseline(opponent);
    state.career.overtrainingWarnings = 0;
    state.career.injuries = [];
    state.career.trainingHistory = [];

    renderOpponentScene();
}