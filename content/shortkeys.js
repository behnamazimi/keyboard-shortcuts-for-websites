// https://github.com/webextension-toolbox/webextension-toolbox

const TYPES = {
    click: 0,
    script: 1
}

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
                    case "class":
                        const classesStr = value.split(" ").map(c => "." + c).join("").trim();
                        const classes = value.split(" ").map(c => (c || '').trim());
                        complexQuery += `[class*="${classes[0]}"]`;
                        multiComplexQuery += `${classesStr}`;
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

            } else if (document.querySelectorAll(complexQuery).length === 1) {
                elm = document.querySelector(complexQuery)

            } else {
                elm = document.querySelector(multiComplexQuery)
            }
        }

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

        const validAttrs = ["id", "role", "tabindex", "type", "title", "class"]

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

        if (text) step.tx = text;

        step.i = findIndexAsChild(targetElm)

        const [id, simpleQuery, complexQuery, multiComplexQuery] = generateStepElmQuery(step)

        if (!id &&
            (!targetElm.isEqualNode(findTargetElm(step)) || (
                document.querySelectorAll(simpleQuery).length > 1 &&
                document.querySelectorAll(complexQuery).length > 1
            ))) {
            step.pr = createStep(targetElm.parentNode)
        }

        findTargetElm(step);
        return step;
    }

    function createNewShortcut({type, keys, title, target, stepCount, script} = {}) {
        const shortcut = {
            t: title,
            ty: type,
            i: `${new Date().getTime()}`,
            k: utils.generateKeysString(keys),
        }

        if (target !== null) {
            shortcut.tr = target
            shortcut.c = stepCount
        }

        if (script !== null)
            shortcut.sc = script

        return shortcut
    }

    return {
        generateKeysString,
        findTargetElm,
        createStep,
        createNewShortcut,
    }
})();

