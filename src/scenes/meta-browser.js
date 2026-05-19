/**
 * Meta browser modal — achievements, leaderboards, settings, weight
 * class switch, and the New Game+ entry button.
 */

import { state } from '../lib/core.js';
import { getAchievementsViewModel } from '../lib/meta/achievements.js';
import { getLeaderboardsViewModel } from '../lib/meta/leaderboards.js';
import { getNGPlusTier, getDifficulty } from '../lib/meta/meta-store.js';
import { isEligibleForNewGamePlus } from '../lib/meta/new-game-plus.js';
import {
    setDifficultyAction,
    switchWeightClassAction,
    startNewCareerAction,
    enterNewGamePlusAction
} from '../lib/actions/meta-actions.js';
import { WEIGHT_CLASSES } from '../lib/data/attributes.js';

const MODAL_ID = 'meta-browser-modal';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getCurrentWeightClassKey() {
    const w = state.setup?.weight || 170;
    const wc = WEIGHT_CLASSES.find(c => w >= c.min && w <= c.max);
    return wc?.key || 'welterweight';
}

function renderAchievementsTab() {
    const list = getAchievementsViewModel();
    const total = list.length;
    const unlocked = list.filter(a => a.unlocked).length;
    return `
        <div class="mb-section-head">
            <span>Achievements</span>
            <span class="mb-section-count">${unlocked} / ${total}</span>
        </div>
        <div class="mb-achievements">
            ${list.map(a => `
                <article class="mb-ach mb-tier-${a.tier}${a.unlocked ? '' : ' locked'}${a.hidden && !a.unlocked ? ' hidden' : ''}">
                    <div class="mb-ach-badge">${a.tier[0].toUpperCase()}</div>
                    <div class="mb-ach-body">
                        <div class="mb-ach-title">${escapeHtml(a.hidden && !a.unlocked ? '???' : a.title)}</div>
                        <div class="mb-ach-desc">${escapeHtml(a.hidden && !a.unlocked ? 'Hidden — keep playing to discover.' : a.description)}</div>
                        ${a.unlocked ? `<div class="mb-ach-time">Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}</div>` : ''}
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderLeaderboardsTab() {
    const boards = getLeaderboardsViewModel();
    return `
        <div class="mb-section-head"><span>Leaderboards</span><span class="mb-section-count">Top 10 across all careers</span></div>
        <div class="mb-leaderboards">
            ${boards.map(board => `
                <article class="mb-lb">
                    <header class="mb-lb-head">
                        <span class="mb-lb-title">${escapeHtml(board.title)}</span>
                        <span class="mb-lb-unit">${escapeHtml(board.valueLabel)}</span>
                    </header>
                    <div class="mb-lb-rows">
                        ${board.entries.length === 0
                            ? '<div class="mb-lb-empty">No entries yet.</div>'
                            : board.entries.map((entry, i) => `
                                <div class="mb-lb-row">
                                    <span class="mb-lb-rank">#${i + 1}</span>
                                    <span class="mb-lb-name">${escapeHtml(entry.fighterName)}</span>
                                    <span class="mb-lb-meta">${escapeHtml(entry.record || '')}${entry.difficulty && entry.difficulty !== 'normal' ? ' · ' + escapeHtml(entry.difficulty.toUpperCase()) : ''}${entry.ngPlusTier ? ' · NG+' + entry.ngPlusTier : ''}</span>
                                    <span class="mb-lb-val">${formatValue(board.key, entry.value)}</span>
                                </div>
                            `).join('')}
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function formatValue(boardKey, value) {
    if (boardKey === 'career-earnings') return `$${(value || 0).toLocaleString()}`;
    return String(value);
}

function renderSettingsTab() {
    const difficulty = getDifficulty();
    const currentWC = getCurrentWeightClassKey();
    const ngPlusTier = getNGPlusTier();
    const eligible = isEligibleForNewGamePlus(state);
    return `
        <div class="mb-section-head"><span>Settings</span><span class="mb-section-count">Career tier: NG+${ngPlusTier}</span></div>
        <article class="mb-settings-block">
            <h3 class="mb-settings-title">Difficulty</h3>
            <p class="mb-settings-desc">Tunes opponent strength. Higher difficulty stacks with the active NG+ tier.</p>
            <div class="mb-difficulty-grid">
                ${['easy', 'normal', 'hard', 'insane'].map(level => `
                    <button class="mb-diff-btn${level === difficulty ? ' active' : ''}" data-action="set-difficulty" data-level="${level}">
                        <div class="mb-diff-label">${level.toUpperCase()}</div>
                        <div class="mb-diff-sub">${difficultyDescription(level)}</div>
                    </button>
                `).join('')}
            </div>
        </article>

        <article class="mb-settings-block">
            <h3 class="mb-settings-title">Weight Class</h3>
            <p class="mb-settings-desc">Mid-career division changes carry your ranking history. Switching applies on the next camp.</p>
            <div class="mb-weight-grid">
                ${WEIGHT_CLASSES.map(wc => `
                    <button class="mb-weight-btn${wc.key === currentWC ? ' active' : ''}" data-action="switch-weight" data-key="${wc.key}">
                        <div class="mb-weight-name">${escapeHtml(wc.name)}</div>
                        <div class="mb-weight-range">${wc.min}–${wc.max} lb</div>
                    </button>
                `).join('')}
            </div>
        </article>

        <article class="mb-settings-block">
            <h3 class="mb-settings-title">Career Control</h3>
            <p class="mb-settings-desc">Start fresh, or, after winning a title (or 15+ fights), enter New Game+ with a starting bonus.</p>
            <div class="mb-career-actions">
                <button class="btn" data-action="new-career">Start New Career</button>
                <button class="btn gold${eligible ? '' : ' disabled'}" data-action="enter-ng-plus" ${eligible ? '' : 'disabled'}>
                    ${eligible ? 'Enter New Game+' : 'New Game+ Locked — win a title or 15 fights'}
                </button>
            </div>
        </article>
    `;
}

function difficultyDescription(level) {
    switch (level) {
        case 'easy': return 'Opponents play softer';
        case 'normal': return 'Default difficulty';
        case 'hard': return 'Opponents press harder';
        case 'insane': return 'Top-tier from day one';
        default: return '';
    }
}

let activeTab = 'achievements';

export function renderMetaBrowser() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const tabContent = activeTab === 'achievements'
        ? renderAchievementsTab()
        : activeTab === 'leaderboards'
            ? renderLeaderboardsTab()
            : renderSettingsTab();
    modal.querySelector('[data-meta-tabs]').innerHTML = ['achievements', 'leaderboards', 'settings'].map(tab => `
        <button class="mb-tab${tab === activeTab ? ' active' : ''}" data-tab="${tab}">${tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
    `).join('');
    modal.querySelector('[data-meta-body]').innerHTML = tabContent;
}

export function openMetaBrowser(tab = activeTab) {
    activeTab = tab;
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('meta-browser-open');
    renderMetaBrowser();
}

export function closeMetaBrowser() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('meta-browser-open');
}

export function bindMetaBrowserEvents({ onCareerChanged } = {}) {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    modal.addEventListener('click', event => {
        if (event.target.closest('[data-close-meta-browser]')) {
            closeMetaBrowser();
            return;
        }

        const tab = event.target.closest('[data-tab]');
        if (tab) {
            activeTab = tab.dataset.tab;
            renderMetaBrowser();
            return;
        }

        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;

        if (action === 'set-difficulty') {
            setDifficultyAction(actionEl.dataset.level);
            renderMetaBrowser();
        } else if (action === 'switch-weight') {
            if (switchWeightClassAction(actionEl.dataset.key)) {
                renderMetaBrowser();
                onCareerChanged?.();
            }
        } else if (action === 'new-career') {
            if (window.confirm('Start a brand-new career? Current progress will be reset (achievements stay).')) {
                startNewCareerAction();
                closeMetaBrowser();
                onCareerChanged?.();
            }
        } else if (action === 'enter-ng-plus') {
            if (window.confirm('Enter New Game+? Your current career goes into the books and a fresh run begins at a higher tier.')) {
                if (enterNewGamePlusAction()) {
                    closeMetaBrowser();
                    onCareerChanged?.();
                }
            }
        }
    });
}
