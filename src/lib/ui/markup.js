import { getCountryFlagSrc } from '../data.js';
import { getIcon } from './icons.js';

export function renderArchetypeImage(src, name, className = '') {
  return `<img class="archetype-art ${className}" src="${src}" alt="${name} style artwork" loading="lazy" decoding="async" />`;
}

export function renderCountryBadge(country) {
    const flagSrc = getCountryFlagSrc(country.code);
    return `
    <span class="country-chip">
      <span class="country-chip-flag-wrap">
        <img class="country-chip-flag" src="${flagSrc}" alt="${country.name} flag" loading="lazy" decoding="async" />
      </span>
      <span class="country-chip-code">${country.code}</span>
      <span class="country-chip-name">${country.name}</span>
    </span>
  `;
}

export function renderPresetButton(archetype, isActive = false) {
    return `
    <button class="preset-btn ${isActive ? 'active' : ''}" data-preset="${archetype.key}" data-archetype="${archetype.key}">
      <span class="preset-btn-icon">${renderArchetypeImage(archetype.icon, archetype.name, 'preset-btn-art')}</span>
      <span class="preset-btn-copy">
        <strong>${archetype.name}</strong>
        <span>${archetype.styleNote}</span>
      </span>
    </button>
  `;
}

export function renderModifierList(items, tone) {
    return items.map(item => `
    <li class="modifier-item ${tone}">
      <span class="modifier-label">${item.label}</span>
      <span class="modifier-value">${item.modifier}</span>
    </li>
  `).join('');
}

export function renderArchetypeExamples(fighters = []) {
    return fighters.map(name => `<span class="archetype-example-pill">${name}</span>`).join('');
}

export function renderCategoryStat(snapshot) {
    return `
    <div class="category-meter ${snapshot.key}">
      <span class="category-meter-tag">${snapshot.tag}</span>
      <span class="category-meter-label">${snapshot.label}</span>
      <strong>${snapshot.average}</strong>
    </div>
  `;
}
