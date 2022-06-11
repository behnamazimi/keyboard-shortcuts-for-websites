'use strict';

const utils = (function () {

  function generateKeysString(keys) {
    if (!keys) return "";

    return Object.entries(keys).reduce((res, b) => {
      if (!!b[1]) {
        // remove Key from end of keys like ctrlKey, altKey, shiftKey, etc
        let key = b[0].replace("Key", "");

        res.push(key === "key" ? keys[b[0]] : key)
      }

      return res
    }, []).join(" + ")
  }

  function generateStepElmQuery(step) {
    const tag = step.tg || '';
    const attributes = step.a || '';
    const parent = step.pr;

    let parentQ = '';
    if (parent) {
      // always use simple query as parents
      const [_pId, _pSimple] = generateStepElmQuery(parent);
      parentQ = _pId ? `#${_pId}` : _pSimple;

      if (parentQ) parentQ += " >"
    }

    let id = null;
    let simpleQuery = `${parentQ} ${tag}`;
    let complexQuery = `${parentQ} ${tag}`;

    if (attributes.id) {
      id = attributes.id;

      simpleQuery += `#${attributes.id}`;
      complexQuery += `#${attributes.id}`;
    }

    // add nth-child if index is bigger than 0
    if (tag && !!step.i) {
      simpleQuery += `:nth-child(${step.i})`
      complexQuery += `:nth-child(${step.i})`
    }

    for (let [attr, value] of Object.entries(attributes)) {
      switch (attr) {
        case "id":
          break;
        default:
          complexQuery += `[${attr}="${value}"]`;
          break;
      }
    }

    simpleQuery = simpleQuery.replace(/\.\./, ".")
      .replace(/#:/g, "#\\:")
      .trim();
    complexQuery = complexQuery.replace(/\.\./, ".")
      .replace(/#:/g, "#\\:")
      .trim();

    return [id, simpleQuery, complexQuery]
  }

  function findIndexAsChild(child) {
    if (!child || !child.parentNode) return null;

    const parent = child.parentNode;
    return Array.prototype.indexOf.call(parent.children, child) + 1;
  }

  function findTargetElm(step) {

    if (!step) return null;

    let elm;

    const [id, simpleQuery, complexQuery] = generateStepElmQuery(step);

    if (id && document.querySelectorAll(`#${id}`).length === 1) {
      elm = document.getElementById(id);
    }

    if (!elm) {
      if (document.querySelectorAll(simpleQuery).length === 1) {
        elm = document.querySelector(simpleQuery)
        // console.log(log, "simpleQuery");

      } else if (document.querySelectorAll(complexQuery).length === 1) {
        elm = document.querySelector(complexQuery)
        // console.log(log, "complexQuery");

      }
    }

    if (!elm) console.log("Element not found!", {id, simpleQuery, complexQuery})
    return elm
  }

  /**
   * create new step object
   * @param targetElm
   * @returns {object}
   */
  function createStep(targetElm) {
    const step = {}

    if (!targetElm || targetElm.nodeName === "#document") return step;

    const validAttrs = ["id", "role", "type", "title"]

    const rawAttrs = targetElm.attributes || [];
    const rawAttrsLen = rawAttrs.length;

    // set attribute (a) property
    if (!!rawAttrsLen) {
      step.a = {};
      for (let i = 0; i < rawAttrsLen; i++) {
        const attrName = rawAttrs[i].nodeName;
        if (!validAttrs.includes(attrName)) continue;

        step.a[attrName] = (targetElm.getAttribute(attrName) || '').trim()
      }
    }

    step.tg = targetElm.tagName.toLowerCase();
    const text = (targetElm.textContent || '')
      .replace(/(\r\n|\n|\r)/gm, "")
      .trim()
      .substr(0, 20);

    if (text) {
      step.tx = text;
    }

    if (step.tg === "input") {
      const inputText = targetElm.getAttribute("title")
        || targetElm.getAttribute("name")
        || targetElm.getAttribute("placeholder")
      if (inputText)
        step.tx = inputText;
    }

    step.i = findIndexAsChild(targetElm)

    const [id, _, complexQuery] = generateStepElmQuery(step)

    const hasUniqueId = id && document.querySelectorAll(`#${id}`).length === 1;
    const hasUniqueComplexQ = document.querySelectorAll(complexQuery).length === 1;
    const isEqualNode = targetElm.isEqualNode(findTargetElm(step));

    const needParentStep = (!hasUniqueId && !hasUniqueComplexQ) || !isEqualNode;

    if (needParentStep) {
      step.pr = createStep(targetElm.parentNode)
    }

    return step;
  }

  function createNewShortcut({type, keys, title, target, stepCount, script, waiting, shared, preventOnInput} = {}) {
    const shortcut = {
      i: `${new Date().getTime()}`,
      t: title,
      ty: type,
      k: keys,
      sh: !!shared,
    }

    if (preventOnInput) shortcut.pi = preventOnInput

    if (waiting) shortcut.w = waiting;

    if (target !== null) {
      shortcut.tr = target
      shortcut.c = stepCount
    }

    if (script !== null)
      shortcut.sc = script

    return shortcut
  }

  function parseArrayOfKeys(keysArr) {
    let keys = {
      ctrlKey: keysArr.includes("Control"),
      shiftKey: keysArr.includes("Shift"),
      altKey: keysArr.includes("Alt"),
      metaKey: keysArr.includes("Meta"),
      key: keysArr
        .filter(k => !["Control", "Shift", "Alt", "Meta"].includes(k))
        .map(k => k && k.toLowerCase())
        .join(" + ").trim(),
    }

    return generateKeysString(keys)
  }

  function isValidJsonString(str) {
    try {
      JSON.parse(str)
      return true;
    } catch (e) {
      return false
    }
  }

  function createDownloadLink(text) {
    let link = document.createElement('a');
    link.target = "_blank"
    link.download = `in-site-shortcuts.issk`
    let blob = new Blob([text], {type: 'application/json'});
    link.href = window.URL.createObjectURL(blob);
    link.click()
    link.remove()
  }

  function copyToClipboard(str) {
    try {
      if (!str) return false

      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);

      return true
    } catch (e) {
      return false
    }
  }

  function getOriginOfURL(url) {
    if (!url) return null;

    const uO = new URL(url)
    return uO.origin.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
  }

  return {
    findTargetElm,
    createStep,
    createNewShortcut,
    parseArrayOfKeys,
    isValidJsonString,
    createDownloadLink,
    copyToClipboard,
    getOriginOfURL,
  }
})();

const uiUtils = (function () {

  function createStepsPopupElm(shortkeyDefaultTitle = '', defaultWaiting = 0) {
    let temp = document.createElement("template");
    temp.innerHTML = `
                <div class="issk issk-popup">
                    <div class="issk-container popup-move" id="popup-move">
                        <button data-pos="left">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                        <button data-pos="bottom">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <polyline points="19 12 12 19 5 12"></polyline>
                            </svg>
                        </button>
                        <button data-pos="top">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5"></line>
                                <polyline points="5 12 12 5 19 12"></polyline>
                            </svg>
                        </button>
                        <button data-pos="right">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Action Steps:</strong>
                        <div class="steps" id="shortcut-steps"><span class="no-step">Click on an action to add step</span></div>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Title:</strong>
                        <input type="text" id="shortcut-title-input"
                            value="${shortkeyDefaultTitle}" maxlength="20"
                            placeholder="Title *">
                    </div>
                    <div class="issk-container">
                        <strong class="label">Waiting Time Between Steps (sec):</strong>
                        <input type="number" id="waiting-input"
                            value="${defaultWaiting}" max="10" min="0" step="0.1"
                            placeholder="Waiting time (optional)">
                    </div>
                    <div id="popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
                        <button id="open-keys-modal">Set Keys</button>
                    </div>
                </div>`;

    return temp.content.firstElementChild;
  }

  function createKeysDefinePopupElm() {
    let temp = document.createElement("template");
    temp.innerHTML = `
            <div class="issk issk-fixed-modal" tabindex="1">
                <div class="issk-popup">
                    <div class="keys-container">
                        <strong class="label">Shortcut for above steps:</strong>
                        <pre class="keys-input" id="keys-pre">Press keys that you want...</pre>
                    </div>
                    <div class="issk-popup-msg info">
                        Browser-reserved shortcuts cannot be overridden.
                    </div>
                    <div id="keys-popup-msg" class="issk-popup-msg"></div>
                    <div class="issk-container">
                      <br>
                      <div class="custom-switch small">
                          <input type="checkbox" id="prevent-on-input">
                          <label for="prevent-on-input"><span>Prevent when focused on an input</span></label>
                      </div>
                    </div>
                    <div class="actions">
                        <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
                        <button id="shortcut-add-btn">Add</button>
                    </div>
                </div>
            </div>`;

    return temp.content.firstElementChild;
  }

  function createToastElm(msg, pre) {
    let temp = document.createElement("template");
    temp.innerHTML = `
            <div class="issk-toast">
                <div class="issk-container">
                    <p class="issk-p">${msg}</p>
                    ${pre ? `<pre class="issk-pre">${pre}</pre>` : ''}
                </div>
            </div>`;

    return temp.content.firstElementChild;
  }

  return {
    createStepsPopupElm,
    createKeysDefinePopupElm,
    createToastElm,
  }
})();

const messagingUtils = (function () {

  function sendMessageToCurrentTab(body) {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
      if (tabs && tabs[0])
        chrome.tabs.sendMessage(tabs[0].id, body);
    });
  }

  function sendMessageToAllTabs(body) {
    chrome.tabs.query({}, function (tabs) {
      for (let i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, body);
      }
    });
  }

  function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
  }

  return {
    sendMessageToCurrentTab,
    sendMessageToAllTabs,
    sendGlobalMessage,
  }
})();

