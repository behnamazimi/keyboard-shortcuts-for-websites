'use strict';

try {
  importScripts("shared/constant.js", "shared/utils.js");
} catch (e) {
  console.log(e);
}

// update host on tab change
chrome.runtime.onMessage.addListener(handleMessages)

chrome.tabs.onActivated.addListener(handleTabActivation);
chrome.tabs.onUpdated.addListener(handleTabUpdate);


function handleMessages(data, details, sendResponse) {
  if (data.host)
    storeUtils.setHost(data.host);

  switch (data.action) {
    case globalActions.INIT:
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
      storeUtils.getAllData(({globalOptions, shortkeys}) => {
        const siteData = shortkeys[storeUtils.host];
        const sharedKeys = shortkeys[storeUtils.sharedShortkeysKey];

        sendResponse({siteData, globalOptions, sharedKeys});
      })
      return true;
    case globalActions.NEW_SHORTCUT:
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
        getActiveTabInfo((tabInfo = {}) => {
          updateExtStatusInTab(tabInfo.id, tabInfo.url)
        })
      })
      break;
    case globalActions.GLOBAL_OPTIONS_UPDATE:
      storeUtils.storeGlobalOptions(data.options, (globalOptions) => {
        messagingUtils.sendMessageToAllTabs({action: contentActions.OPTION_UPDATE, globalOptions});
        sendResponse(globalOptions)
        getActiveTabInfo((tabInfo = {}) => {
          updateExtStatusInTab(tabInfo.id, tabInfo.url)
        })
      })
      return true;
    case globalActions.GET_ALL_DATA:
      storeUtils.getAllData((res) => sendResponse(res))
      return true
    case globalActions.CLEAT_DATA:
      storeUtils.clearAllData(() => sendResponse())
      return true
    case globalActions.DELETE_SHORTKEY:
      storeUtils.removeShortkey(data.id, (res) => {
        sendResponse(res);
        messagingUtils.sendMessageToAllTabs({action: contentActions.SHORTCUTS_UPDATED});
      })
      return true
    case globalActions.DELETE_HOST:
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
  chrome.tabs.get(tabId, ({url} = {}) => {
    updateExtStatusInTab(tabId, url)
  })
}

function handleTabUpdate(tabId, {status}) {
  if (status === "complete")
    handleTabActivation({tabId})
}

function updateExtStatusInTab(tabId, url) {
  if (!tabId) return;

  const isAllowed = !!url && url.startsWith && url.startsWith("http");
  let iconPath = {
    "16": `icons/${isAllowed ? "" : "d_"}16x16.png`,
    "32": `icons/${isAllowed ? "" : "d_"}32x32.png`,
    "48": `icons/${isAllowed ? "" : "d_"}48x48.png`,
    "128": `icons/${isAllowed ? "" : "d_"}128x128.png`
  }

  if (isAllowed) {
    storeUtils.setHost(url)
    chrome.action.enable(tabId);
  } else {
    setTimeout(() => {
      chrome.action.disable(tabId);
    }, 10)
  }

  // update icon
  chrome.action.setIcon({tabId: tabId, path: iconPath});

  // reset badge
  chrome.action.setBadgeBackgroundColor({color: '#472590'});
  chrome.action.setBadgeText({text: ''});

  storeUtils.getAllData(({globalOptions = {}, shortkeys = []} = {}) => {
    const hostData = shortkeys[storeUtils.host] || {};
    const sharedKeys = shortkeys[storeUtils.sharedShortkeysKey] || [];
    const allKeys = [...sharedKeys, ...(hostData.shortkeys || [])]

    const isOff = (hostData.options && !!hostData.options.off) || !!globalOptions.off
    if (isOff) {
      chrome.action.setBadgeText({text: 'off'});
      chrome.action.setBadgeBackgroundColor({color: '#f14545'});

    } else {
      chrome.action.setBadgeText({text: isAllowed && allKeys.length ? allKeys.length.toString() : ''});
    }
  })
}

function getActiveTabInfo(cb) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const activeTab = tabs ? tabs[0] : {};
    cb && typeof cb === "function" && cb(activeTab)
  });
}
