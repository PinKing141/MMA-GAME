// Pure ranking math. No state access, no mutation.
// Action layer reads currentRank / opponentRank from state, calls this,
// then applies the returned values back to state.

export function resolveRankingUpdate({ currentRank, opponentRank, resultLabel }) {
    let nextPlayerRank = currentRank;
    let opponentRankIncrement = 0;

    if (resultLabel === 'Win') {
        if (typeof opponentRank === 'number') {
            nextPlayerRank = currentRank === null
                ? Math.min(25, opponentRank + 1)
                : Math.min(currentRank, opponentRank);

            if (nextPlayerRank <= opponentRank) {
                opponentRankIncrement = 1;
            }
        } else if (currentRank !== null) {
            nextPlayerRank = Math.max(1, currentRank - 1);
        }
    } else if (resultLabel === 'Loss') {
        nextPlayerRank = currentRank === null
            ? null
            : (currentRank >= 24 ? null : currentRank + 2);
    }

    return { nextPlayerRank, opponentRankIncrement };
}
