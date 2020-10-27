'use strict';

// init tab
sendGlobalMessage({action: globalActions.INIT, host: location.origin}, (data = {}) => {
    const {siteData, globalOptions = {}} = data;
    if (globalOptions.off)
        return;

    const options = siteData && siteData.options ? siteData.options : {};

    if (!options.off) {
        console.log(siteData.shortcuts);
        shortkeys.upHostShortcuts(siteData.shortcuts || [])
    }
});

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

            if (globalOptions.off) {
                shortkeys.downHostShortcuts()
            } else {
                if (options.off) {
                    shortkeys.downHostShortcuts()
                } else {
                    shortkeys.upHostShortcuts(shortcuts)
                }
            }
            break;

        case contentActions.START_LISTENING:
            startListening();
            break;

        case contentActions.SHORTCUT_ADDED:
            shortkeys.showSuccessToast(data.keys);
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

// chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
//   // If the received message has the expected format...
//   if (msg.text === 'report_back') {
//     // Call the specified callback, passing
//     // the web-page's DOM content as argument
//     sendResponse(document.all[0].outerHTML);
//   }
// });

// chrome.runtime.onMessage.addListener(function ({action}, details) {
//     console.log(action);
//     // if (action === "INIT") {
//     //     chrome.runtime.sendMessage({"action": "INIT"});
//     // }
//
// })

// shortkeys.init(window.location.origin);
// shortkeys.listen();
//
// document.addEventListener("click", (e) => {
//     shortkeys.addStep(e)
// })

// chrome.runtime.sendMessage({greeting: "hello"}, function (response) {
//     console.log(response);
// });

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     console.log(sender.tab ?
//         "from a content script:" + sender.tab.url :
//         "from the extension");
//     if (request.greeting == "hello")
//         sendResponse({farewell: "goodbye"});
// });