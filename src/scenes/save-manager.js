/**
 * Save manager modal — multi-slot save UI with rich metadata,
 * rename / delete / export / import controls.
 */

import {
    listSaveSlots,
    createNewSlot,
    loadFromSlot,
    deleteSlot,
    renameSlot,
    downloadSlotExport,
    importSlotJson,
    getActiveSlotId
} from '../lib/persistence.js';

const MODAL_ID = 'save-manager-modal';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatRelativeTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderSlot(slot, activeId) {
    const isActive = slot.id === activeId;
    const meta = slot.meta || {};
    const rank = meta.rankedSlot;
    const rankText = rank
        ? `#${rank.rank} ${rank.weightClassKey?.replace(/-/g, ' ') || ''}`
        : 'Unranked';
    return `
        <article class="save-slot${isActive ? ' active' : ''}" data-slot-id="${escapeHtml(slot.id)}">
            <div class="save-slot-stripe"></div>
            <header class="save-slot-head">
                <div class="save-slot-title">
                    <span class="save-slot-name">${escapeHtml(slot.name || 'Untitled')}</span>
                    ${slot.isAuto ? '<span class="save-slot-pill auto">AUTO</span>' : ''}
                    ${slot.imported ? '<span class="save-slot-pill imported">IMPORTED</span>' : ''}
                    ${isActive ? '<span class="save-slot-pill active">ACTIVE</span>' : ''}
                </div>
                <div class="save-slot-time">${formatRelativeTime(slot.savedAt)}</div>
            </header>
            <div class="save-slot-meta">
                <div class="save-slot-fighter">${escapeHtml(meta.fighterName || 'Unknown')}${meta.countryName ? ` <span class="save-slot-dim">· ${escapeHtml(meta.countryName)}</span>` : ''}</div>
                <div class="save-slot-stats">
                    <span><label>Record</label><strong>${escapeHtml(meta.record || '0-0-0')}</strong></span>
                    <span><label>Finishes</label><strong>${meta.finishes || 0}</strong></span>
                    <span><label>Rep</label><strong>${meta.reputation || 0}</strong></span>
                    <span><label>Cash</label><strong>$${(meta.cash || 0).toLocaleString()}</strong></span>
                    <span><label>Standing</label><strong>${escapeHtml(rankText)}</strong></span>
                    <span><label>Week</label><strong>${meta.worldWeek || 0}</strong></span>
                </div>
            </div>
            <footer class="save-slot-actions">
                <button class="btn small" data-action="load" data-slot-id="${escapeHtml(slot.id)}">Load</button>
                <button class="btn ghost small" data-action="export" data-slot-id="${escapeHtml(slot.id)}">Export</button>
                ${!slot.isAuto ? `<button class="btn ghost small" data-action="rename" data-slot-id="${escapeHtml(slot.id)}">Rename</button>` : ''}
                ${!slot.isAuto ? `<button class="btn ghost small danger" data-action="delete" data-slot-id="${escapeHtml(slot.id)}">Delete</button>` : ''}
            </footer>
        </article>
    `;
}

export function renderSaveManager() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const slots = listSaveSlots();
    const activeId = getActiveSlotId();
    const slotsHtml = slots.length === 0
        ? '<div class="save-empty">No saves yet. Play a bit, then save to a new slot.</div>'
        : slots.map(slot => renderSlot(slot, activeId)).join('');
    modal.querySelector('[data-slots-list]').innerHTML = slotsHtml;
}

export function openSaveManager() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('save-manager-open');
    renderSaveManager();
}

export function closeSaveManager() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('save-manager-open');
}

export function bindSaveManagerEvents({ onLoaded } = {}) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    modal.addEventListener('click', event => {
        const target = event.target.closest('[data-close-save-manager], [data-action]');
        if (!target) return;
        if (target.matches('[data-close-save-manager]')) {
            closeSaveManager();
            return;
        }
        const action = target.dataset.action;
        const slotId = target.dataset.slotId;

        if (action === 'load') {
            if (loadFromSlot(slotId)) {
                closeSaveManager();
                onLoaded?.();
            }
        } else if (action === 'export') {
            downloadSlotExport(slotId);
        } else if (action === 'rename') {
            const current = listSaveSlots().find(s => s.id === slotId);
            const next = window.prompt('Rename save:', current?.name || '');
            if (next && next.trim()) {
                renameSlot(slotId, next.trim());
                renderSaveManager();
            }
        } else if (action === 'delete') {
            if (window.confirm('Delete this save? This cannot be undone.')) {
                deleteSlot(slotId);
                renderSaveManager();
            }
        } else if (action === 'save-new') {
            const name = window.prompt('Name this save:', '') || '';
            createNewSlot(name.trim() || null);
            renderSaveManager();
        } else if (action === 'import') {
            document.getElementById('save-import-input').click();
        }
    });

    const importInput = document.getElementById('save-import-input');
    if (importInput) {
        importInput.addEventListener('change', async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const slotId = importSlotJson(text);
            event.target.value = '';
            if (slotId) {
                renderSaveManager();
            } else {
                window.alert('Could not import this file. Make sure it\'s a CAGE save export.');
            }
        });
    }
}
