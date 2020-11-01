// https://github.com/webextension-toolbox/webextension-toolbox

const ShortKeys = (function () {

    let hostShortkeys = [];

    const onAddListeners = [];

    let listeningNewShortkey = false;
    let inProgressShortkey = {
        title: null,
        type: null,
        waiting: null,
        headStep: null,
        linkedSteps: null,
        stepsCount: 0,
        script: null,
        pressedKeys: [],
        keys: null,
        shared: false,
    };

    let isWebApp = true;

    let options = {waitBetweenSteps: 1000, off: false, preventInInputs: false};

    let ui = {
        popupElm: null,
        popupElmStepsWrapper: null,
        popupElmKeysWrapper: null,
        preventPageReload: false,
    }

    let lastDomClick = null
    let cachedKeys = []

    function listen(type) {
        listeningNewShortkey = true;
        inProgressShortkey.linkedSteps = null;
        inProgressShortkey.headStep = null;

        inProgressShortkey.type = type;

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

        inProgressShortkey = {
            title: null,
            type: null,
            waiting: null,
            headStep: null,
            linkedSteps: null,
            stepsCount: 0,
            script: null,
            pressedKeys: [],
            shared: false,
        };

        listeningNewShortkey = false;

        releaseLinksClick();

        deactivateKeysDetectionMode(handleKeysDetection);

        if (ui.popupElm) ui.popupElm.remove();
    }

    function upHostShortkeys(shortkeys, globalOptions) {
        // update shortkeys list
        if (Array.isArray(shortkeys) && shortkeys.length > 0) {
            hostShortkeys = shortkeys;
        }

        // update global options
        if (globalOptions) options = {...options, ...globalOptions};

        console.log("init listeners...");
        window.removeEventListener("keydown", handleKeydown)
        window.addEventListener("keydown", handleKeydown)

        window.removeEventListener("keyup", handleKeyup)
        window.addEventListener("keyup", handleKeyup)

        if (options.off) downHostShortkeys();
    }

    function downHostShortkeys() {
        console.log("down listeners...");
        window.removeEventListener("keydown", handleKeydown)
        window.removeEventListener("keyup", handleKeyup)
    }

    function addStep(targetElm) {

        const step = utils.createStep(targetElm)

        if (!inProgressShortkey.headStep) {
            inProgressShortkey.linkedSteps = inProgressShortkey.headStep = step;
        } else {
            inProgressShortkey.headStep = inProgressShortkey.headStep.nx = step;
        }

        inProgressShortkey.stepsCount++;

        addStepToPopup(step);
    }

    function addShortkey() {
        if (!inProgressShortkey.keys) return;

        if (isKeysUsedBefore(inProgressShortkey.keys)) {
            throw new Error("Key used before")
        }

        const data = {
            type: inProgressShortkey.type,
            keys: inProgressShortkey.keys,
            title: inProgressShortkey.title,
            waiting: inProgressShortkey.waiting,
            target: inProgressShortkey.linkedSteps,
            stepCount: inProgressShortkey.stepsCount,
            script: inProgressShortkey.script,
            shared: inProgressShortkey.shared,
        }

        if (listeningNewShortkey) {
            const newShortkey = utils.createNewShortkey(data);

            // push to shortkeys
            hostShortkeys.push(newShortkey);

            console.log("New shortkey added in tab local :)");
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

        const stepElm = createStepElm(inProgressShortkey.stepsCount, step.tx || "Unknown", `step ${inProgressShortkey.stepsCount}`);
        const stepTitleElm = stepElm.querySelector(`#step-${inProgressShortkey.stepsCount}`);

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

    function callNextStep(current, waitingInMS) {
        if (!current) return;

        const elm = utils.findTargetElm(current);

        fireElementEvents(elm, null, current);

        // set waiting time
        waitingInMS = waitingInMS || options.waitBetweenSteps || 500;
        setTimeout(() => {
            callNextStep(current.nx, waitingInMS)
        }, waitingInMS)
    }

    function addScriptToContent(script) {
        const srcElm = document.createElement("script");
        srcElm.setAttribute("type", "text/javascript")
        srcElm.innerHTML = script;
        document.body.appendChild(srcElm)
    }

    // BUILD IN UTILS
    function isKeysUsedBefore(keys) {
        if (!keys) return true;

        return hostShortkeys.some(item => item.k === keys);
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

        addStep(target);
    }

    function handleLinkTagClick(e) {
        if (options.preventPageReload || !isWebApp) {
            e.preventDefault();
            return false
        }

        isWebApp = true;
    }

    function handleKeydown(e) {
        if (cachedKeys && !cachedKeys.includes(e.key))
            cachedKeys.push(e.key);
    }

    function handleKeyup(e) {
        if (!cachedKeys || !cachedKeys.length) return;

        if (options.preventInInputs) {
            const tagName = e.path && e.path[0].tagName;
            if (tagName && ["input", "textarea"].includes(tagName.toLowerCase())) {
                return;
            }
        }

        for (let {k: keys, tr: target, ty: type, sc: script, w: waiting} of hostShortkeys) {

            const keysStr = utils.parseArrayOfKeys(cachedKeys);

            if (keysStr === keys) {
                e.preventDefault();

                if (type === TYPES.click) {
                    callNextStep(target, waiting)
                } else if (type === TYPES.script) {
                    addScriptToContent(script);
                }

                // break loop when reached the target short-key
                break;
            }
        }

        cachedKeys = [];
    }

    function handleDetectionKeydown(e) {
        e.preventDefault();
        if (inProgressShortkey.pressedKeys && !inProgressShortkey.pressedKeys.includes(e.key))
            inProgressShortkey.pressedKeys.push(e.key);
    }

    function handleDetectionKeyup(cb, e) {
        e.preventDefault();

        if (!inProgressShortkey.pressedKeys || !inProgressShortkey.pressedKeys.length) return;

        let keys = utils.parseArrayOfKeys(inProgressShortkey.pressedKeys)

        inProgressShortkey.pressedKeys = []

        if (cb && typeof cb === "function") cb(keys)
    }

    function handleKeysDetection(keys) {
        inProgressShortkey.keys = keys;
        console.log(keys);
        ui.popupElmKeysWrapper.innerHTML = keys;
    }

    function onAdd(fn) {
        if (fn && typeof fn === "function")
            onAddListeners.push(fn)
    }

    function triggerOnAddEvent() {
        for (let fn of onAddListeners) {
            fn(hostShortkeys);
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
        };

        if (ui.popupElm) {
            ui.popupElm.remove();
        }

        inProgressShortkey.title = `Shortkey ${hostShortkeys.length + 1}`;
        ui.popupElm = createPopupElm(inProgressShortkey.title);
        ui.popupElmStepsWrapper = ui.popupElm.querySelector("#shortkey-steps");
        ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");

        const popupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
        const popupElmCancelBtn = ui.popupElm.querySelector("#shortkey-cancel-btn");
        const popupElmTitleInput = ui.popupElm.querySelector("#shortkey-title-input");
        const popupElmWaitingTimeInput = ui.popupElm.querySelector("#waiting-input");

        const handleNameInputChange = e => {
            inProgressShortkey.title = e.target.value.replace(/[^a-zA-Z -_.]/g, "")
        }

        const handleWaitingInputChange = e => {
            inProgressShortkey.waiting = Math.max(0, Math.min(10, +e.target.value)) * 1000
        }

        const handleAddBtnClick = (e) => {
            ui.popupElmMsg.innerText = ""
            if (!inProgressShortkey.headStep) {
                ui.popupElmMsg.innerText = "No steps added."
                return;
            }

            if (!inProgressShortkey.title) {
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

        popupElmWaitingTimeInput.addEventListener("change", handleWaitingInputChange)

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
        };

        if (ui.popupElm) {
            ui.popupElm.remove();
        }

        inProgressShortkey.title = `Shortkey ${hostShortkeys.length + 1}`;
        ui.popupElm = createPopupElm(inProgressShortkey.title);
        ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");
        const scriptTextarea = ui.popupElm.querySelector("#shortkey-script-input");

        const scriptPopupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
        const scriptPopupElmCancelBtn = ui.popupElm.querySelector("#shortkey-cancel-btn");
        const scriptPopupElmTitleInput = ui.popupElm.querySelector("#shortkey-title-input");
        const sharedSwitch = ui.popupElm.querySelector("#shared-shortkey-switch");

        const handleTextAreaChange = e => inProgressShortkey.script = e.target.value.trim();

        const handleNameInputChange = e => {
            inProgressShortkey.title = e.target.value.replace(/[^a-zA-Z -_.]/g, "")
        }

        const handleAddBtnClick = e => {
            ui.popupElmMsg.innerText = ""
            if (!inProgressShortkey.script) {
                ui.popupElmMsg.innerText = "Enter the script first."
                return;
            }

            if (!inProgressShortkey.title) {
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

        const handleSaveAsSharedSwitchChange = e => inProgressShortkey.shared = e.target.checked;

        scriptTextarea.addEventListener("change", handleTextAreaChange)
        scriptPopupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)
        scriptPopupElmCancelBtn.addEventListener("click", abortAdding)
        scriptPopupElmTitleInput.addEventListener("change", handleNameInputChange)
        sharedSwitch.addEventListener("change", handleSaveAsSharedSwitchChange)

        document.body.appendChild(ui.popupElm)
    }

    function showKeysInputPopup() {
        const createKeysInputElm = () => {
            let temp = document.createElement("template");
            temp.innerHTML = `
                <div class="issk issk-fixed-modal" tabindex="1">
                    <div class="issk-popup">
                        <div class="keys-container">
                            <strong class="label">Shortkey for above steps:</strong>
                            <pre class="keys-input" id="keys-pre">Press keys that you want...</pre>
                        </div>
                        <ul class="issk-popup-msg info">
                            <li><code>ctrl + t</code> and <code>ctrl + w</code> are reserved by your browser.</li>
                        </ul>
                        <div id="keys-popup-msg" class="issk-popup-msg"></div>
                        <div class="actions">
                            <button id="shortkey-cancel-btn" class="cancel">Cancel</button>
                            <button id="shortkey-add-btn">Add</button>
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

        const popupElmAddBtn = ui.popupElm.querySelector("#shortkey-add-btn");
        const popupElmCancelBtn = ui.popupElm.querySelector("#shortkey-cancel-btn");
        const popupElmMsg = ui.popupElm.querySelector("#keys-popup-msg");

        const handleAddBtnClick = () => {
            popupElmMsg.innerHTML = "";
            if (!inProgressShortkey.keys) {
                popupElmMsg.innerHTML = "Determine the shortkey first."
                return;
            }

            if (isKeysUsedBefore(inProgressShortkey.keys)) {
                popupElmMsg.innerHTML = "This shortkey used before."
                return;
            }

            addShortkey()

            // remove button listener
            popupElmAddBtn.removeEventListener("click", handleAddBtnClick)
        }

        popupElmAddBtn.addEventListener("click", handleAddBtnClick)
        popupElmCancelBtn.addEventListener("click", abortAdding)

        document.body.appendChild(ui.popupElm)
        ui.popupElm.focus();

        // detect shortkeys and set it
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
        showToast("New shortkey was added", keys)
    }


    return {
        listening: listeningNewShortkey,
        shortkeys: hostShortkeys,
        listen,
        addStep,
        upHostShortkeys,
        downHostShortkeys,
        onAdd,
        showSuccessToast,
    }
})();