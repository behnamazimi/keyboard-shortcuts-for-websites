// https://github.com/webextension-toolbox/webextension-toolbox
const webShortcut = (function () {

    let hostShortcuts = [];

    const onAddListeners = [];

    let currentLinkedTargets = null;
    let headStep = null;

    let listeningToStep = false;

    let ui = {
        stepsPopupElm: null,
        stepsPopupElmStepsWrapper: null,
        keysPopupElmKeysWrapper: null,
    }

    let lastKeyEvent = null;

    let currentKeys = null;

    function listen() {
        listeningToStep = true;
        currentLinkedTargets = null;
        headStep = null;

        showStepsPopup();
    }

    function upHostShortcuts(shortcuts) {
        if (!Array.isArray(shortcuts)) return;

        hostShortcuts = shortcuts;
        prepareShortcutsListeners();
    }

    function generateStepElmQuery(step) {
        const tag = step.tag || '';
        const attributes = step.attributes || '';
        const parent = step.parent;

        let parentQ = '';
        if (parent) parentQ = generateStepElmQuery(parent)

        let q = `${parentQ} ${tag}`;
        if (attributes.id) {
            q += `#${attributes.id}`;

        } else {
            for (let [attr, value] of Object.entries(attributes)) {
                switch (attr) {
                    case "id":
                        q += `#${value}`;
                        break;
                    case "class":
                        const classes = value.split(" ").map(c => "." + c).join("").trim();
                        q += `${classes}`;
                        break;
                    default:
                        q += `[${attr}="${value}"]`;
                        break;
                }
            }
        }

        return q.replace(/\.\./, ".").trim();
    }

    function findTargetElm(step) {
        if (!step) return null;

        const elmQuery = generateStepElmQuery(step)
        console.log(elmQuery);
        return document.querySelector(elmQuery)
    }

    function createStep(targetElm) {
        const step = {
            uid: new Date().getTime(),
            attributes: {},
            tag: null,
            text: null,
            parent: null
        }

        if (!targetElm) return step;

        const validAttrs = ["id", "class", "role", "tabIndex", "type"]

        const rawAttrs = targetElm.attributes;
        const rawAttrsLen = targetElm.attributes.length;

        for (let i = 0; i < rawAttrsLen; i++) {
            const attrName = rawAttrs[i].nodeName;
            if (!validAttrs.includes(attrName)) continue;

            step.attributes[attrName] = targetElm.getAttribute(attrName)
        }

        step.tag = targetElm.tagName.toLowerCase();
        step.text = (targetElm.textContent || '').substr(0, 15) || step.tag;

        if (!targetElm.isEqualNode(findTargetElm(step))) {
            step.parent = createStep(targetElm.parentNode)
        }

        return step;
    }

    function fireEvent(event, element, options = {}) {
        if (!element) {
            console.log("Element not found!");
            return
        }

        if (element[event] && typeof element[event] === "function") {
            element[event]();

        } else {
            const ev = new Event(event, {bubbles: true, ...options})
            element.dispatchEvent(ev)
        }
    }

    function generateKeysUID(keys) {
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

    function createNewShortcut(target, keys) {
        return {
            id: `sc-${new Date().getTime()}`,
            keys,
            keysUID: generateKeysUID(keys),
            target
        };
    }

    function addStep(e) {
        if (!e || !e.target || !listeningToStep) return;

        if (e.path && e.path.some(elm => elm === ui.stepsPopupElm)) return;

        const step = createStep(e.target)

        if (!headStep) {
            currentLinkedTargets = headStep = step;
        } else {
            headStep = headStep.nextStep = step;
        }

        addStepToPopup(step);
    }

    function handleKeydown(e) {
        for (let {keys, target} of hostShortcuts) {

            if (
                e.ctrlKey === keys.ctrlKey &&
                e.shiftKey === keys.shiftKey &&
                e.altKey === keys.altKey &&
                e.key.toLowerCase() === keys.key.toLowerCase()
            ) {

                e.preventDefault();

                let curTarget = target;
                do {
                    const elm = findTargetElm(curTarget)
                    fireEvent("click", elm)

                    curTarget = curTarget.nextStep;
                } while (curTarget && curTarget.uid);

                break;
            }
        }
    }

    function prepareShortcutsListeners() {
        console.log("listeners init...");
        window.removeEventListener("keydown", handleKeydown.bind(this))
        window.addEventListener("keydown", handleKeydown.bind(this))
    }

    function isKeysUsedBefore(keys) {
        if (!keys) return true;

        const keysUID = generateKeysUID(keys)

        return hostShortcuts.some(item => item.keysUID === keysUID);
    }

    function addShortcut(keys) {
        if (!keys) return;

        if (currentLinkedTargets && listeningToStep) {

            if (isKeysUsedBefore(keys)) {
                throw new Error("Key used before")
            }

            const newShortcut = createNewShortcut(currentLinkedTargets, keys);

            // push to shortcuts
            hostShortcuts.push(newShortcut);

            console.log("New shortcut added in tab local :)");
        }

        listeningToStep = false;
        currentLinkedTargets = null;
        headStep = null;

        keysDetection(false);
        if (ui.stepsPopupElm)
            ui.stepsPopupElm.remove();

        if (ui.keysPopupElm)
            ui.keysPopupElm.remove();

        triggerOnAddEvent();
    }

    const handleDetectionKeydown = e => {
        e.preventDefault();
        lastKeyEvent = e;
    };

    const handleDetectionKeyup = (cb, e) => {
        e.preventDefault();

        if (!lastKeyEvent) return;

        const {ctrlKey, shiftKey, altKey, key} = lastKeyEvent;

        let keys = {ctrlKey, shiftKey, altKey, key: key.toLowerCase()}
        lastKeyEvent = null;

        if (cb && typeof cb === "function") {
            cb(keys)
        }
    }

    function keysDetection(cb) {

        if (cb && typeof cb === "function") {
            window.addEventListener("keydown", handleDetectionKeydown);
            window.addEventListener("keyup", handleDetectionKeyup.bind(this, cb))
        } else {
            // remove listener
            window.removeEventListener("keydown", handleDetectionKeydown)
            window.removeEventListener("keyup", handleDetectionKeyup.bind(this, cb))
        }
    }

    function showStepsPopup() {

        const createPopupElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="web-shortcut-popup">
                    <div class="steps-container">
                        <strong class="label">Action Steps:</strong>
                        <div class="steps" id="shortcut-steps"><span class="no-step">Click where you want</span></div>
                    </div>
                    <div class="actions">
                        <button id="open-keys-modal">Set Shortcut Keys</button>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        if (ui.stepsPopupElm) {
            ui.stepsPopupElm.remove();
        }

        ui.stepsPopupElm = createPopupElm();
        ui.stepsPopupElmStepsWrapper = ui.stepsPopupElm.querySelector("#shortcut-steps");

        const stepsPopupElmKeysOpenBtn = ui.stepsPopupElm.querySelector("#open-keys-modal");

        const handleAddBtnClick = (e) => {
            console.log(e);
            showKeysInputPopup()

            // remove button listener
            stepsPopupElmKeysOpenBtn.removeEventListener("click", handleAddBtnClick)
        }

        stepsPopupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)

        document.body.appendChild(ui.stepsPopupElm)
    }

    function showKeysInputPopup() {
        const createKeysInputElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="web-shortcut-fixed-modal">
                    <div class="web-shortcut-popup">
                        <div class="keys-container">
                            <strong class="label">Shortcut for above steps:</strong>
                            <pre class="keys-input" id="keys-pre">Press keys that you want...</pre>
                        </div>
                        <div id="shortcut-popup-msg"></div>
                        <div class="actions">
                            <button id="shortcut-add-btn">Add</button>
                        </div>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        // close steps popup
        if (ui.stepsPopupElm) {
            ui.stepsPopupElm.remove();
        }

        if (ui.keysPopupElm) {
            ui.keysPopupElm.remove();
        }

        ui.keysPopupElm = createKeysInputElm();
        ui.keysPopupElmKeysWrapper = ui.keysPopupElm.querySelector("#keys-pre");

        const keysPopupElmAddBtn = ui.keysPopupElm.querySelector("#shortcut-add-btn");
        const keysPopupElmMsg = ui.keysPopupElm.querySelector("#shortcut-popup-msg");

        const handleAddBtnClick = (e) => {
            keysPopupElmMsg.innerHTML = "";
            if (!currentKeys) {
                keysPopupElmMsg.innerHTML = "Determine the shortcut first."
                return;
            }

            addShortcut(currentKeys)

            // remove button listener
            keysPopupElmAddBtn.removeEventListener("click", handleAddBtnClick)
        }

        keysPopupElmAddBtn.addEventListener("click", handleAddBtnClick)

        document.body.appendChild(ui.keysPopupElm)

        // detect shortcuts and set it
        keysDetection((keys) => {
            currentKeys = keys;

            ui.keysPopupElmKeysWrapper.innerHTML = generateKeysUID(keys);
        });

    }

    function addStepToPopup(step) {
        if (!ui.stepsPopupElmStepsWrapper) return;

        const createStepElm = (title, event) => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="step">
                    <strong class="step-text">${title}</strong>
                    <span class="step-event">${event}</span>
                </div>`;

            return temp.content.firstElementChild;
        };

        const noStepElm = ui.stepsPopupElmStepsWrapper.querySelector(".no-step");
        if (noStepElm) noStepElm.remove();

        ui.stepsPopupElmStepsWrapper.appendChild(createStepElm(step.text, step.tag))

    }

    function showSuccessToast(keys) {

        const createToastElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="web-shortcut-toast">
                    <div class="container">
                        <p>New shortcut was added.</p>
                        <pre>${keys || 'Unknown Keys'}</pre>
                    </div>
                </div>`;

            return temp.content.firstElementChild;
        };

        if (ui.successToastElm) {
            ui.successToastElm.remove();
        }

        ui.successToastElm = createToastElm();

        document.body.appendChild(ui.successToastElm);

        setTimeout(() => {
            if (ui.successToastElm)
                ui.successToastElm.remove();

        }, 3000)
    }

    function onAdd(fn) {
        if (fn && typeof fn === "function")
            onAddListeners.push(fn)
    }

    function triggerOnAddEvent() {
        for (let fn of onAddListeners) {
            fn(shortcuts);
        }
    }

    return {
        shortcuts: hostShortcuts,
        upHostShortcuts,
        listen,
        addStep,
        onAdd,
        showSuccessToast,
    }
})();