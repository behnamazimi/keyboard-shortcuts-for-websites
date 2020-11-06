'use strict';
// TODO: write a document and add its page
// TODO: test on spotify
// TODO: view site shortkeys on content

// update host on tab change
chrome.runtime.onMessage.addListener(handleMessages)

chrome.tabs.onActivated.addListener(handleTabActivation);


function handleMessages(data, details, sendResponse) {
    switch (data.action) {
        case globalActions.INIT:
            storeUtils.setHost(data.host);
            storeUtils.getAllData((allData) => {
                sendResponse({
                    siteData: allData.shortkeys[storeUtils.host],
                    globalOptions: allData.globalOptions,
                    sharedShortkeys: allData.shortkeys[storeUtils.sharedShortkeysKey]
                });
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
            storeUtils.setHost(data.host)
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
                updateExtStatusInTab()
            })
            break;
        case globalActions.GLOBAL_OPTIONS_UPDATE:
            storeUtils.storeGlobalOptions(data.options, (globalOptions) => {
                messagingUtils.sendMessageToAllTabs({action: contentActions.OPTION_UPDATE, globalOptions});
                updateExtStatusInTab();
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
            storeUtils.setHost(data.host)
            storeUtils.removeShortkey(data.id, (res) => {
                sendResponse(res);
                messagingUtils.sendMessageToAllTabs({action: contentActions.SHORTCUTS_UPDATED});
            })
            return true
        case globalActions.DELETE_HOST:
            storeUtils.setHost(data.host)
            storeUtils.removeHost((res) => {
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

function handleTabActivation(tabInfo) {
    const tabId = tabInfo.tabId || tabInfo.id;

    chrome.tabs.get(tabId, ({url}) => {
        updateExtStatusInTab(tabId, url)
    })
}

function updateExtStatusInTab(tabId, url) {
    if (tabId && url) {
        const isAllowed = url.startsWith && url.startsWith("http");
        let iconPath = {
            "16": `icons/${isAllowed ? "" : "d_"}16x16.png`,
            "32": `icons/${isAllowed ? "" : "d_"}32x32.png`,
            "48": `icons/${isAllowed ? "" : "d_"}48x48.png`,
            "128": `icons/${isAllowed ? "" : "d_"}128x128.png`
        }

        if (isAllowed) {
            storeUtils.setHost(url)
            chrome.browserAction.enable(tabId);
        } else {
            chrome.browserAction.disable(tabId);
        }

        // update icon
        chrome.browserAction.setIcon({tabId: tabId, path: iconPath});
    }

    storeUtils.loadGlobalOptions((globalOptions = {}) => {
        storeUtils.loadHostData((hostData = {}) => {

            const isOff = (hostData.options && !!hostData.options.off) || !!globalOptions.off
            if (isOff) {
                chrome.browserAction.setBadgeText({text: 'off'});
                chrome.browserAction.setBadgeBackgroundColor({color: '#f14545'});
            } else {
                chrome.browserAction.setBadgeText({text: ''});
            }
        })
    })
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