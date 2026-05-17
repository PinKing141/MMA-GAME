export function getDefaultVenueTier(contract) {
    if (!contract) {
        return 'local';
    }

    if (/PPV|Arena|Stadium/i.test(contract.stageLabel || '') || /new-york/i.test(contract.eventId || '')) {
        return 'stadium';
    }

    if (/TV|Co-Main|Main Card/i.test(contract.stageLabel || '')) {
        return 'regional';
    }

    return 'local';
}

export function getAllowedVenueTiers(contract) {
    return [getDefaultVenueTier(contract)];
}