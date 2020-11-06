'use strict';

const {sendMessageToCurrentTab, sendGlobalMessage} = messagingUtils;

let addClickShortkeyBtn = document.getElementById('add-click-shortkey');
let addScriptShortkeyBtn = document.getElementById('add-script-shortkey');
let openOptionsBtn = document.getElementById('open-options-btn');
let openShortkeysBtn = document.getElementById('open-shortkeys-btn');
let inSiteInfoWrapper = document.getElementById('in-site-info');
let offOnSiteSwitch = document.getElementById('off-on-site');
let offForAllSwitch = document.getElementById('off-for-all');
let openDocumentsLink = document.getElementById('open-documents');

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

openShortkeysBtn.onclick = function () {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs ? tabs[0] : {};
        const targetHost = utils.getOriginOfURL(activeTab.url)
        const optionsPageURL = chrome.extension.getURL(`options/list.html?host=${targetHost}`);
        window.open(optionsPageURL);
    });
}

openDocumentsLink.onclick = function () {
    const optionsPageURL = chrome.extension.getURL("options/documents.html");
    window.open(optionsPageURL);
}

addClickShortkeyBtn.onclick = function (element) {
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

addScriptShortkeyBtn.onclick = function (element) {
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
            const {shortkeys = []} = siteData;
            // update off status
            offOnSiteSwitch.checked = siteData.options && !!siteData.options.off

            const len = shortkeys ? shortkeys.length : 0;
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

