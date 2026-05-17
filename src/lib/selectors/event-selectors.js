import { getOverallAverage, getWeightClassEntry, state } from '../core.js';
import { formatMoney, formatRecord, getRankLabel } from '../utils/formatters.js';
import { getContractPreview } from '../actions/contract-actions.js';
import { getEventLockReason } from '../data/events.js';
import { getFlagEmoji } from '../fight-week-adapter.js';
import { describeOpponentStyle } from '../utils/style-flavor.js';
import { getPlayerRank } from './career-selectors.js';

export function getOpponentViewModel() {
    const playerRank = getPlayerRank();
    const selectedOpponent = state.career.selectedOpponent;
    const selectedEvent = state.career.selectedEvent;
    const contractPreview = getContractPreview(selectedEvent, selectedOpponent);
    const rankingRows = [
        ...state.career.availableOpponents.map(opponent => ({
            key: opponent.id,
            rank: opponent.rank,
            label: opponent.name,
            meta: `${opponent.nickname} · ${formatRecord(opponent.record)}`,
            isPlayer: false
        })),
        {
            key: 'player',
            rank: playerRank,
            label: [state.setup.firstName, state.setup.lastName].filter(Boolean).join(' ') || 'Unnamed Fighter',
            meta: playerRank ? 'Player ranking' : 'Unranked contender',
            isPlayer: true
        }
    ].sort((left, right) => {
        if (left.rank === null && right.rank === null) {
            return left.label.localeCompare(right.label);
        }

        if (left.rank === null) {
            return 1;
        }

        if (right.rank === null) {
            return -1;
        }

        return left.rank - right.rank;
    });

    return {
        playerOverall: getOverallAverage(state.stats),
        playerClass: getWeightClassEntry(state.setup.weight).name,
        playerRankLabel: getRankLabel(playerRank),
        playerCash: formatMoney(state.career.cash),
        eventCards: state.career.availableEvents.map(event => {
            const lockReason = getEventLockReason(event, state.career, playerRank);
            const locked = Boolean(lockReason);
            return {
                id: event.id,
                selected: state.career.selectedEvent?.id === event.id,
                disabled: locked,
                name: event.name,
                sub: `${event.venue} · ${event.location}`,
                overall: locked ? 'Locked' : event.stageLabel,
                meta: locked
                    ? `Locked · ${lockReason}`
                    : `${event.stageLabel} · Show ${formatMoney(event.showMoney)} · Win ${formatMoney(event.winBonus)}`,
                blurb: event.blurb,
                economy: locked
                    ? `Earn the booking. ${lockReason}`
                    : `Rep bonus +${event.reputationBonus}`
            };
        }),
        selectedOpponentSummary: selectedOpponent
            ? {
                name: selectedOpponent.name,
                meta: `${selectedOpponent.nickname} · ${formatRecord(selectedOpponent.record)} · ${selectedOpponent.archetype.name}`,
                blurb: selectedOpponent.blurb,
                rankLabel: getRankLabel(selectedOpponent.rank),
                overall: selectedOpponent.overall,
                difficulty: selectedOpponent.difficulty,
                purse: formatMoney(selectedOpponent.purse)
            }
            : null,
        opponentCards: state.career.availableOpponents.map(opponent => {
            const style = describeOpponentStyle(opponent);
            return {
                id: opponent.id,
                selected: state.career.selectedOpponent?.id === opponent.id,
                name: opponent.name,
                sub: `"${opponent.nickname}" · ${formatRecord(opponent.record)}`,
                overall: opponent.overall,
                rank: opponent.rank,
                flag: getFlagEmoji(opponent.country?.code || opponent.countryCode),
                primaryStyle: style.primary,
                styleFlavor: style.flavor,
                meta: `${getRankLabel(opponent.rank)} · ${opponent.difficulty}`,
                blurb: opponent.blurb,
                economy: `Purse ${formatMoney(opponent.purse)} · Gym pull ${opponent.gymReputation}`
            };
        }),
        rankingRows: rankingRows.map(entry => ({
            ...entry,
            rankLabel: getRankLabel(entry.rank)
        })),
        contractSummary: contractPreview
            ? {
                eventName: contractPreview.eventName,
                venueLine: `${contractPreview.venue} · ${contractPreview.location}`,
                moneyLine: `Show ${formatMoney(contractPreview.showMoney)} · Win ${formatMoney(contractPreview.winBonus)}`,
                bonusLine: `Max ${formatMoney(contractPreview.totalPotential)} · Rep +${contractPreview.reputationBonus}`
            }
            : null,
        cutNote: selectedOpponent
            ? `Expected weight cut starts around ${state.career.weightCutPressure}% before camp.`
            : 'Pick a matchup to see what kind of cut you are walking into.',
        contractNote: contractPreview
            ? 'Deal is ready. Sign it and head into camp.'
            : !selectedEvent
                ? 'Pick the card first, then choose the matchup.'
                : !selectedOpponent
                    ? 'Card is set. Pick the opponent to build the contract.'
                    : 'Select both the event and opponent to move on.',
        actionLabel: contractPreview ? 'Sign Deal & Start Camp' : 'Pick Event And Opponent',
        canBeginCamp: Boolean(contractPreview)
    };
}
