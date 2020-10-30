'use strict';

let addClickShortcutBtn = document.getElementById('add-click-shortcut');
let addScriptShortcutBtn = document.getElementById('add-script-shortcut');
let openOptionsBtn = document.getElementById('open-options-btn');
let inSiteInfoWrapper = document.getElementById('in-site-info');
let offOnSiteSwitch = document.getElementById('off-on-site');
let offForAllSwitch = document.getElementById('off-for-all');

initPopup();

offOnSiteSwitch.onchange = function (e) {
    const off = !!e.target.checked;
    sendGlobalMessage({action: globalActions.HOST_OPTION_UPDATE, options: {off}});
}

offForAllSwitch.onchange = function (e) {
    const off = !!e.target.checked;
    sendGlobalMessage({action: globalActions.GLOBAL_OPTIONS_UPDATE, options: {off}});
}

openOptionsBtn.onclick = function () {
    const optionsPageURL = chrome.extension.getURL("options/settings.html");
    window.open(optionsPageURL);
}

addClickShortcutBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: contentActions.START_LISTENING, type: 0})

    // let color = element.target.value;
    // chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //     chrome.tabs.executeScript(
    //         tabs[0].id,
    //         {code: 'document.body.style.backgroundColor = "' + color + '";'});
    // });
};

addScriptShortcutBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: contentActions.START_LISTENING, type: 1})
};

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {

});

function initPopup() {
    sendGlobalMessage({action: globalActions.POPUP_INIT}, (response) => {
        const {siteData, globalOptions} = response || {};

        if (siteData) {
            const {shortcuts = []} = siteData;
            // update off status
            offOnSiteSwitch.checked = siteData.options && !!siteData.options.off

            const len = shortcuts ? shortcuts.length : 0;
            if (len) {
                const justOne = len === 1;
                inSiteInfoWrapper.innerHTML = `<p><strong>${len}</strong> short-key${justOne ? "" : "s"} added to this site.</p>`
            }
        }

        // global options
        if (globalOptions) {
            // update off status
            offForAllSwitch.checked = !!globalOptions.off
        }
    });
}

function sendMessageToCurrentTab(body) {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, body);
    });
}

function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
}