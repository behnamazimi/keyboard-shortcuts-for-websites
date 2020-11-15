'use strict';

const {sendMessageToCurrentTab, sendGlobalMessage} = messagingUtils;

let addClickShortkeyBtn = document.getElementById('add-click-shortkey');
let addScriptShortkeyBtn = document.getElementById('add-script-shortkey');
let openOptionsBtn = document.getElementById('open-options-btn');
let openShortkeysBtn = document.getElementById('open-shortkeys-btn');
let inSiteInfoWrapper = document.getElementById('in-site-info');
let offOnSiteSwitch = document.getElementById('off-on-site');
let offForAllSwitch = document.getElementById('off-for-all');

// find active tab and init popup
getActiveTabInfo((activeTab) => {
    const host = utils.getOriginOfURL(activeTab.url)
    initPopup(host);
})

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

addClickShortkeyBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: contentActions.START_LISTENING, type: 0})
};

addScriptShortkeyBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: contentActions.START_LISTENING, type: 1})
};

function initPopup(host) {
    sendGlobalMessage({action: globalActions.POPUP_INIT, host}, (response) => {
        const {siteData = {}, globalOptions, sharedKeys = []} = response || {};

        const {shortkeys = []} = siteData;
        // update off status
        offOnSiteSwitch.checked = siteData.options && !!siteData.options.off

        const len = shortkeys ? shortkeys.length : 0;
        let info = '<p>No shortkeys added before. </p>'
        if (len) {
            const justOne = (len === 1);
            info = `<p><strong>${len}</strong> short-key${justOne ? "" : "s"} found for this site.</p>`
        }
        if (sharedKeys.length) {
            const justOne = (sharedKeys.length === 1);
            info += `<p><strong>${sharedKeys.length}</strong> shared short-key${justOne ? "" : "s"} found.</p>`;
        }

        inSiteInfoWrapper.innerHTML = info;

        // global options
        if (globalOptions) {
            // update off status
            offForAllSwitch.checked = !!globalOptions.off
        }
    });
}

function getActiveTabInfo(cb) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs ? tabs[0] : {};
        cb && typeof cb === "function" && cb(activeTab)
    });
}
