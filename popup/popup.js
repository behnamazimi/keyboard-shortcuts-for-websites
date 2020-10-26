'use strict';

sendGlobalMessage({action: "POPUP_INIT"});

let addNewBtn = document.getElementById('add-new-shortcut');
let openOptionsBtn = document.getElementById('open-options-btn');
let inSiteInfoWrapper = document.getElementById('in-site-info');
let offOnSiteSwitch = document.getElementById('off-on-site');
let offOnAllSwitch = document.getElementById('off-on-all');

offOnSiteSwitch.onchange = function (e) {
    const off = !!e.target.checked;

    sendGlobalMessage({action: "OFF_ON_CURRENT", off});
}

openOptionsBtn.onclick = function () {
    const optionsPageURL = chrome.extension.getURL("options.html");
    window.open(optionsPageURL);
}

addNewBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: contentActions.OPEN_STEPS_POPUP})

    // let color = element.target.value;
    // chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //     chrome.tabs.executeScript(
    //         tabs[0].id,
    //         {code: 'document.body.style.backgroundColor = "' + color + '";'});
    // });
};

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
    if (data.action === "POPUP_INIT_RES") {
        const siteData = data.siteData;
        if (siteData) {
            // update off status
            offOnSiteSwitch.checked = !!siteData.off

            const len = siteData.shortcuts ? siteData.shortcuts.length : 0;
            if (len) {
                const justOne = len === 1;
                inSiteInfoWrapper.innerHTML = `<p><strong>${len}</strong> short-key${justOne ? "" : "s"} added to this site.</p>`
            }
        }

    }
});

function sendMessageToCurrentTab(body) {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, body);
    });
}

function sendGlobalMessage(body) {
    chrome.runtime.sendMessage(body);
}