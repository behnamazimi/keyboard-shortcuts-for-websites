'use strict';

let listening = false;

// init tab
chrome.runtime.sendMessage({"action": "INIT", host: location.origin});

webShortcut.onAdd((shortcuts) => {
    chrome.runtime.sendMessage({"action": "ADD", shortcuts});
})

chrome.runtime.onMessage.addListener(function (data, details) {

    if (data.action === "OPEN_POPUP") {
        startListening();

    } else if (data.action === "HOST_SHORTCUTS") {
        webShortcut.upHostShortcuts(data.shortcuts)

    } else if (data.action === "SHORTCUT_ADDED") {
        webShortcut.showSuccessToast(data.keys);
    }
})

function handleDocClick(e) {
    webShortcut.addStep(e);
}

function startListening() {
    if (listening) return;

    listening = true;
    webShortcut.listen();

    document.addEventListener("click", handleDocClick)

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

// webShortcut.init(window.location.origin);
// webShortcut.listen();
//
// document.addEventListener("click", (e) => {
//     webShortcut.addStep(e)
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