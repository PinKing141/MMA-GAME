import {
    ALL_ATTRIBUTES,
    ARCHETYPES,
    ARCHETYPE_LOOKUP,
    ATTRIBUTE_GROUPS,
    ATTRIBUTE_GROUP_ORDER,
    MAX_ATTRIBUTE,
    MIN_ATTRIBUTE
} from '../lib/data.js';
import {
    buildPresetStats,
    detectArchetype,
    getAttributeAverage,
    getCategorySnapshot,
    getOverallAverage,
    resetStats,
    state,
    statColorClass
} from '../lib/core.js';
import { getIcon } from '../lib/ui/icons.js';
import { renderArchetypeExamples, renderArchetypeImage, renderCategoryStat, renderModifierList, renderPresetButton } from '../lib/ui/markup.js';

const GROUP_ICON_MAP = {
    standup: 'standup',
    grappling: 'grapplingGroup',
    health: 'health',
    mind: 'mind'
};

export function renderAllocateCategories() {
    const container = document.getElementById('alloc-categories');
    container.innerHTML = '';

    ATTRIBUTE_GROUP_ORDER.forEach(groupKey => {
        const group = ATTRIBUTE_GROUPS[groupKey];
        const card = document.createElement('div');
        card.className = 'cat-card';
        card.innerHTML = `
      <div class="cat-card-header" data-cat="${groupKey}">
        <div class="cat-tag ${group.color}">${group.tag}</div>
        <div class="cat-name-wrap">
          <div class="cat-icon">${getIcon(GROUP_ICON_MAP[groupKey])}</div>
          <div>
            <div class="cat-name">${group.label}</div>
            <div class="cat-summary">${group.summary}</div>
          </div>
        </div>
        <div class="cat-avg">Avg <strong data-avg="${groupKey}">${Math.round(getAttributeAverage(state.stats, groupKey, ATTRIBUTE_GROUPS))}</strong></div>
        <div class="cat-toggle">${getIcon('chevron')}</div>
      </div>
      <div class="cat-substats" data-substats="${groupKey}"></div>
    `;
        container.appendChild(card);

        const substatsContainer = card.querySelector(`[data-substats="${groupKey}"]`);
        group.attributes.forEach(attribute => {
            const row = document.createElement('div');
            row.className = 'substat';
            row.dataset.statKey = attribute.key;
            row.innerHTML = `
        <div class="substat-copy">
          <div class="substat-name">${attribute.label}</div>
          <div class="substat-hint">${attribute.desc}</div>
        </div>
        <div class="substat-bar"><div class="substat-bar-fill ${statColorClass(state.stats[attribute.key])}" data-fill="${attribute.key}" style="width: ${state.stats[attribute.key]}%"></div></div>
        <div class="substat-value" data-val="${attribute.key}">${state.stats[attribute.key]}</div>
        <div class="substat-controls">
          <button class="btn-tick minus" data-act="dec" data-stat="${attribute.key}" aria-label="Decrease ${attribute.label}">${getIcon('minus')}</button>
          <button class="btn-tick plus" data-act="inc" data-stat="${attribute.key}" aria-label="Increase ${attribute.label}">${getIcon('plus')}</button>
        </div>
      `;
            substatsContainer.appendChild(row);

            row.addEventListener('click', event => {
                if (event.target.closest('.btn-tick')) {
                    return;
                }
                selectStat(attribute.key);
            });
        });

        card.querySelector('.cat-card-header').addEventListener('click', event => {
            if (event.target.closest('.btn-tick')) {
                return;
            }
            card.classList.toggle('collapsed');
        });
    });

    document.querySelectorAll('.btn-tick').forEach(button => {
        const statKey = button.dataset.stat;
        const action = button.dataset.act;

        setupHoldRepeat(button, () => {
            if (action === 'inc') {
                incrementStat(statKey);
            } else {
                decrementStat(statKey);
            }
        });
    });

    renderPresetButtons();
    renderDerivedPanels();
}

function setupHoldRepeat(button, callback) {
    let timer = null;
    let interval = null;

    const start = event => {
        event.preventDefault();
        event.stopPropagation();
        callback();
        timer = setTimeout(() => {
            interval = setInterval(callback, 50);
        }, 350);
    };

    const stop = () => {
        clearTimeout(timer);
        clearInterval(interval);
        timer = null;
        interval = null;
    };

    button.addEventListener('mousedown', start);
    button.addEventListener('touchstart', start, { passive: false });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(eventName => {
        button.addEventListener(eventName, stop);
    });
}

export function incrementStat(statKey) {
    if (state.pointsRemaining <= 0 || state.stats[statKey] >= MAX_ATTRIBUTE) {
        return;
    }

    state.stats[statKey] += 1;
    state.pointsRemaining -= 1;
    state.selectedPreset = null;
    updateStatDisplay(statKey);
}

export function decrementStat(statKey) {
    if (state.stats[statKey] <= MIN_ATTRIBUTE) {
        return;
    }

    state.stats[statKey] -= 1;
    state.pointsRemaining += 1;
    state.selectedPreset = null;
    updateStatDisplay(statKey);
}

