'use strict';

const {sendGlobalMessage} = messagingUtils;

// init tab

chrome.runtime.onMessage.addListener(handleMessages)

initContent();

ShortKeys.onAdd((shortkeys) => {
    console.log(shortkeys);
    sendGlobalMessage({
        action: globalActions.NEW_SHORTCUT,
        host: location.origin,
        shortkeys,
    });
})

function handleMessages(data, details) {
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
}

function initContent() {
    sendGlobalMessage({action: globalActions.INIT, host: location.origin}, (data = {}) => {
        const {siteData = {}, globalOptions = {}, sharedShortkeys = []} = data;

        if (globalOptions.off) return;

        const options = siteData && siteData.options ? siteData.options : {};

        const allKeys = [...(siteData.shortkeys || []), ...(sharedShortkeys || [])];
        ShortKeys.upHostShortkeys(allKeys, {...globalOptions, ...options})
    });
}

function startListening(type) {
    if (ShortKeys.listening) return;

    ShortKeys.listen(type);
}
