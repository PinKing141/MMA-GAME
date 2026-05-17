import {
    ATTRIBUTE_GROUPS,
    ATTRIBUTE_GROUP_ORDER
} from '../lib/data.js';
import {
    getAttributeAverage,
    state,
    statColorClass
} from '../lib/core.js';
import { getProfileViewModel } from '../lib/selectors/profile-selectors.js';
import { describeFighterStyle } from '../lib/utils/style-flavor.js';
import { renderArchetypeExamples, renderArchetypeImage, renderCategoryStat, renderCountryBadge, renderModifierList } from '../lib/ui/markup.js';

export function renderProfile() {
    const vm = getProfileViewModel();

    document.getElementById('pr-name').textContent = vm.fullName;
    document.getElementById('pr-class').textContent = vm.weightClass;
    const style = describeFighterStyle(vm.archetype, state.stats);
    document.getElementById('pr-discipline').textContent = style.primary;
    document.getElementById('pr-style-note').textContent = `${vm.archetype.styleNote} ${style.flavor}`;
    document.getElementById('pr-flag').innerHTML = renderCountryBadge(vm.country);
    document.getElementById('pr-age').textContent = vm.ageLabel;
    document.getElementById('pr-stance').textContent = vm.stanceLabel;
    document.getElementById('pr-record').textContent = vm.recordLabel;
    document.getElementById('pr-height').textContent = vm.heightLabel;
    document.getElementById('pr-weight').innerHTML = `${vm.weightValue}<span class="unit">lbs</span>`;
    document.getElementById('pr-reach').innerHTML = `${vm.reachLabel}<span class="unit">${vm.reachValue} in</span>`;
    document.getElementById('pr-ovr').textContent = vm.overall;
    document.getElementById('career-fitness').innerHTML = `${vm.fitness}<span class="unit">%</span>`;
    document.getElementById('career-morale').innerHTML = `${vm.morale}<span class="unit">%</span>`;
    document.getElementById('career-sharpness').innerHTML = `${vm.sharpness}<span class="unit">%</span>`;
    document.getElementById('career-reputation').textContent = vm.reputation;
    document.getElementById('career-day').textContent = vm.careerDay;
    document.getElementById('career-story').textContent = vm.careerStory;
    document.getElementById('profile-next-head').textContent = vm.progressCopy.heading;
    document.getElementById('profile-next-copy').textContent = vm.progressCopy.copy;
    document.getElementById('btn-profile-progress').textContent = vm.progressCopy.buttonLabel;
    document.getElementById('identity-name').textContent = vm.archetype.name;
    document.getElementById('profile-archetype-icon').innerHTML = renderArchetypeImage(vm.archetype.icon, vm.archetype.name, 'feature-archetype-art');
    document.getElementById('profile-archetype-blurb').textContent = vm.archetype.blurb;
    document.getElementById('profile-archetype-detail').textContent = vm.archetype.detail;
    document.getElementById('profile-archetype-examples').innerHTML = renderArchetypeExamples(vm.archetype.famousFighters);
    document.getElementById('profile-strengths').innerHTML = renderModifierList(vm.archetype.strengths, 'strong');
    document.getElementById('profile-weaknesses').innerHTML = renderModifierList(vm.archetype.weaknesses, 'weak');

    renderProfileGroups();
    renderProfileMeters();

    setTimeout(() => {
        document.querySelectorAll('.stat-bar-fill[data-target]').forEach(element => {
            const target = parseInt(element.dataset.target, 10);
            element.style.width = `${target}%`;
        });
    }, 80);
}

function renderProfileGroups() {
    const groupsContainer = document.getElementById('profile-groups');
    groupsContainer.innerHTML = '';

    ATTRIBUTE_GROUP_ORDER.forEach(groupKey => {
        const group = ATTRIBUTE_GROUPS[groupKey];
        const card = document.createElement('div');
        card.className = 'stat-card profile-group-card';
        card.innerHTML = `
      <div class="stat-card-header">
        <span class="title">${group.label}</span>
        <span class="avg">Avg <strong>${Math.round(getAttributeAverage(state.stats, groupKey, ATTRIBUTE_GROUPS))}</strong></span>
      </div>
      <div class="profile-group-body" id="profile-${groupKey}"></div>
    `;
        groupsContainer.appendChild(card);

        const target = card.querySelector('.profile-group-body');
        group.attributes.forEach(attribute => {
            const value = state.stats[attribute.key];
            const colorClass = statColorClass(value);
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
        <div class="stat-name">${attribute.label}</div>
        <div class="stat-pill ${colorClass}">${value}</div>
        <div class="stat-bar"><div class="stat-bar-fill ${colorClass}" data-target="${value}"></div></div>
      `;
            target.appendChild(row);
        });
    });
}

function renderProfileMeters() {
    const meterContainer = document.getElementById('profile-category-meters');
    meterContainer.innerHTML = ATTRIBUTE_GROUP_ORDER.map(groupKey => renderCategoryStat({
        key: groupKey,
        label: ATTRIBUTE_GROUPS[groupKey].label,
        tag: ATTRIBUTE_GROUPS[groupKey].tag,
        average: Math.round(getAttributeAverage(state.stats, groupKey, ATTRIBUTE_GROUPS))
    })).join('');
}
