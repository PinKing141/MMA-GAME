import {
    ATTRIBUTE_GROUPS,
    ATTRIBUTE_GROUP_ORDER
} from '../lib/data.js';
import {
    detectArchetype,
    feetInchesString,
    getAttributeAverage,
    getOverallAverage,
    getStance,
    getWeightClassEntry,
    getWeightClass,
    inchesToFeetInchesString,
    state,
    statColorClass
} from '../lib/core.js';
import { renderArchetypeExamples, renderArchetypeImage, renderCategoryStat, renderCountryBadge, renderModifierList } from '../lib/ui/markup.js';

function formatRecord(record) {
    return `${record.wins}-${record.losses}-${record.draws}`;
}

function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

function getRankLabel() {
    const weightClassKey = getWeightClassEntry(state.setup.weight).key;
    const rank = state.career.playerRankings[weightClassKey] ?? null;
    return rank ? `#${rank}` : 'NR';
}

function getProgressCopy(career) {
    if (career.lastFightResult && !career.selectedOpponent) {
        return {
            heading: 'Next: Book Another Opponent',
            copy: `Last result: ${career.lastFightResult.result} vs ${career.lastFightResult.opponent.name} by ${career.lastFightResult.method}. Pick the next contract before camp opens.`,
            buttonLabel: 'Select Opponent'
        };
    }

    if (!career.selectedOpponent) {
        return {
            heading: 'Next: Pick an Opponent · Then Build Camp',
            copy: 'Choose the opponent first. Camp planning, coaching, and the weight cut should be built around a real matchup.',
            buttonLabel: 'Select Opponent'
        };
    }

    if (career.campWeeksCompleted >= career.campWeeksTotal) {
        return {
            heading: `Next: Fight Night vs ${career.selectedOpponent.name}`,
            copy: 'Camp is complete. The booked opponent is locked in and the fight scene is ready.',
            buttonLabel: 'Go To Fight'
        };
    }

    return {
        heading: `Next: Camp for ${career.selectedOpponent.name}`,
        copy: 'Opponent and camp are linked now. Pick a coach, manage risk, and finish the block before fight night.',
        buttonLabel: 'Continue Camp'
    };
}

function getCareerStory(career) {
    if (career.lastFightResult) {
        return `Last fight: ${career.lastFightResult.result} vs ${career.lastFightResult.opponent.name} by ${career.lastFightResult.method}${career.lastFightResult.round ? ` in round ${career.lastFightResult.round}` : ''}. Bankroll ${formatMoney(career.cash)} · Rank ${getRankLabel()}.`;
    }

    if (career.selectedOpponent) {
        const coachName = career.selectedCoach ? career.selectedCoach.name : 'No coach selected';
        return `Booked opponent: ${career.selectedOpponent.name}. Coach: ${coachName}. Bankroll ${formatMoney(career.cash)} · Rank ${getRankLabel()}.`;
    }

    return `Nicknames are earned through cage performance. Bankroll ${formatMoney(career.cash)} · Division rank ${getRankLabel()}. The archetype only sets the foundation.`;
}

export function renderProfile() {
    const { setup, career } = state;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter';
    const progressCopy = getProgressCopy(career);
    state.archetype = detectArchetype(state.stats);

    document.getElementById('pr-name').textContent = fullName;
    document.getElementById('pr-class').textContent = getWeightClass(setup.weight);
    document.getElementById('pr-discipline').textContent = state.archetype.name;
    document.getElementById('pr-style-note').textContent = state.archetype.styleNote;
    document.getElementById('pr-flag').innerHTML = renderCountryBadge(setup.country);
    document.getElementById('pr-age').textContent = `${setup.age} y/o`;
    document.getElementById('pr-stance').textContent = getStance(setup.hand);
    document.getElementById('pr-record').textContent = career.record.wins + career.record.losses + career.record.draws > 0
        ? `${formatRecord(career.record)} (${career.record.finishes} finishes)`
        : `${formatRecord(career.record)} (Debut Pending)`;
    document.getElementById('pr-height').textContent = feetInchesString(setup.feet, setup.inches);
    document.getElementById('pr-weight').innerHTML = `${setup.weight}<span class="unit">lbs</span>`;
    document.getElementById('pr-reach').innerHTML = `${inchesToFeetInchesString(setup.reach)}<span class="unit">${setup.reach} in</span>`;
    document.getElementById('pr-ovr').textContent = getOverallAverage(state.stats);
    document.getElementById('career-fitness').innerHTML = `${career.fitness}<span class="unit">%</span>`;
    document.getElementById('career-morale').innerHTML = `${career.morale}<span class="unit">%</span>`;
    document.getElementById('career-sharpness').innerHTML = `${career.sharpness}<span class="unit">%</span>`;
    document.getElementById('career-reputation').textContent = career.reputation;
    document.getElementById('career-day').textContent = career.selectedOpponent
        ? (career.campWeeksCompleted >= career.campWeeksTotal ? 'Fight Week' : `Week ${career.campWeeksCompleted + 1}`)
        : 'Open Week';
    document.getElementById('career-story').textContent = getCareerStory(career);
    document.getElementById('profile-next-head').textContent = progressCopy.heading;
    document.getElementById('profile-next-copy').textContent = progressCopy.copy;
    document.getElementById('btn-profile-progress').textContent = progressCopy.buttonLabel;
    document.getElementById('identity-name').textContent = state.archetype.name;
    document.getElementById('profile-archetype-icon').innerHTML = renderArchetypeImage(state.archetype.icon, state.archetype.name, 'feature-archetype-art');
    document.getElementById('profile-archetype-blurb').textContent = state.archetype.blurb;
    document.getElementById('profile-archetype-detail').textContent = state.archetype.detail;
    document.getElementById('profile-archetype-examples').innerHTML = renderArchetypeExamples(state.archetype.famousFighters);
    document.getElementById('profile-strengths').innerHTML = renderModifierList(state.archetype.strengths, 'strong');
    document.getElementById('profile-weaknesses').innerHTML = renderModifierList(state.archetype.weaknesses, 'weak');

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
