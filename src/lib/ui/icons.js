function wrapIcon(paths, viewBox = '0 0 24 24') {
    return `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false" class="ui-icon">${paths}</svg>`;
}

const ICON_PATHS = {
    boxer: '<path d="M8 10.2 10.8 7h3.4l1.8 2.1 1.4.2v5.5l-1.8 2.2H9.6L7 14.2v-3.1Z"/><path d="M9.8 6.1h3v1.7h-3Z"/><path d="M8.2 12.1h8.7"/>',
    kickboxer: '<path d="M6.4 14.9h4.2l2.6-2.7 2.6.5 1.8-2.3"/><path d="M10.2 14.9 8.6 18"/><path d="M12.8 11.8 15.3 9.2"/><path d="M15.9 6.6h2.6v2.6h-2.6z"/>',
    wrestler: '<path d="M7.3 8.1 10 10.5l2-1.9 2.1 1.9 2.6-2.4 1.5 1.8-3 2.7v4.8h-2.6v-3.1h-1.2v3.1H8.8v-4.8l-3-2.7z"/><path d="M9.4 6.7h5.2"/>',
    grappler: '<path d="M7.3 8.7 10 11l2-1.9 2 1.9 2.7-2.3 1.5 1.7-2.9 2.5 2.1 2.2-1.8 1.7-2.3-2.3-2.1 2-2.1-2-2.3 2.3-1.8-1.7 2.1-2.2-2.9-2.5z"/>',
    allRounder: '<path d="M12 5.4 17.4 8.6v6.8L12 18.6l-5.4-3.2V8.6z"/><path d="M12 7.9v8.2"/><path d="M8.6 10.1 12 12l3.4-1.9"/><path d="M8.6 13.9 12 12l3.4 1.9"/>',
    reset: '<path d="M6.7 8.3A6.6 6.6 0 1 1 5.5 12H3l3.2-3.7L9.4 12H7a5 5 0 1 0 .9-2.9z"/>',
    standup: '<path d="M7 15.5 9.7 8h4.6l2.7 7.5-2.3.8-1-2.8H10l-1 2.8z"/>',
    grapplingGroup: '<path d="M7.4 8.1 10 10.3l1.8-1.6 1.8 1.5 2.5-2.1 1.6 1.9-3.8 3.3-2.1-1.8-2.7 2.4-3.3-3z"/>',
    health: '<path d="M12 19.2 5.8 13a4.2 4.2 0 1 1 6-5.9 4.2 4.2 0 1 1 6 5.9z"/>',
    mind: '<path d="M12 4.7a5.8 5.8 0 0 1 4.1 9.9v2.2H7.9v-2.2A5.8 5.8 0 0 1 12 4.7z"/><path d="M9.3 19h5.4"/>',
    country: '<path d="M6 5.5h12v13H6z"/><path d="M8.5 7.5v9"/><path d="M6 9.5h12"/>',
    fighter: '<path d="M12 4.8a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z"/><path d="M8.2 18.7 9.4 12l-1.8-2.6 2.1-1.4 2.3 2.7 2.3-2.7 2.1 1.4-1.8 2.6 1.2 6.7h-2.5l-.7-4.1-.6 4.1z"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    plus: '<path d="M12 6v12M6 12h12"/>',
    minus: '<path d="M6 12h12"/>'
};

export function getIcon(name) {
    const paths = ICON_PATHS[name];
    if (!paths) {
        return '';
    }
    return wrapIcon(paths);
}
