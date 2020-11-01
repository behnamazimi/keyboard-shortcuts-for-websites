'use strict';
// TODO
//  edit steps waiting for each shortkey
//  test on file protocol

let host = null;

// update host on tab change
chrome.runtime.onMessage.addListener(handleMessages)

chrome.tabs.onActivated.addListener(handleTabChange);

function handleMessages(data, details, sendResponse) {
    switch (data.action) {
        case globalActions.INIT:
            setHost(data.host)
            storeUtils.loadGlobalOptions((globalOptions) => {
                storeUtils.loadHostData((siteData = {}) => {
                    sendResponse({siteData, globalOptions});
                })
            })
            return true;
        case globalActions.POPUP_INIT:
            // get site data and global options
            storeUtils.loadGlobalOptions((globalOptions) => {
                storeUtils.loadHostData((siteData = {}) => {
                    sendResponse({siteData, globalOptions});
                })
            })
            return true;
        case globalActions.NEW_SHORTCUT:
            setHost(data.host)
            if (!Array.isArray(data.shortkeys)) return;

            // the last item is the new shortkey
            const shortkey = data.shortkeys[data.shortkeys.length - 1]
            storeUtils.storeNewShortkey(shortkey)
            break;
        case globalActions.HOST_OPTION_UPDATE:
            storeUtils.storeHostOption(data.options, siteData => {
                messagingUtils.sendMessageToCurrentTab({
                    action: contentActions.OPTION_UPDATE,
                    options: siteData.options,
                    shortkeys: siteData.shortkeys,
                });
            })
            break;
        case globalActions.GLOBAL_OPTIONS_UPDATE:
            storeUtils.storeGlobalOptions(data.options, (globalOptions) => {
                messagingUtils.sendMessageToAllTabs({action: contentActions.OPTION_UPDATE, globalOptions});
                sendResponse(globalOptions)
            })
            return true;
        case globalActions.GET_ALL_DATA:
            storeUtils.getAllData((res) => sendResponse(res))
            return true
        case globalActions.CLEAT_DATA:
            storeUtils.clearAllData(() => sendResponse())
            return true
        case globalActions.DELETE_SHORTKEY:
            setHost(data.host)
            storeUtils.removeShortkey(data.id, (res) => {
                sendResponse(res);
                messagingUtils.sendMessageToAllTabs({action: contentActions.SHORTCUTS_UPDATED});
            })
            return true
        case globalActions.IMPORT_DATA:
            storeUtils.parseAndSaveImportJson(data.jsonStr, (res) => {
                sendResponse(res);
                messagingUtils.sendMessageToAllTabs({action: contentActions.SHORTCUTS_UPDATED});
            })
            return true
    }

}

function handleTabChange(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, ({url}) => {
        setHost(url)
    })
}

function setHost(url) {
    if (!url) return;

    if (url.indexOf("http") > -1) {
        const uO = new URL(url)
        host = uO.origin;

        host = host.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
    } else {
        host = url
    }

    return host;
}

function getHostKey() {
    return host;
}

// chrome.runtime.sendMessage({greeting: "optionsPageURL"}, function (response) {
//     console.log(response);
// });

// // A function to use as callback
// function doStuffWithDom(domContent) {
//     console.log('I received the following DOM content:\n' + domContent);
// }
//
// When the browser-action button is clicked...

// chrome.browserAction.onClicked.addListener(function (tab) {
//     console.log(tab);
//     // ...check the URL of the active tab against our pattern and...
//     // ...if it matches, send a message specifying a callback too
//     // chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, doStuffWithDom);
// });

// chrome.runtime.onInstalled.addListener(function () {
//     console.log("installed");
// });

// chrome.management.getAll((res) => {
//     console.log(res);
// })