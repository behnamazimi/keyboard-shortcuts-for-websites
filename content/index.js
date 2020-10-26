'use strict';

let isOff = false;

// init tab
chrome.runtime.sendMessage({"action": "INIT", host: location.origin});

shortkeys.onAdd((shortcuts) => {
    console.log(shortcuts);
    chrome.runtime.sendMessage({"action": "ADD", shortcuts, host: location.origin});
})

chrome.runtime.onMessage.addListener(function (data, details) {

    if (data.action === contentActions.OFF_STATUS) {
        isOff = data.off;
        if (isOff) {
            shortkeys.downHostShortcuts()
        } else {
            shortkeys.upHostShortcuts()
        }

    } else if (data.action === contentActions.OPEN_STEPS_POPUP) {
        startListening();

    } else if (data.action === contentActions.HOST_SHORTCUTS) {
        shortkeys.upHostShortcuts(data.shortcuts)

    } else if (data.action === contentActions.SHORTCUT_ADDED) {
        shortkeys.showSuccessToast(data.keys);
    }
})

function startListening() {
    if (shortkeys.listening) return;

    shortkeys.listen();
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