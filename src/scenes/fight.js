import { getFightViewModel } from '../lib/selectors/fight-selectors.js';

function renderFightNotes(notes) {
    return notes.map(note => `<div class="fight-note">${note}</div>`).join('');
}

export function renderFightScene() {
    const vm = getFightViewModel();

    if (!vm.hasOpponent) {
        document.getElementById('fight-result-headline').textContent = vm.headline;
        document.getElementById('fight-result-copy').textContent = vm.copy;
        document.getElementById('fight-result-notes').innerHTML = '';
        document.getElementById('btn-simulate-fight').disabled = !vm.canSimulate;
        document.getElementById('btn-back-gym').disabled = !vm.canBackToCamp;
        document.getElementById('btn-open-fight-replay').hidden = true;
        document.getElementById('btn-post-fight-presser').hidden = true;
        return;
    }

    document.getElementById('fight-camp-readout').innerHTML = `
        <div class="career-row">
            ${vm.campReadout.map(item => `
            <div class="career-stat">
                <div class="label">${item.label}</div>
                <div class="value${item.label === 'Coach' || item.label === 'Pay' || item.label === 'Event' ? ' fight-small-copy' : ''}">${item.value}</div>
            </div>
            `).join('')}
        </div>
    `;
    document.getElementById('fight-result-headline').textContent = vm.headline;
    document.getElementById('fight-result-copy').textContent = vm.copy;
    document.getElementById('fight-result-notes').innerHTML = renderFightNotes(vm.notes);
    document.getElementById('btn-simulate-fight').disabled = !vm.canSimulate;
    document.getElementById('btn-back-gym').disabled = !vm.canBackToCamp;
    document.getElementById('btn-open-fight-replay').hidden = !vm.canReplay;
    document.getElementById('btn-post-fight-presser').hidden = !vm.hasResult;
}
