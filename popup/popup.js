'use strict';

chrome.runtime.sendMessage({"action": "POPUP_INIT"});

let addNewBtn = document.getElementById('add-new-shortcut');
let openOptionsBtn = document.getElementById('open-options-btn');
let inSiteInfoWrapper = document.getElementById('in-site-info');

openOptionsBtn.onclick = function () {
    const optionsPageURL = chrome.extension.getURL("options.html");
    window.open(optionsPageURL);
}


addNewBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: "OPEN_POPUP"})

    // let color = element.target.value;
    // chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //     chrome.tabs.executeScript(
    //         tabs[0].id,
    //         {code: 'document.body.style.backgroundColor = "' + color + '";'});
    // });
};

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
    if (data.action === "POPUP_INIT_RES") {
        const len = data.shortcuts ? data.shortcuts.length : 0;
        if (len) {
            const justOne = len === 1;
            inSiteInfoWrapper.innerHTML = `<p><strong>${len}</strong> short-key${justOne ? "" : "s"} added to this site.</p>`
        }
    }
});

function sendMessageToCurrentTab(body) {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, body);
    });
}