const shortkeys = (function () {

    let hostShortcuts = [];

    const onAddListeners = [];

    let inProgressShortkeyType = null;
    let inProgressShortkeyTitle = '';
    let inProgressLinkedTargets = null;
    let headStep = null;
    let momentStepsCount = 0;

    let targetScript = null;

    let listeningNewShortkey = false;

    let isWebApp = true;

    let options = {waitBetweenSteps: 1000, off: false, preventInInputs: false};

    let ui = {
        popupElm: null,
        popupElmStepsWrapper: null,
        popupElmKeysWrapper: null,
        preventPageReload: false,
    }

    let lastKeyEvent = null;

    let currentKeys = null;

    let lastDomClick = null

    function listen(type) {
        listeningNewShortkey = true;
        inProgressLinkedTargets = null;
        headStep = null;

        inProgressShortkeyType = type;

        if (type === TYPES.click) {
            showStepsPopup();
            preventLinksClick();
            document.addEventListener("mousedown", handleDocClick)
            document.addEventListener("click", handleDocClick)

        } else if (type === TYPES.script) {
            showScriptPopup();
        }

    }

    function abortAdding() {

        inProgressShortkeyType = null
        listeningNewShortkey = false;
        inProgressLinkedTargets = null;
        headStep = null;
        momentStepsCount = 0;
        targetScript = null

        releaseLinksClick();

        deactivateKeysDetectionMode(handleKeysDetection);

        if (ui.popupElm)
            ui.popupElm.remove();

    }

    function upHostShortcuts(shortcuts, globalOptions) {
        // update shortcuts list
        if (Array.isArray(shortcuts) && shortcuts.length > 0) {
            hostShortcuts = shortcuts;
        }

        // update global options
        if (globalOptions) options = {...options, ...globalOptions};

        console.log("init listeners...");
        window.removeEventListener("keydown", handleKeydown)
        window.addEventListener("keydown", handleKeydown)

        if (options.off) downHostShortcuts();
    }

    function downHostShortcuts() {
        console.log("down listeners...");
        window.removeEventListener("keydown", handleKeydown)
    }

    function addStep(targetElm) {

        const step = utils.createStep(targetElm)

        if (!headStep) {
            inProgressLinkedTargets = headStep = step;
        } else {
            headStep = headStep.nx = step;
        }

        momentStepsCount++;

        addStepToPopup(step);
    }

    function addShortcut(keys) {
        if (!keys) return;

        if (isKeysUsedBefore(keys)) {
            throw new Error("Key used before")
        }

        const data = {
            type: inProgressShortkeyType,
            keys,
            title: inProgressShortkeyTitle,
            target: inProgressLinkedTargets,
            stepCount: momentStepsCount,
            script: targetScript
        }

        if (listeningNewShortkey) {
            const newShortcut = utils.createNewShortcut(data);

            // push to shortcuts
            hostShortcuts.push(newShortcut);

            console.log("New shortcut added in tab local :)");
        }

        triggerOnAddEvent();
        abortAdding();
    }

    function activateKeysDetectionMode(cb) {
        // add listeners
        window.addEventListener("keydown", handleDetectionKeydown);
        window.addEventListener("keyup", handleDetectionKeyup.bind(this, cb))
    }

    function deactivateKeysDetectionMode(cb) {
        // remove listener
        window.removeEventListener("keydown", handleDetectionKeydown)
        window.removeEventListener("keyup", handleDetectionKeyup.bind(this, cb))
    }

    function addStepToPopup(step) {
        if (!ui.popupElmStepsWrapper) return;

        const createStepElm = (id, title, sub) => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="step">
                    <strong class="step-text" contenteditable="true" id="step-${id}">${title}</strong>
                    <span class="step-sub">${sub}</span>
                </div>`;

            return temp.content.firstElementChild;
        };

        const noStepElm = ui.popupElmStepsWrapper.querySelector(".no-step");
        if (noStepElm) noStepElm.remove();

        const stepElm = createStepElm(momentStepsCount, step.tx || "Unknown", `step ${momentStepsCount}`);
        const stepTitleElm = stepElm.querySelector(`#step-${momentStepsCount}`);

        if (stepTitleElm) {
            stepTitleElm.addEventListener("input", e => {
                step.tx = e.target.textContent
                    .replace(/[^a-zA-Z -_.]/g, "")
                    .substr(0, 15)
            })
        }

        ui.popupElmStepsWrapper.appendChild(stepElm)
    }

    function fireElementEvents(element, options = {}) {
        if (!element) {
            showToast(
                "Step calling failed because the element was not found.",
                "Maybe you are in wrong page.",
                true);
            return
        }

        if ((element.tagName === "A" || element.tagName === "BUTTON") && element.click) {
            element.click()
            return;
        }

        const eventOptions = {
            bubbles: true, view: window,
            ...options
        };

        const validEvents = ["mouseup", "mousedown", "click"];
        for (let event of validEvents) {
            const ev = new MouseEvent(event, eventOptions)
            element.dispatchEvent(ev)
        }

    }

    function callNextStep(current) {
        if (!current) return;

        const elm = utils.findTargetElm(current);

        fireElementEvents(elm, null, current);

        setTimeout(() => {
            callNextStep(current.nx)
        }, options.waitBetweenSteps || 500)
    }

    function addScriptToContent(script) {
        const srcElm = document.createElement("script");
        srcElm.setAttribute("type", "text/javascript")
        srcElm.innerHTML = script;
        document.body.appendChild(srcElm)
    }

    // BUILD IN UTILS
    function isKeysUsedBefore(keysObj) {
        if (!keysObj) return true;

        const keysStr = utils.generateKeysString(keysObj)
        return hostShortcuts.some(item => item.k === keysStr);
    }

    function preventLinksClick() {
        document.querySelectorAll("a")
            .forEach((aElm) => {
                aElm.addEventListener("click", handleLinkTagClick)
            })
    }

    function releaseLinksClick() {
        document.querySelectorAll("a")
            .forEach((aElm) => {
                aElm.removeEventListener("click", handleLinkTagClick)
            })
    }

    // EVENT HANDLERS
    function handleDocClick(e) {
        if (performance.now() - lastDomClick < 300) {
            e.preventDefault();
            return;
        }

        lastDomClick = performance.now();

        if (!e || !e.target || !listeningNewShortkey) return;

        if (e.path && e.path.some(elm => elm === ui.popupElm)) return;

        let target = e.target;

        if (e.path) {
            const buttonIndex = e.path.findIndex(pe => pe.tagName === "BUTTON")
            if (buttonIndex > -1) {
                target = e.path[buttonIndex];
            }

            const aIndex = e.path.findIndex(pe => pe.tagName === "A")
            if (aIndex > -1) {
                target = e.path[aIndex];
            }
        }

        shortkeys.addStep(target);
    }

    function handleLinkTagClick(e) {
        if (options.preventPageReload || !isWebApp) {
            e.preventDefault();
            return false
        }

        isWebApp = true;
    }

    function handleKeydown(e) {
        if (options.preventInInputs) {
            const tagName = e.path && e.path[0].tagName;
            if (tagName && ["input", "textarea"].includes(tagName.toLowerCase())) {
                return;
            }
        }

        for (let {k, tr: target, ty: type, sc: script} of hostShortcuts) {
            let keys = k.split(" + ");

            if (
                e.metaKey === (keys.includes("meta") || keys.includes("super") || keys.includes("window")) &&
                e.ctrlKey === keys.includes("ctrl") &&
                e.shiftKey === keys.includes("shift") &&
                e.altKey === keys.includes("alt") &&
                keys[keys.length - 1] === e.key.toLowerCase()
            ) {

                e.preventDefault();

                if (type === TYPES.click) {
                    callNextStep(target)
                } else if (type === TYPES.script) {
                    addScriptToContent(script);
                }

                // break loop when reached the target short-key
                break;
            }
        }
    }

    function handleDetectionKeydown(e) {
        e.preventDefault();
        lastKeyEvent = e;
    }

    function handleDetectionKeyup(cb, e) {
        e.preventDefault();

        if (!lastKeyEvent) return;

        const {ctrlKey, shiftKey, altKey, metaKey, key} = lastKeyEvent;

        let keys = {ctrlKey, shiftKey, altKey, metaKey, key: key.toLowerCase()}
        lastKeyEvent = null;

        if (cb && typeof cb === "function") {
            cb(keys)
        }
    }

    function handleKeysDetection(keys) {
        currentKeys = keys;

        ui.popupElmKeysWrapper.innerHTML = utils.generateKeysString(keys);
    }

    function onAdd(fn) {
        if (fn && typeof fn === "function")
            onAddListeners.push(fn)
    }

    function triggerOnAddEvent() {
        for (let fn of onAddListeners) {
            fn(hostShortcuts);
        }
    }

    // UI METHODS
    function showStepsPopup() {

        const createPopupElm = (shortkeyDefaultTitle = '') => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="issk issk-popup">
                    <div class="issk-container">
                        <strong class="label">Action Steps:</strong>
                        <div class="steps" id="shortcut-steps"><span class="no-step">Click on an action to add step</span></div>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Shortkey Title:</strong>
                        <input type="text" id="shortkey-title-input"
                            value="${shortkeyDefaultTitle}" maxlength="20"
                            placeholder="Shortcut Title *">
                    </div>
                    <div id="popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
                        <button id="open-keys-modal">Set Shortcut Keys</button>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        if (ui.popupElm) {
            ui.popupElm.remove();
        }

        inProgressShortkeyTitle = `Shortcut ${hostShortcuts.length + 1}`;
        ui.popupElm = createPopupElm(inProgressShortkeyTitle);
        ui.popupElmStepsWrapper = ui.popupElm.querySelector("#shortcut-steps");
        ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");

        const popupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
        const popupElmCancelBtn = ui.popupElm.querySelector("#shortcut-cancel-btn");
        const popupElmTitleInput = ui.popupElm.querySelector("#shortkey-title-input");

        const handleNameInputChange = e => {
            inProgressShortkeyTitle = e.target.value.replace(/[^a-zA-Z -_.]/g, "")
        }

        const handleAddBtnClick = (e) => {
            ui.popupElmMsg.innerText = ""
            if (!headStep) {
                ui.popupElmMsg.innerText = "No steps added."
                return;
            }

            if (!inProgressShortkeyTitle) {
                ui.popupElmMsg.innerText = "Enter shortkey title."
                return;
            }

            document.removeEventListener("mousedown", handleDocClick)
            document.removeEventListener("click", handleDocClick)
            showKeysInputPopup()

            // remove button listener
            popupElmKeysOpenBtn.removeEventListener("click", handleAddBtnClick)
        }

        popupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)
        popupElmCancelBtn.addEventListener("click", abortAdding)

        popupElmTitleInput.addEventListener("change", handleNameInputChange)

        document.body.appendChild(ui.popupElm)
    }

    function showScriptPopup() {

        const createPopupElm = (defaultTitle = '') => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="issk issk-popup">
                    <div class="issk-container">
                        <strong class="label">Script:</strong>
                        <textarea id="shortkey-script-input" rows="4"
                            placeholder="Script here *"></textarea>
                    </div>
                    <div class="issk-container">
                        <strong class="label">Shortkey Title:</strong>
                        <input type="text" id="shortkey-title-input"
                            value="${defaultTitle}" maxlength="20"
                            placeholder="Shortcut Title *">
                    </div>
                    <div id="popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
                        <button id="open-keys-modal">Set Shortcut Keys</button>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        if (ui.popupElm) {
            ui.popupElm.remove();
        }

        inProgressShortkeyTitle = `Shortcut ${hostShortcuts.length + 1}`;
        ui.popupElm = createPopupElm(inProgressShortkeyTitle);
        ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");
        const scriptTextarea = ui.popupElm.querySelector("#shortkey-script-input");

        const scriptPopupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
        const scriptPopupElmCancelBtn = ui.popupElm.querySelector("#shortcut-cancel-btn");
        const scriptPopupElmTitleInput = ui.popupElm.querySelector("#shortkey-title-input");

        const handleTextAreaChange = e => targetScript = e.target.value.trim();

        const handleNameInputChange = e => {
            inProgressShortkeyTitle = e.target.value.replace(/[^a-zA-Z -_.]/g, "")
        }

        const handleAddBtnClick = e => {
            ui.popupElmMsg.innerText = ""
            if (!targetScript) {
                ui.popupElmMsg.innerText = "Enter the script first."
                return;
            }

            if (!inProgressShortkeyTitle) {
                ui.popupElmMsg.innerText = "Enter shortkey title."
                return;
            }

            // remove button listener
            scriptTextarea.removeEventListener("change", handleTextAreaChange)
            scriptPopupElmKeysOpenBtn.removeEventListener("click", handleAddBtnClick)
            scriptPopupElmCancelBtn.removeEventListener("click", abortAdding)
            scriptPopupElmTitleInput.removeEventListener("change", handleNameInputChange)

            showKeysInputPopup()
        }

        scriptTextarea.addEventListener("change", handleTextAreaChange)
        scriptPopupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)
        scriptPopupElmCancelBtn.addEventListener("click", abortAdding)
        scriptPopupElmTitleInput.addEventListener("change", handleNameInputChange)

        document.body.appendChild(ui.popupElm)
    }

    function showKeysInputPopup() {
        const createKeysInputElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="issk issk-fixed-modal" tabindex="1">
                    <div class="issk-popup">
                        <div class="keys-container">
                            <strong class="label">Shortcut for above steps:</strong>
                            <pre class="keys-input" id="keys-pre">Press keys that you want...</pre>
                        </div>
                        <ul class="issk-popup-msg info">
                            <li><code>ctrl + t</code> and <code>ctrl + w</code> are reserved by your browser.</li>
                        </ul>
                        <div id="keys-popup-msg" class="issk-popup-msg"></div>
                        <div class="actions">
                            <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
                            <button id="shortcut-add-btn">Add</button>
                        </div>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        // close steps popup
        if (ui.popupElm) {
            ui.popupElm.remove();
        }

        ui.popupElm = createKeysInputElm();
        ui.popupElmKeysWrapper = ui.popupElm.querySelector("#keys-pre");

        const popupElmAddBtn = ui.popupElm.querySelector("#shortcut-add-btn");
        const popupElmCancelBtn = ui.popupElm.querySelector("#shortcut-cancel-btn");
        const popupElmMsg = ui.popupElm.querySelector("#keys-popup-msg");

        const handleAddBtnClick = () => {
            popupElmMsg.innerHTML = "";
            if (!currentKeys) {
                popupElmMsg.innerHTML = "Determine the shortcut first."
                return;
            }

            if (isKeysUsedBefore(currentKeys)) {
                popupElmMsg.innerHTML = "This shortkey used before."
                return;
            }

            addShortcut(currentKeys)

            // remove button listener
            popupElmAddBtn.removeEventListener("click", handleAddBtnClick)
        }

        popupElmAddBtn.addEventListener("click", handleAddBtnClick)
        popupElmCancelBtn.addEventListener("click", abortAdding)

        document.body.appendChild(ui.popupElm)
        ui.popupElm.focus();

        // detect shortcuts and set it
        activateKeysDetectionMode(handleKeysDetection);

    }

    function showToast(msg, pre, error = false) {

        const createToastElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="issk-toast">
                    <div class="issk-container">
                        <p class="issk-p">${msg}</p>
                        ${pre ? `<pre class="issk-pre">${pre}</pre>` : ''}
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        if (ui.successToastElm) {
            ui.successToastElm.remove();
        }

        ui.successToastElm = createToastElm();
        ui.successToastElm.classList.add("visible")
        if (error) ui.successToastElm.classList.add("error")

        document.body.appendChild(ui.successToastElm);

        setTimeout(() => {
            if (ui.successToastElm) {
                ui.successToastElm.classList.remove("visible")
                ui.successToastElm.remove();
            }

        }, 4000)
    }

    function showSuccessToast(keys) {
        showToast("New shortcut was added", keys)
    }


    return {
        listening: listeningNewShortkey,
        shortcuts: hostShortcuts,
        listen,
        addStep,
        upHostShortcuts,
        downHostShortcuts,
        onAdd,
        showSuccessToast,
    }
})();