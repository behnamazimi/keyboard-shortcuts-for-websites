'use strict';

const {sendGlobalMessage} = messagingUtils;

// init tab

chrome.runtime.onMessage.addListener(handleMessages)

initContent();

Shortcuts.onAdd((shortcuts) => {
  console.log(shortcuts);
  sendGlobalMessage({
    action: globalActions.NEW_SHORTCUT,
    host: location.origin,
    shortcuts,
  });
})

function handleMessages(data, details) {
  switch (data.action) {
    case globalActions.GLOBAL_OPTIONS_UPDATE:
    case contentActions.OPTION_UPDATE:
      const {globalOptions = {}, options = {}, shortcuts = []} = data;

      Shortcuts.upHostShortcuts(shortcuts, {...globalOptions, ...options})
      break;

    case contentActions.START_LISTENING:
      startListening(data.type);
      break;

    case contentActions.SHORTCUT_ADDED:
      Shortcuts.showSuccessToast(data.keys);
      break;

    case contentActions.SHORTCUTS_UPDATED:
      initContent()
      break;
  }
}

function initContent() {
  sendGlobalMessage({action: globalActions.INIT, host: location.origin}, (data = {}) => {
    const {siteData = {}, globalOptions = {}, sharedShortcuts = []} = data;

    if (globalOptions.off) return;

    const options = siteData && siteData.options ? siteData.options : {};

    const allKeys = [...(siteData.shortcuts || []), ...(sharedShortcuts || [])];
    Shortcuts.upHostShortcuts(allKeys, {...globalOptions, ...options})
  });
}

function startListening(type) {
  if (Shortcuts.listening) return;

  Shortcuts.listen(type);
}
