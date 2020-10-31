'use strict';

// init tab
initContent();

ShortKeys.onAdd((shortkeys) => {
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

            ShortKeys.upHostShortkeys(shortkeys, {...globalOptions, ...options})
            break;

        case contentActions.START_LISTENING:
            startListening(data.type);
            break;

        case contentActions.SHORTCUT_ADDED:
            ShortKeys.showSuccessToast(data.keys);
            break;

        case contentActions.SHORTCUTS_UPDATED:
            initContent()
            break;

    }

})

function startListening(type) {
    if (ShortKeys.listening) return;

    ShortKeys.listen(type);
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
        ShortKeys.upHostShortkeys(siteData.shortkeys || [],
            {...globalOptions, ...options})
    });
}