const storeUtils = (function () {

  let host = null;

  function parseAndSaveImportJson(str, cb) {

    if (!utils.isValidJsonString(str)) {
      if (cb && typeof cb === "function") cb(false)
      return;
    }

    const data = JSON.parse(str);
    let {globalOptions, shortcuts} = data || {};

    storeGlobalOptions(globalOptions, () => {
      const shortkeysEntry = Object.entries(shortcuts)
      let counter = 0;
      for (let [host, hostData] of shortkeysEntry) {
        storeData(host, hostData, () => {
          counter++;
          if (counter === shortkeysEntry.length) {
            if (cb && typeof cb === "function") cb(true)
          }
        });
      }
    })
  }

  function getHostShortcuts(cb) {
    loadHostData((siteData = {}) => {
      const shortcuts = siteData.shortcuts || [];
      // do nothing if shortcuts is not an array
      if (!Array.isArray(shortcuts)) return;

      if (cb && typeof cb === "function") cb(shortcuts)
    });
  }

  function removeShortcut(id, cb) {
    if (!id) return;

    loadHostData((hostData = {}) => {
      const newSkList = (hostData.shortcuts || []).filter(sk => sk.i !== id);
      const updatedData = {...hostData, shortcuts: newSkList}

      const key = getHost();
      storeData(key, updatedData, function () {
        if (newSkList.length === 0 && !updatedData.globalOptions) {
          removeHost(() => {
            if (cb && typeof cb === "function")
              cb(false)
          })
        } else {
          if (cb && typeof cb === "function")
            cb(updatedData)
        }
      });
    })
  }

  function removeHost(cb) {
    removeData(host, function (data) {
      if (cb && typeof cb === "function")
        cb(true)
    });
  }

  function loadHostData(cb) {
    if (!host) return;

    const key = getHost();

    chrome.storage.sync.get([key], function (data) {
      if (cb && typeof cb === "function")
        cb(data[key])
    });
  }

  function loadSharedShortcuts(cb) {
    const key = getSharedShortcutsKey();

    chrome.storage.sync.get([key], function (data) {
      if (cb && typeof cb === "function")
        cb(data[key])
    });
  }

  function storeGlobalOptions(options = {}, cb) {
    loadGlobalOptions((data) => {
      const key = getGlobalOptionsKey();
      const updatedData = {...data, ...options}
      storeData(key, updatedData, function () {
        if (cb && typeof cb === "function") cb(updatedData)
      });
    });
  }

  function loadGlobalOptions(cb) {
    const key = getGlobalOptionsKey();
    loadData(key, (data) => {
      if (cb && typeof cb === "function") cb(data)
    });
  }

  function storeHostOption(options = {}, cb) {
    loadHostData((siteData = {}) => {

      const updatedData = {...siteData, options}
      const key = getHost();
      storeData(key, updatedData, function () {
        if (cb && typeof cb === "function") cb(updatedData)
      });
    });
  }

  function storeNewShortcut(shortcut) {
    const isGlobal = !!shortcut.sh;
    if (isGlobal) {
      // save as shared shortcut
      loadSharedShortcuts(sharedShortcuts => {
        const key = getSharedShortcutsKey();
        const updatedShortcuts = [...(sharedShortcuts || []), shortcut]
        storeData(key, updatedShortcuts, function () {
          messagingUtils.sendMessageToAllTabs({
            action: contentActions.SHORTCUT_ADDED,
            keys: shortcut.k
          })
        });
      })

    } else {
      // save as host shortcut
      loadHostData((siteData = {}) => {

        const updatedData = {...siteData, shortcuts: [...(siteData.shortcuts || []), shortcut]}
        const key = getHost();
        storeData(key, updatedData, function () {
          messagingUtils.sendMessageToCurrentTab({
            action: contentActions.SHORTCUT_ADDED,
            keys: shortcut.k
          })
        });
      });
    }
  }

  function storeData(key, data, cb) {
    chrome.storage.sync.set({[key]: data}, function () {
      if (cb && typeof cb === "function") cb(data)
    });
  }

  function loadData(key, cb) {
    chrome.storage.sync.get([key], function (data) {
      if (cb && typeof cb === "function")
        cb(data[key])
    });
  }

  function getAllData(cb) {
    chrome.storage.sync.get(null, function (data) {
      if (cb && typeof cb === "function" && data) {
        const globalOptions = data.globalOptions;

        const shortcuts = data;
        delete shortcuts[getGlobalOptionsKey()]

        cb({globalOptions, shortcuts})
      }
    });
  }

  function removeData(key, cb) {
    chrome.storage.sync.remove([key], function (data) {
      if (cb && typeof cb === "function")
        cb(true)
    });
  }

  function clearAllData(cb) {
    chrome.storage.sync.clear(function () {
      if (cb && typeof cb === "function")
        cb()
    });
  }

  function setHost(url) {
    if (!url) return;

    if (url.indexOf("http") > -1) {
      host = utils.getOriginOfURL(url)
    } else {
      host = url
    }

    return host;
  }

  function getGlobalOptionsKey() {
    return "globalOptions";
  }

  function getSharedShortcutsKey() {
    return "shared-shortcuts";
  }

  function getHost() {
    return host;
  }

  return {
    parseAndSaveImportJson,
    removeShortcut,
    removeHost,
    loadHostData,
    storeGlobalOptions,
    loadGlobalOptions,
    storeHostOption,
    storeNewShortcut,
    getAllData,
    clearAllData,
    setHost,
    get host() {
      return getHost()
    },
    get sharedShortcutsKey() {
      return getSharedShortcutsKey()
    },
  }
})();



