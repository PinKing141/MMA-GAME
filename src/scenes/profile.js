import { ATTRIBUTE_GROUPS, ATTRIBUTE_GROUP_ORDER } from '../lib/data.js';
import { getAttributeAverage, state } from '../lib/core.js';
import { getProfileViewModel } from '../lib/selectors/profile-selectors.js';
import { formatMoney, formatRecord, getRankLabel } from '../lib/utils/formatters.js';
import { getPlayerRank } from '../lib/selectors/career-selectors.js';
import { renderPortraitCard } from '../lib/ui/portrait-card.js';

const ACTION_CARDS = [
    {
        id: 'fight-offers',
        color: 'red',
        label: 'Matchmaking · Manager\'s Office',
        title: 'Fight Offers',
        action: 'fight-offers',
        icon: `
            <svg viewBox="0 0 24 24" fill="none" stroke="#e21d36" stroke-width="2">
                <circle cx="11" cy="11" r="7"/>
                <line x1="21" y1="21" x2="16.5" y2="16.5"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
            </svg>`
    },
    {
        id: 'camp',
        color: 'gold',
        label: 'Camp · Training Week',
        title: 'Gym & Training',
        action: 'continue-camp',
        icon: `
            <svg viewBox="0 0 24 24" fill="none" stroke="#f0c850" stroke-width="2">
                <path d="M2 12h2M6 8v8M6 10h12M18 8v8M20 12h2M10 9v6M14 9v6"/>
            </svg>`
    },
    {
        id: 'fight-night',
        color: 'green',
        label: 'Camp complete · Walk to the cage',
        title: 'Fight Night',
        action: 'fight-night',
        icon: `
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
                <path d="M6 9h12l-1 8a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/>
                <path d="M6 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
            </svg>`
    }
];

function buildHubHeadline(vm) {
    const career = state.career;
    const firstName = state.setup.firstName || 'Fighter';

    if (career.contract && career.campWeeksCompleted < career.campWeeksTotal) {
        return {
            eyebrow: `Career Hub · Camp Week ${career.campWeeksCompleted + 1} of ${career.campWeeksTotal}`,
            title: `Welcome back,<br>${escapeHtml(firstName)}.`,
            subtitle: `${career.campWeeksTotal - career.campWeeksCompleted} week${career.campWeeksTotal - career.campWeeksCompleted === 1 ? '' : 's'} until you walk into the cage with ${career.contract.opponentName}. Camp doesn't run itself.`
        };
    }

    if (career.contract) {
        return {
            eyebrow: 'Career Hub · Fight Week',
            title: `It's time,<br>${escapeHtml(firstName)}.`,
            subtitle: `Camp is done. ${career.contract.opponentName} is waiting at ${career.contract.eventName}. Walk it.`
        };
    }

    if (career.lastFightResult) {
        return {
            eyebrow: 'Career Hub · Between Fights',
            title: `Next move,<br>${escapeHtml(firstName)}.`,
            subtitle: `Last out: ${career.lastFightResult.result} vs ${career.lastFightResult.opponent.name} by ${career.lastFightResult.method}. Your manager has new offers on the table.`
        };
    }

    return {
        eyebrow: 'Career Hub · Pro Debut Incoming',
        title: `Welcome,<br>${escapeHtml(firstName)}.`,
        subtitle: `${vm.weightClass} · ${vm.archetype.name}. No contract yet. Your manager has fight offers ready when you are.`
    };
}

function buildNewsItems() {
    const career = state.career;
    const news = [];

    if (career.lastFightResult) {
        const r = career.lastFightResult;
        news.push({
            type: 'result',
            timestamp: 'Recent',
            text: `<span class="strong">${escapeHtml(r.result.toUpperCase())}</span> vs ${escapeHtml(r.opponent.name)} by <span class="gold">${escapeHtml(r.method)}</span>${r.round ? ` in round ${r.round}` : ''} at ${escapeHtml(r.eventName)}.`
        });
    }

    if (career.contract) {
        news.push({
            type: 'signing',
            timestamp: 'Booked',
            text: `Signed for <span class="strong">${escapeHtml(career.contract.eventName)}</span> vs ${escapeHtml(career.contract.opponentName)}. Show ${formatMoney(career.contract.showMoney)} · Win ${formatMoney(career.contract.winBonus)}.`
        });
    }

    if (career.reputation >= 5) {
        news.push({
            type: 'rank',
            timestamp: `Rep ${career.reputation}`,
            text: `Reputation milestone — <span class="gold">top promotions are watching</span>. New offers coming through.`
        });
    } else if (career.reputation >= 2) {
        news.push({
            type: 'rank',
            timestamp: `Rep ${career.reputation}`,
            text: `Building a name. Regional shows are interested.`
        });
    }

    if (news.length === 0) {
        news.push({
            type: 'career',
            timestamp: 'Today',
            text: `Pro debut pending. Pick up your first fight offer from the manager.`
        });
    }

    return news.slice(0, 4);
}

