// https://github.com/webextension-toolbox/webextension-toolbox
const shortkeys = (function () {

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

    let addedLinkSteps = [];

    function listen() {
        listeningToStep = true;
        currentLinkedTargets = null;
        headStep = null;
        addedLinkSteps = [];

        showStepsPopup();

        preventLinksClick();
        document.addEventListener("click", handleDocClick)
    }

    function handleDocClick(e) {
        if (!e || !e.target || !listeningToStep) return;

        if (e.path && e.path.some(elm => elm === ui.stepsPopupElm)) return;

        // handle links click
        let linkTagIndex = (e.path || []).findIndex(elm => elm.tagName === "A");
        if (linkTagIndex > -1) {
            const target = e.path[linkTagIndex];
            if (!isUniqueLinkInSteps(target.href)) {
                ui.stepsPopupElmMsg.innerText = "Different link steps added, this may causes faulty action."
            }
        }

        shortkeys.addStep(e.target);
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

    function handleLinkTagClick(e) {
        e.preventDefault();

        return false
    }

    function isUniqueLinkInSteps(newLink) {
        let isUnique = true;
        const newURL = new URL(newLink);
        const newLinkPath = newURL.origin + newURL.pathname;

        for (let link of addedLinkSteps) {
            const url = new URL(link);
            const urlPath = url.origin + url.pathname;

            if (newLinkPath !== urlPath) {
                isUnique = false;
                break;
            }
        }

        addedLinkSteps.push(newLink)

        return isUnique;
    }

    function downHostShortcuts() {
        console.log("down listeners...");
        window.removeEventListener("keydown", handleKeydown.bind(this))
    }

    function upHostShortcuts(shortcuts) {
        if (!Array.isArray(shortcuts)) return;

        hostShortcuts = shortcuts;

        console.log("init listeners...");
        window.removeEventListener("keydown", handleKeydown.bind(this))
        window.addEventListener("keydown", handleKeydown.bind(this))
    }

    function generateStepElmQuery(step) {
        const tag = step.tag || '';
        const attributes = step.attributes || '';
        const parent = step.parent;

        let parentQ = '';
        if (parent) {
            // always use simple query as parents
            parentQ = generateStepElmQuery(parent)[0]
        }

        let simpleQuery = `${parentQ} ${tag}`;
        let complexQuery = `${parentQ} ${tag}`;
        if (attributes.id) {
            simpleQuery += `#${attributes.id}`;
            complexQuery += `#${attributes.id}`;

        } else {
            for (let [attr, value] of Object.entries(attributes)) {
                switch (attr) {
                    case "class":
                        const classes = value.split(" ").map(c => "." + c).join("").trim();
                        complexQuery += `${classes}`;
                        break;
                    default:
                        complexQuery += `[${attr}="${value}"]`;
                        break;
                }
            }
        }

        complexQuery = complexQuery.replace(/\.\./, ".").trim();

        return [simpleQuery, complexQuery]
    }

    function findTargetElm(step) {
        if (!step) return null;

        const [simpleQuery, complexQuery] = generateStepElmQuery(step)
        let elm = document.querySelector(complexQuery)
        if (!elm)
            elm = document.querySelector(simpleQuery)

        if (!elm) console.log({simpleQuery, complexQuery})
        return elm
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

        const validAttrs = ["id", "class", "href", "role", "tabIndex", "type", "onclick"]

        const rawAttrs = targetElm.attributes || [];
        const rawAttrsLen = rawAttrs.length;

        for (let i = 0; i < rawAttrsLen; i++) {
            const attrName = rawAttrs[i].nodeName;
            if (!validAttrs.includes(attrName)) continue;

            step.attributes[attrName] = (targetElm.getAttribute(attrName) || '').trim()
        }

        step.tag = targetElm.tagName.toLowerCase();
        step.text = (targetElm.textContent || 'Unknown')
            .replace(/(\r\n|\n|\r)/gm, "")
            .trim()
            .substr(0, 20);

        if (!targetElm.isEqualNode(findTargetElm(step))) {
            step.parent = createStep(targetElm.parentNode)
        }

        return step;
    }

    function fireEvent(event, element, options = {}) {
        setTimeout(() => {
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
        }, 200)
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

    function addStep(targetElm) {

        const step = createStep(targetElm)

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

        triggerOnAddEvent();
        abortAdding();
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
                <div class="issk issk-popup">
                    <div class="steps-container">
                        <strong class="label">Action Steps:</strong>
                        <div class="steps" id="shortcut-steps"><span class="no-step">Click on action to add step</span></div>
                    </div>
                    <div id="steps-popup-msg" class="issk-popup-msg"></div>
                    <div class="actions">
                        <button id="shortcut-cancel-btn" class="cancel">Cancel</button>
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
        ui.stepsPopupElmMsg = ui.stepsPopupElm.querySelector("#steps-popup-msg");

        const stepsPopupElmKeysOpenBtn = ui.stepsPopupElm.querySelector("#open-keys-modal");
        const popupElmCancelBtn = ui.stepsPopupElm.querySelector("#shortcut-cancel-btn");

        const handleAddBtnClick = (e) => {
            ui.stepsPopupElmMsg.innerText = ""
            if (!headStep) {
                ui.stepsPopupElmMsg.innerText = "No steps added."
                return;
            }

            document.removeEventListener("click", handleDocClick)
            showKeysInputPopup()

            // remove button listener
            stepsPopupElmKeysOpenBtn.removeEventListener("click", handleAddBtnClick)
        }

        stepsPopupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)
        popupElmCancelBtn.addEventListener("click", abortAdding)

        document.body.appendChild(ui.stepsPopupElm)
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
                            <li><code>ctrl + t</code> and <code>ctrl + w</code> could not override.</li>
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
        if (ui.stepsPopupElm) {
            ui.stepsPopupElm.remove();
        }

        if (ui.keysPopupElm) {
            ui.keysPopupElm.remove();
        }

        ui.keysPopupElm = createKeysInputElm();
        ui.keysPopupElmKeysWrapper = ui.keysPopupElm.querySelector("#keys-pre");

        const keysPopupElmAddBtn = ui.keysPopupElm.querySelector("#shortcut-add-btn");
        const popupElmCancelBtn = ui.keysPopupElm.querySelector("#shortcut-cancel-btn");
        const keysPopupElmMsg = ui.keysPopupElm.querySelector("#keys-popup-msg");

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
        popupElmCancelBtn.addEventListener("click", abortAdding)

        document.body.appendChild(ui.keysPopupElm)
        ui.keysPopupElm.focus();

        // detect shortcuts and set it
        keysDetection((keys) => {
            currentKeys = keys;

            ui.keysPopupElmKeysWrapper.innerHTML = generateKeysUID(keys);
        });

    }

    function abortAdding() {

        listeningToStep = false;
        currentLinkedTargets = null;
        headStep = null;
        addedLinkSteps = [];

        releaseLinksClick();

        keysDetection(false);
        if (ui.stepsPopupElm)
            ui.stepsPopupElm.remove();

        if (ui.keysPopupElm)
            ui.keysPopupElm.remove();

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
                <div class="issk-toast">
                    <div class="issk-container">
                        <p class="issk-p">New shortcut was added.</p>
                        <pre class="issk-pre">${keys || 'Unknown Keys'}</pre>
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
            fn(hostShortcuts);
        }
    }

    return {
        listening: listeningToStep,
        shortcuts: hostShortcuts,
        upHostShortcuts,
        downHostShortcuts,
        listen,
        addStep,
        onAdd,
        showSuccessToast,
    }
})();


// document.querySelectorAll("a").forEach((a)=>{
//
//     a.addEventListener("click", (e)=>{
//         e.preventDefault();
//         tag = e.target.closest("a")
//         console.log(tag.getAttribute("href"), tag.url, tag.href)
//
//         return false
//     })
//
// })