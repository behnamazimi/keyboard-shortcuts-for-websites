'use strict';

// init tab
initContent();

shortkeys.onAdd((shortcuts) => {
    console.log(shortcuts);
    sendGlobalMessage({
        action: globalActions.NEW_SHORTCUT,
        host: location.origin,
        shortcuts,
    });
})

chrome.runtime.onMessage.addListener(function (data, details) {
    switch (data.action) {
        case globalActions.GLOBAL_OPTIONS_UPDATE:
        case contentActions.OPTION_UPDATE:
            const {globalOptions = {}, options = {}, shortcuts = []} = data;

            shortkeys.upHostShortcuts(shortcuts, {...globalOptions, ...options})
            break;

        case contentActions.START_LISTENING:
            startListening();
            break;

        case contentActions.SHORTCUT_ADDED:
            shortkeys.showSuccessToast(data.keys);
            break;

        case contentActions.SHORTCUTS_UPDATED:
            initContent()
            break;

    }

})

function startListening() {
    if (shortkeys.listening) return;

    shortkeys.listen();
}

function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
}

function initContent() {
    sendGlobalMessage({action: globalActions.INIT, host: location.origin}, (data = {}) => {
        const {siteData, globalOptions = {}} = data;

        if (globalOptions.off)
            return;

        const options = siteData && siteData.options ? siteData.options : {};

        console.log(siteData.shortcuts);
        shortkeys.upHostShortcuts(siteData.shortcuts || [],
            {...globalOptions, ...options})
    });
}
