import { syncAvailableEvents } from '../lib/actions/event-actions.js';
import { syncAvailableOpponents } from '../lib/actions/career-state.js';
import { getOpponentViewModel } from '../lib/selectors/event-selectors.js';

function getInitials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || '')
        .join('');
}

function getTierClass(opponent) {
    if (typeof opponent.rank === 'number' && opponent.rank <= 10) return 'tier-elite';
    if (typeof opponent.rank === 'number' && opponent.rank <= 25) return 'tier-ranked';
    return 'tier-prospect';
}

function renderOpponentAvatar(opponent) {
    const initials = getInitials(opponent.name);
    const tierClass = getTierClass(opponent);
    return `
        <div class="opponent-avatar ${tierClass}" aria-hidden="true">
            <div class="opponent-avatar-glow"></div>
            <div class="opponent-avatar-mono">${initials}</div>
            <div class="opponent-avatar-flag">${opponent.flag || ''}</div>
        </div>
    `;
}

export function renderOpponentScene() {
    syncAvailableOpponents();
    syncAvailableEvents();
    const vm = getOpponentViewModel();

    document.getElementById('opponent-player-ovr').textContent = vm.playerOverall;
    document.getElementById('opponent-player-class').textContent = vm.playerClass;
    document.getElementById('opponent-player-rank').textContent = vm.playerRankLabel;
    document.getElementById('opponent-player-cash').textContent = vm.playerCash;
    document.getElementById('opponent-event-cards').innerHTML = vm.eventCards.map(event => `
        <button class="opponent-card event-card ${event.selected ? 'selected' : ''}" data-event-id="${event.id}" ${event.disabled ? 'disabled' : ''}>
            <div class="opponent-card-head">
                <div>
                    <div class="opponent-card-name">${event.name}</div>
                    <div class="opponent-card-sub">${event.sub}</div>
                </div>
                <div class="opponent-ovr">${event.overall}</div>
            </div>
            <div class="opponent-card-meta">${event.meta}</div>
            <p class="opponent-card-copy">${event.blurb}</p>
            <div class="opponent-card-economy">${event.economy}</div>
        </button>
    `).join('');
    document.getElementById('opponent-cards').innerHTML = vm.opponentCards.length === 0
        ? `<p class="opponent-summary-empty">No matchups in the ${vm.playerClass} division yet. Check back once the roster fills out.</p>`
        : vm.opponentCards.map(opponent => `
        <button class="opponent-card fighter-card ${opponent.selected ? 'selected' : ''}" data-opponent-id="${opponent.id}">
            <div class="opponent-card-head">
                ${renderOpponentAvatar(opponent)}
                <div class="opponent-card-head-text">
                    <div class="opponent-card-name">${opponent.name}</div>
                    <div class="opponent-card-sub">${opponent.sub}</div>
                    <div class="opponent-style-tag">
                        <span class="opponent-primary-style">${opponent.primaryStyle}</span>
                        <span class="opponent-flavor-style">${opponent.styleFlavor}</span>
                    </div>
                </div>
                <div class="opponent-ovr">${opponent.overall}</div>
            </div>
            <div class="opponent-card-meta">${opponent.meta}</div>
            <p class="opponent-card-copy">${opponent.blurb}</p>
            <div class="opponent-card-economy">${opponent.economy}</div>
        </button>
    `).join('');
    document.getElementById('opponent-summary').innerHTML = vm.selectedOpponentSummary
        ? `
        <div class="opponent-summary-block">
            <div class="opponent-summary-name">${vm.selectedOpponentSummary.name}</div>
            <div class="opponent-summary-meta">${vm.selectedOpponentSummary.meta}</div>
            <p class="opponent-summary-copy">${vm.selectedOpponentSummary.blurb}</p>
        </div>
        <div class="career-row opponent-summary-stats">
            <div class="career-stat">
                <div class="label">Rank</div>
                <div class="value">${vm.selectedOpponentSummary.rankLabel}</div>
            </div>
            <div class="career-stat">
                <div class="label">Overall</div>
                <div class="value">${vm.selectedOpponentSummary.overall}</div>
            </div>
            <div class="career-stat">
                <div class="label">Difficulty</div>
                <div class="value">${vm.selectedOpponentSummary.difficulty}</div>
            </div>
            <div class="career-stat">
                <div class="label">Purse</div>
                <div class="value opponent-money">${vm.selectedOpponentSummary.purse}</div>
            </div>
        </div>
    `
        : '<p class="opponent-summary-empty">No opponent selected yet. Pick the matchup before camp starts.</p>';
    document.getElementById('opponent-rankings').innerHTML = vm.rankingRows.map(entry => `
        <div class="ranking-row ${entry.isPlayer ? 'player' : ''}">
            <span class="ranking-rank">${entry.rankLabel}</span>
            <div>
                <div class="ranking-name">${entry.label}</div>
                <div class="ranking-meta">${entry.meta}</div>
            </div>
        </div>
    `).join('');
    document.getElementById('opponent-cut-note').textContent = vm.cutNote;
    document.getElementById('opponent-contract-note').textContent = vm.contractNote;
    document.getElementById('opponent-contract-summary').innerHTML = vm.contractSummary
        ? `
        <div class="opponent-summary-block">
            <div class="opponent-summary-name">${vm.contractSummary.eventName}</div>
            <div class="opponent-summary-meta">${vm.contractSummary.venueLine}</div>
            <p class="opponent-summary-copy">${vm.contractSummary.moneyLine}</p>
        </div>
        <div class="career-row opponent-summary-stats">
            <div class="career-stat">
                <div class="label">Upside</div>
                <div class="value opponent-money">${vm.contractSummary.bonusLine}</div>
            </div>
        </div>
    `
        : '<p class="opponent-summary-empty">No deal ready yet. Pick the card and opponent to see the contract.</p>';
    document.getElementById('btn-begin-camp').textContent = vm.actionLabel;
    document.getElementById('btn-begin-camp').disabled = !vm.canBeginCamp;
}