function updateStatDisplay(statKey) {
    const value = state.stats[statKey];
    const valueElement = document.querySelector(`[data-val="${statKey}"]`);
    const fillElement = document.querySelector(`[data-fill="${statKey}"]`);

    if (valueElement) {
        valueElement.textContent = value;
    }

    if (fillElement) {
        fillElement.style.width = `${value}%`;
        fillElement.className = `substat-bar-fill ${statColorClass(value)}`;
    }

    const attributeMeta = ALL_ATTRIBUTES.find(attribute => attribute.key === statKey);
    if (attributeMeta) {
        const averageElement = document.querySelector(`[data-avg="${attributeMeta.group}"]`);
        if (averageElement) {
            averageElement.textContent = Math.round(getAttributeAverage(state.stats, attributeMeta.group, ATTRIBUTE_GROUPS));
        }
    }

    updateAllocHeader();
    renderDerivedPanels();
    selectStat(statKey);
}

export function updateAllocHeader() {
    const pointsLeft = document.getElementById('points-left');
    pointsLeft.textContent = state.pointsRemaining;
    pointsLeft.classList.toggle('empty', state.pointsRemaining === 0);
    document.getElementById('ovr-value').textContent = getOverallAverage(state.stats);
}

export function selectStat(statKey) {
    state.selectedStat = statKey;

    document.querySelectorAll('.substat').forEach(element => {
        element.classList.toggle('active', element.dataset.statKey === statKey);
    });

    const attribute = ALL_ATTRIBUTES.find(item => item.key === statKey);
    if (!attribute) {
        return;
    }

    document.getElementById('info-name').textContent = attribute.label;
    document.getElementById('info-cat').textContent = `${attribute.tag} · ${attribute.groupLabel}`;
    document.getElementById('info-desc').textContent = attribute.desc;
}

export function drawHexagon() {
    const svg = document.getElementById('hex-svg');
    const radius = 106;
    const snapshot = getCategorySnapshot(state.stats, ATTRIBUTE_GROUPS);
    const angles = [-90, 0, 90, 180].map(angle => (angle * Math.PI) / 180);

    const pointString = scale => angles.map(angle => {
        const x = Math.cos(angle) * radius * scale;
        const y = Math.sin(angle) * radius * scale;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const dataPoints = snapshot.map((entry, index) => {
        const angle = angles[index];
        const scale = entry.average / 100;
        const x = Math.cos(angle) * radius * scale;
        const y = Math.sin(angle) * radius * scale;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    let markup = '';
    [0.25, 0.5, 0.75, 1].forEach(scale => {
        markup += `<polygon class="ring" points="${pointString(scale)}" />`;
    });

    angles.forEach(angle => {
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        markup += `<line class="axis" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
    });

    markup += `<polygon class="data" points="${dataPoints}" />`;

    snapshot.forEach((entry, index) => {
        const angle = angles[index];
        const labelX = Math.cos(angle) * (radius + 18);
        const labelY = (Math.sin(angle) * (radius + 18)) + 4;
        markup += `<text class="label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle">${entry.tag}</text>`;
        markup += `<text class="label-val" x="${labelX.toFixed(1)}" y="${(labelY + 12).toFixed(1)}" text-anchor="middle">${entry.average}</text>`;
    });

    svg.innerHTML = markup;
    document.getElementById('build-category-meters').innerHTML = snapshot.map(renderCategoryStat).join('');
}

function renderPresetButtons() {
    const buttons = document.getElementById('preset-buttons');
    const detected = state.selectedPreset || state.archetype?.key || 'all-rounder';
    buttons.innerHTML = ARCHETYPES.map(archetype => renderPresetButton(archetype, archetype.key === detected)).join('');
}

function renderArchetypePanel() {
    const archetype = state.selectedPreset
        ? ARCHETYPE_LOOKUP[state.selectedPreset]
        : detectArchetype(state.stats);

    if (!archetype) {
        return;
    }

    state.archetype = archetype;

    document.getElementById('preset-icon').innerHTML = renderArchetypeImage(archetype.icon, archetype.name, 'feature-archetype-art');
    document.getElementById('preset-name').textContent = archetype.name;
    document.getElementById('preset-blurb').textContent = archetype.blurb;
    document.getElementById('preset-style-note').textContent = archetype.styleNote;
    document.getElementById('preset-detail').textContent = archetype.detail;
    document.getElementById('preset-examples').innerHTML = renderArchetypeExamples(archetype.famousFighters);
    document.getElementById('preset-strengths').innerHTML = renderModifierList(archetype.strengths, 'strong');
    document.getElementById('preset-weaknesses').innerHTML = renderModifierList(archetype.weaknesses, 'weak');
}

function renderDerivedPanels() {
    drawHexagon();
    renderArchetypePanel();
    renderPresetButtons();
}

export function applyPreset(presetKey) {
    const archetype = ARCHETYPE_LOOKUP[presetKey];
    if (!archetype) {
        return;
    }

    const presetStats = buildPresetStats(archetype);
    ALL_ATTRIBUTES.forEach(attribute => {
        state.stats[attribute.key] = presetStats[attribute.key];
    });

    const totalSpent = ALL_ATTRIBUTES.reduce((sum, attribute) => sum + (state.stats[attribute.key] - MIN_ATTRIBUTE), 0);
    state.pointsRemaining = state.pointsTotal - totalSpent;
    state.selectedPreset = presetKey;
    state.archetype = archetype;

    renderAllocateCategories();
    updateAllocHeader();
    selectStat(state.selectedStat || ALL_ATTRIBUTES[0].key);
}

export function resetBuild() {
    resetStats();
    state.selectedPreset = 'all-rounder';
    renderAllocateCategories();
    updateAllocHeader();
    selectStat(state.selectedStat || ALL_ATTRIBUTES[0].key);
}
