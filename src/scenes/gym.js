import { getGymViewModel } from '../lib/selectors/career-selectors.js';

export function renderGymScene() {
    const vm = getGymViewModel();

    document.getElementById('gym-name').textContent = vm.fullName;
    document.getElementById('gym-week').textContent = vm.weekLabel;
    document.getElementById('gym-status').textContent = vm.status;
    document.getElementById('gym-opponent-summary').innerHTML = vm.opponentSummary
        ? `
        <div class="opponent-summary-name">${vm.opponentSummary.name}</div>
        <div class="opponent-summary-meta">${vm.opponentSummary.meta}</div>
        <p class="opponent-summary-copy">${vm.opponentSummary.blurb}</p>
    `
        : '<div class="gym-log-empty">No opponent booked yet.</div>';
    document.getElementById('gym-coaches').innerHTML = vm.coachCards.map(coach => `
        <button class="coach-card ${coach.selected ? 'selected' : ''}" data-coach-id="${coach.id}" ${coach.disabled ? 'disabled' : ''}>
            <div class="coach-card-head">
                <div>
                    <div class="coach-card-name">${coach.name}</div>
                    <div class="coach-card-sub">${coach.sub}</div>
                </div>
            </div>
            <p class="coach-card-copy">${coach.specialty}</p>
            <div class="coach-card-meta-row">
                <span>Gym Rep ${coach.gymReputation}</span>
                <span>Camps ${coach.campsCompleted}</span>
            </div>
            <div class="coach-card-trait">
                <strong>${coach.traitLabel}</strong>
                <span>${coach.traitDescription}</span>
            </div>
        </button>
    `).join('');
    document.getElementById('gym-metrics').innerHTML = vm.metrics.map(metric => `
        <div class="gym-metric">
            <div class="label">${metric.label}</div>
            <div class="value">${metric.value}</div>
        </div>
    `).join('');
    document.getElementById('gym-coach-note').textContent = vm.coachNote;
    document.getElementById('gym-injuries').innerHTML = vm.injuries.length
        ? vm.injuries.map(injury => `
        <div class="injury-pill">
            <span>${injury.name}</span>
            <strong>-${injury.penalty}</strong>
        </div>
    `).join('')
        : '<div class="gym-log-empty">No active camp injuries.</div>';
    document.getElementById('gym-actions').innerHTML = vm.actionCards.map(action => `
        <button class="gym-action-card" data-gym-action="${action.key}" ${action.disabled ? 'disabled' : ''}>
            <div class="gym-action-head">
                <span class="gym-action-label">${action.label}</span>
                <span class="gym-action-week">${action.week}</span>
            </div>
            <p class="gym-action-copy">${action.copy}</p>
        </button>
    `).join('');
    document.getElementById('gym-history').innerHTML = vm.history.length
        ? vm.history.map(entry => `
        <div class="gym-log-row">
            <span class="gym-log-week">Week ${entry.week}</span>
            <div>
                <div class="gym-log-title">${entry.label}</div>
                <p class="gym-log-note">${entry.note}</p>
            </div>
        </div>
    `).join('')
        : '<div class="gym-log-empty">No training logged yet. Pick the first week focus.</div>';
    document.getElementById('gym-complete-note').textContent = vm.completeNote;
    document.getElementById('btn-fight-night').disabled = !vm.canFight;
}