function buildCategoryStats() {
    return ATTRIBUTE_GROUP_ORDER.map(groupKey => {
        const group = ATTRIBUTE_GROUPS[groupKey];
        const value = Math.round(getAttributeAverage(state.stats, groupKey, ATTRIBUTE_GROUPS));
        return {
            key: groupKey,
            label: group.tag || group.label.slice(0, 3).toUpperCase(),
            value
        };
    });
}

function getActionState(actionId) {
    const career = state.career;
    const hasContract = Boolean(career.contract);
    const campDone = hasContract && career.campWeeksCompleted >= career.campWeeksTotal;

    switch (actionId) {
        case 'fight-offers':
            return {
                enabled: !hasContract,
                label: hasContract
                    ? 'Locked · contract active'
                    : career.lastFightResult ? `${formatRecord(career.record)} · next booking` : 'Pro debut available'
            };
        case 'continue-camp':
            return {
                enabled: hasContract && !campDone,
                label: hasContract
                    ? campDone ? 'Camp complete · ready' : `Week ${career.campWeeksCompleted + 1} of ${career.campWeeksTotal}`
                    : 'No camp until contract is signed'
            };
        case 'fight-night':
            return {
                enabled: campDone,
                label: campDone ? 'Camp complete · walk' : hasContract ? `${career.campWeeksTotal - career.campWeeksCompleted} weeks left` : 'No fight booked'
            };
        default:
            return { enabled: true, label: '' };
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildFightHero(vm) {
    const career = state.career;
    const lastName = (state.setup.lastName || 'You').toUpperCase();

    if (career.contract && career.campWeeksCompleted < career.campWeeksTotal) {
        const opponentLastName = career.contract.opponentName.split(/\s+/).slice(-1)[0].toUpperCase();
        const weeksLeft = career.campWeeksTotal - career.campWeeksCompleted;
        return {
            disabled: false,
            action: 'continue-camp',
            eyebrow: `Next Bout · ${escapeHtml(career.contract.eventName)}`,
            headline: `Continue<br>the <span class="red">camp.</span>`,
            tagline: `${escapeHtml(career.contract.eventName)} · ${escapeHtml(career.contract.stageLabel || 'Main Card')} · ${weeksLeft}-week sprint`,
            leftName: lastName,
            rightName: opponentLastName,
            metaLeft: `${escapeHtml(vm.weightClass)} · ${vm.weightValue} lbs`,
            metaRight: `Camp: <span class="weeks">${weeksLeft} week${weeksLeft === 1 ? '' : 's'} left</span>`
        };
    }

    if (career.contract) {
        const opponentLastName = career.contract.opponentName.split(/\s+/).slice(-1)[0].toUpperCase();
        return {
            disabled: false,
            action: 'fight-night',
            eyebrow: 'Fight Week · Main Card',
            headline: `Enter<br>the <span class="red">cage.</span>`,
            tagline: `${escapeHtml(career.contract.eventName)} · camp complete`,
            leftName: lastName,
            rightName: opponentLastName,
            metaLeft: `${escapeHtml(vm.weightClass)} · ${vm.weightValue} lbs`,
            metaRight: `<span class="weeks">Walk to the cage</span>`
        };
    }

    return {
        disabled: false,
        action: 'fight-offers',
        eyebrow: 'No Contract · Pick Your Fight',
        headline: `Take<br>the <span class="red">offer.</span>`,
        tagline: `Three offers on the table. Pick the matchup that climbs you up.`,
        leftName: lastName,
        rightName: 'TBD',
        metaLeft: `${escapeHtml(vm.weightClass)} · ${vm.weightValue} lbs`,
        metaRight: `<span class="weeks">No camp scheduled</span>`
    };
}

export function renderProfile() {
    const vm = getProfileViewModel();
    const root = document.getElementById('scene-profile');
    if (!root) {
        return;
    }

    const heading = buildHubHeadline(vm);
    const hero = buildFightHero(vm);
    const news = buildNewsItems();
    const stats = buildCategoryStats();
    const playerRankLabel = getRankLabel(getPlayerRank());

    const archetype = vm.archetype;
    const portraitCard = renderPortraitCard({
        name: vm.fullName,
        nickname: vm.fullName === 'Unnamed Fighter' ? null : `The ${archetype.name}`,
        tier: 'player',
        countryCode: vm.country.code,
        archetypeLabel: archetype.name,
        overall: vm.overall,
        tierLabel: archetype.name
    });

    root.innerHTML = `
        <div class="hub-title">
            <div class="hub-eyebrow">${escapeHtml(heading.eyebrow)}</div>
            <h1 class="hub-title-text">${heading.title}</h1>
            <p class="hub-subtitle">${escapeHtml(heading.subtitle)}</p>
        </div>

        <div class="hub-grid">
            <button class="fight-card" data-hub-action="${hero.action}" ${hero.disabled ? 'disabled' : ''}>
                <div class="fight-card-bg"></div>
                <svg class="octagon-ornament" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="100,15 158,42 185,100 158,158 100,185 42,158 15,100 42,42"
                             fill="none" stroke="#e21d36" stroke-width="2"/>
                    <polygon points="100,35 144,57 165,100 144,143 100,165 56,143 35,100 56,57"
                             fill="none" stroke="#e21d36" stroke-width="1" stroke-dasharray="3 4"/>
                    <polygon points="100,55 130,72 145,100 130,128 100,145 70,128 55,100 70,72"
                             fill="none" stroke="#e21d36" stroke-width="0.5" opacity="0.5"/>
                </svg>
                <div class="fight-card-content">
                    <div class="fight-eyebrow">${hero.eyebrow}</div>
                    <h2 class="fight-headline">${hero.headline}</h2>
                    <p class="fight-tagline">${hero.tagline}</p>
                    <div class="matchup-strip">
                        <div class="matchup-line">
                            <div class="matchup-side red">
                                <div class="corner">Red Corner</div>
                                <div class="name">${escapeHtml(hero.leftName)}</div>
                            </div>
                            <div class="matchup-vs">VS</div>
                            <div class="matchup-side opp">
                                <div class="corner">Blue Corner</div>
                                <div class="name">${escapeHtml(hero.rightName)}</div>
                            </div>
                        </div>
                        <div class="matchup-meta">
                            <span>${hero.metaLeft}</span>
                            <span>${hero.metaRight}</span>
                        </div>
                    </div>
                </div>
            </button>

            <div class="action-stack">
                ${ACTION_CARDS.map(card => {
                    const status = getActionState(card.id);
                    return `
                        <button class="action-card" data-color="${card.color}" data-hub-action="${card.action}" ${status.enabled ? '' : 'disabled'}>
                            <div class="action-card-row">
                                <div class="action-icon">${card.icon}</div>
                                <div class="action-text">
                                    <div class="label">${escapeHtml(status.label)}</div>
                                    <div class="title">${escapeHtml(card.title)}</div>
                                </div>
                                <div class="action-arrow">→</div>
                            </div>
                        </button>
                    `;
                }).join('')}

                <div class="stats-card">
                    <div class="stats-card-head">
                        <div class="title">My Fighter</div>
                        <div class="ovr"><small>OVR</small>${vm.overall}</div>
                    </div>
                    <div class="stats-row">
                        ${stats.map(stat => `
                            <div class="stat-cell" data-cat="${stat.key}">
                                <div class="label">${escapeHtml(stat.label)}</div>
                                <div class="value">${stat.value}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="style-tag">
                        <span>Fighting Style</span>
                        <span class="v">${escapeHtml(archetype.name)} · ${escapeHtml(vm.country.name)}</span>
                    </div>
                </div>

                <div class="news-card">
                    <div class="news-head">
                        <div class="title">The Feed</div>
                        <div class="meta">${news.length} ${news.length === 1 ? 'item' : 'items'}</div>
                    </div>
                    <div class="news-list">
                        ${news.map(item => `
                            <div class="news-item" data-type="${item.type}">
                                <div class="dot"></div>
                                <div class="text">${item.text}</div>
                                <div class="timestamp">${escapeHtml(item.timestamp)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="fighter-feature">
                <div class="feature-bg"></div>
                <div class="feature-content">
                    <div class="feature-tier-row">
                        <div class="feature-tier-pill rank">${escapeHtml(playerRankLabel)} · ${escapeHtml(vm.weightClass.toUpperCase())}</div>
                        <div class="feature-tier-pill">${escapeHtml(formatRecord(state.career.record))} · ${state.career.record.finishes} ${state.career.record.finishes === 1 ? 'finish' : 'finishes'}</div>
                    </div>

                    <div class="feature-portrait-block">
                        ${portraitCard}
                    </div>

                    <div class="feature-banner">
                        <div class="name">${escapeHtml(vm.fullName.toUpperCase())}</div>
                        <div class="nickname">"The ${escapeHtml(archetype.name)}"</div>
                    </div>

                    <div class="feature-vitals">
                        <div class="vital-cell"><div class="label">Age</div><div class="value">${state.setup.age}</div></div>
                        <div class="vital-cell"><div class="label">Height</div><div class="value">${escapeHtml(vm.heightLabel)}</div></div>
                        <div class="vital-cell"><div class="label">Weight</div><div class="value">${vm.weightValue}<span class="unit">lb</span></div></div>
                        <div class="vital-cell"><div class="label">Reach</div><div class="value">${vm.reachValue}<span class="unit">"</span></div></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="continue-bar">
            <div class="text">
                <div class="head">${escapeHtml(vm.progressCopy.heading)}</div>
                <p>${escapeHtml(vm.progressCopy.copy)}</p>
            </div>
            <button class="btn" id="btn-profile-progress">${escapeHtml(vm.progressCopy.buttonLabel)}</button>
            <button class="btn ghost small" id="btn-restart">Start Over</button>
        </div>
    `;
}
