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
        let multiComplexQuery = `${parentQ} ${tag}`;

        if (attributes.id) {
            id = attributes.id;

            simpleQuery += `#${attributes.id}`;
            complexQuery += `#${attributes.id}`;
            multiComplexQuery += `#${attributes.id}`;

        } else {
            // add nth-child if index is bigger than 0
            if (tag && !!step.i) {
                simpleQuery += `:nth-child(${step.i})`
                complexQuery += `:nth-child(${step.i})`
                multiComplexQuery += `:nth-child(${step.i})`
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
        }

        simpleQuery = simpleQuery.replace(/\.\./, ".")
            .replace(/#:/g, "#\\:")
            .trim();
        complexQuery = complexQuery.replace(/\.\./, ".")
            .replace(/#:/g, "#\\:")
            .trim();
        multiComplexQuery = multiComplexQuery.replace(/\.\./, ".")
            .replace(/#:/g, "#\\:")
            .trim();

        return [id, simpleQuery, complexQuery, multiComplexQuery]
    }

    function findIndexAsChild(child) {
        if (!child || !child.parentNode) return null;

        const parent = child.parentNode;
        return Array.prototype.indexOf.call(parent.children, child) + 1;
    }

    function findTargetElm(step) {

        if (!step) return null;

        let elm;

        const [id, simpleQuery, complexQuery, multiComplexQuery] = generateStepElmQuery(step);

        if (id) elm = document.getElementById(id);

        if (!elm) {
            if (document.querySelectorAll(simpleQuery).length === 1) {
                elm = document.querySelector(simpleQuery)
                // console.log(log, "simpleQuery");

            } else if (document.querySelectorAll(complexQuery).length === 1) {
                elm = document.querySelector(complexQuery)
                // console.log(log, "complexQuery");

            } else if (document.querySelectorAll(multiComplexQuery).length === 1) {
                elm = document.querySelector(multiComplexQuery)
                // console.log(log, "multiComplexQuery");
            }
        }

        // if (!elm) console.log({id, simpleQuery, complexQuery, multiComplexQuery})
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
        if (!!rawAttrsLen) step.a = {};

        for (let i = 0; i < rawAttrsLen; i++) {
            const attrName = rawAttrs[i].nodeName;
            if (!validAttrs.includes(attrName)) continue;

            step.a[attrName] = (targetElm.getAttribute(attrName) || '').trim()
        }

        step.tg = targetElm.tagName.toLowerCase();
        const text = (targetElm.textContent || '')
            .replace(/(\r\n|\n|\r)/gm, "")
            .trim()
            .substr(0, 20);

        if (text) {
            step.tx = text;
        }

        step.i = findIndexAsChild(targetElm)

        const [id, simpleQuery, complexQuery, multiComplexQuery] = generateStepElmQuery(step)

        if (!id) {
            if (!targetElm.isEqualNode(findTargetElm(step))) {
                step.pr = createStep(targetElm.parentNode)
            }
        }

        return step;
    }

    function createNewShortkey({type, keys, title, target, stepCount, script, waiting, shared} = {}) {
        const shortkey = {
            i: `${new Date().getTime()}`,
            t: title,
            ty: type,
            k: keys,
            sh: !!shared,
        }

        if (waiting) shortkey.w = waiting;

        if (target !== null) {
            shortkey.tr = target
            shortkey.c = stepCount
        }

        if (script !== null)
            shortkey.sc = script

        return shortkey
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
        link.download = `in-site-shortkeys.issk`
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
        createNewShortkey,
        parseArrayOfKeys,
        isValidJsonString,
        createDownloadLink,
        copyToClipboard,
        getOriginOfURL,
    }
})();

const uiUtils = (function () {

    function createStepsPopupElm(shortkeyDefaultTitle = '') {
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
                        <div class="steps" id="shortkey-steps"><span class="no-step">Click on an action to add step</span></div>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Title:</strong>
                        <input type="text" id="shortkey-title-input"
                            value="${shortkeyDefaultTitle}" maxlength="20"
                            placeholder="Title *">
                    </div>
                    <div class="issk-container">
                        <strong class="label">Waiting Time Between Steps (sec):</strong>
                        <input type="number" id="waiting-input"
                            value="0" max="10" min="0" step="0.1"
                            placeholder="Waiting time (optional)">
                    </div>
                    <div id="popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortkey-cancel-btn" class="cancel">Cancel</button>
                        <button id="open-keys-modal">Set Shortkey Keys</button>
                    </div>
                </div>`;

        return temp.content.firstElementChild;
    }

    function createScriptPopupElm(defaultTitle = '') {
        let temp = document.createElement("template");
        temp.innerHTML = `
            <div class="issk issk-popup">
                    <div class="issk-container">
                        <strong class="label">Script:</strong>
                        <textarea id="shortkey-script-input" rows="4"
                            placeholder="Script here *"></textarea>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Title:</strong>
                        <input type="text" id="shortkey-title-input"
                            value="${defaultTitle}" maxlength="20"
                            placeholder="Title *">
                    </div>
                    <div class="issk-container">
                        <div class="custom-switch small">
                            <input type="checkbox" id="shared-shortkey-switch">
                            <label for="shared-shortkey-switch"><span>Share with all sites</span></label>
                        </div>
                        <small>If save as shared shortkeys it will be accessible from all sites.</small>
                    </div>
                    <div id="popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortkey-cancel-btn" class="cancel">Cancel</button>
                        <button id="open-keys-modal">Set Shortkey Keys</button>
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
                        <strong class="label">Shortkey for above steps:</strong>
                        <pre class="keys-input" id="keys-pre">Press keys that you want...</pre>
                    </div>
                    <div class="issk-popup-msg info">
                        Browser-reserved shortkeys cannot be overridden.
                    </div>
                    <div id="keys-popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortkey-cancel-btn" class="cancel">Cancel</button>
                        <button id="shortkey-add-btn">Add</button>
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
        createScriptPopupElm,
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
        let {globalOptions, shortkeys} = data || {};

        storeGlobalOptions(globalOptions, () => {
            const shortkeysEntry = Object.entries(shortkeys)
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

    function getHostShortkeys(cb) {
        loadHostData((siteData = {}) => {
            const shortkeys = siteData.shortkeys || [];
            // do nothing if shortkeys is not an array
            if (!Array.isArray(shortkeys)) return;

            if (cb && typeof cb === "function") cb(shortkeys)
        });
    }

    function removeShortkey(id, cb) {
        if (!id) return;

        loadHostData((hostData = {}) => {
            const newSkList = (hostData.shortkeys || []).filter(sk => sk.i !== id);
            const updatedData = {...hostData, shortkeys: newSkList}

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

    function loadSharedShortkeys(cb) {
        const key = getSharedShortkeysKey();

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

    function storeNewShortkey(shortkey) {
        const isGlobal = !!shortkey.sh;
        if (isGlobal) {
            // save as shared shortkey
            loadSharedShortkeys(sharedShortkeys => {
                const key = getSharedShortkeysKey();
                const updatedShortkeys = [...(sharedShortkeys || []), shortkey]
                storeData(key, updatedShortkeys, function () {
                    messagingUtils.sendMessageToAllTabs({
                        action: contentActions.SHORTCUT_ADDED,
                        keys: shortkey.k
                    })
                });
            })

        } else {
            // save as host shortkey
            loadHostData((siteData = {}) => {

                const updatedData = {...siteData, shortkeys: [...(siteData.shortkeys || []), shortkey]}
                const key = getHost();
                storeData(key, updatedData, function () {
                    messagingUtils.sendMessageToCurrentTab({
                        action: contentActions.SHORTCUT_ADDED,
                        keys: shortkey.k
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

                const shortkeys = data;
                delete shortkeys[getGlobalOptionsKey()]

                cb({globalOptions, shortkeys})
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

    function getSharedShortkeysKey() {
        return "shared-shortkeys";
    }

    function getHost() {
        return host;
    }

    return {
        parseAndSaveImportJson,
        removeShortkey,
        removeHost,
        loadHostData,
        storeGlobalOptions,
        loadGlobalOptions,
        storeHostOption,
        storeNewShortkey,
        getAllData,
        clearAllData,
        setHost,
        getHost,
        get host() {
            return getHost()
        },
        get sharedShortkeysKey() {
            return getSharedShortkeysKey()
        },
    }
})();



