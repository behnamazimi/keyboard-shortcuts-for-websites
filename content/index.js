'use strict';

// init tab
initContent();

shortkeys.onAdd((shortkeys) => {
    console.log(shortkeys);
    sendGlobalMessage({
        action: globalActions.NEW_SHORTCUT,
        host: location.origin,
        shortkeys,
    });
})

chrome.runtime.onMessage.addListener(function (data, details) {
    switch (data.action) {
        case globalActions.GLOBAL_OPTIONS_UPDATE:
        case contentActions.OPTION_UPDATE:
            const {globalOptions = {}, options = {}, shortkeys = []} = data;

            shortkeys.upHostShortkeys(shortkeys, {...globalOptions, ...options})
            break;

        case contentActions.START_LISTENING:
            startListening(data.type);
            break;

        case contentActions.SHORTCUT_ADDED:
            shortkeys.showSuccessToast(data.keys);
            break;

        case contentActions.SHORTCUTS_UPDATED:
            initContent()
            break;

    }

})

function startListening(type) {
    if (shortkeys.listening) return;

    shortkeys.listen(type);
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

        console.log(siteData.shortkeys);
        shortkeys.upHostShortkeys(siteData.shortkeys || [],
            {...globalOptions, ...options})
    });
}
