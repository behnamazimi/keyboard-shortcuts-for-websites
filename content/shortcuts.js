const Shortcuts = (function () {

  let hostShortcuts = [];

  const onAddListeners = [];

  let listeningNewShortcut = false;
  let inProgressShortcut = {
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
    preventOnInput: false,
  };

  let isWebApp = true;

  let options = {waitBetweenSteps: 500, off: false, preventInInputs: false};

  let ui = {
    popupElm: null,
    popupElmStepsWrapper: null,
    popupElmKeysWrapper: null,
    preventPageReload: false,
  }

  let lastDomClick = null
  let cachedKeys = []

  function listen(type) {
    listeningNewShortcut = true;
    inProgressShortcut.linkedSteps = null;
    inProgressShortcut.headStep = null;

    inProgressShortcut.type = type;

    if (type === TYPES.click) {
      showStepsPopup();
      preventLinksClick();
      document.addEventListener("mousedown", handleDocClick)
      document.addEventListener("click", handleDocClick)

    }

  }

  function abortAdding() {

    inProgressShortcut = {
      title: null,
      type: null,
      waiting: null,
      headStep: null,
      linkedSteps: null,
      stepsCount: 0,
      script: null,
      pressedKeys: [],
      shared: false,
      preventOnInput: false,
    };

    listeningNewShortcut = false;

    releaseLinksClick();

    deactivateKeysDetectionMode(handleKeysDetection);

    if (ui.popupElm) ui.popupElm.remove();
  }

  function upHostShortcuts(shortcuts, globalOptions) {
    // update shortcuts list
    if (Array.isArray(shortcuts) && shortcuts.length > 0) {
      hostShortcuts = shortcuts;
    }

    // update global options
    if (globalOptions) options = {...options, ...globalOptions};

    window.removeEventListener("keydown", handleKeydown)
    window.addEventListener("keydown", handleKeydown)

    window.removeEventListener("keyup", handleKeyup)
    window.addEventListener("keyup", handleKeyup)

    if (options.off) downHostShortcuts();
  }

  function downHostShortcuts() {
    window.removeEventListener("keydown", handleKeydown)
    window.removeEventListener("keyup", handleKeyup)
  }

  function addStep(targetElm) {

    const step = utils.createStep(targetElm)

    if (!inProgressShortcut.headStep) {
      inProgressShortcut.linkedSteps = inProgressShortcut.headStep = step;
    } else {
      inProgressShortcut.headStep = inProgressShortcut.headStep.nx = step;
    }

    inProgressShortcut.stepsCount++;

    addStepToPopup(step);
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

    const stepElm = createStepElm(inProgressShortcut.stepsCount, step.tx || "Unknown", `step ${inProgressShortcut.stepsCount}`);
    const stepTitleElm = stepElm.querySelector(`#step-${inProgressShortcut.stepsCount}`);

    if (stepTitleElm) {
      stepTitleElm.addEventListener("input", e => {
        step.tx = e.target.textContent
          .replace(/[^a-zA-Z -_.]/g, "")
          .substring(0, 15)
      })
    }

    ui.popupElmStepsWrapper.appendChild(stepElm)
  }

  function addShortcut() {
    if (!inProgressShortcut.keys) return;

    if (isKeysUsedBefore(inProgressShortcut.keys)) {
      throw new Error("Key used before")
    }

    const data = {
      type: inProgressShortcut.type,
      keys: inProgressShortcut.keys,
      title: inProgressShortcut.title,
      waiting: inProgressShortcut.waiting,
      target: inProgressShortcut.linkedSteps,
      stepCount: inProgressShortcut.stepsCount,
      script: inProgressShortcut.script,
      shared: inProgressShortcut.shared,
      preventOnInput: inProgressShortcut.preventOnInput,
    }

    if (listeningNewShortcut) {
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

    const {x, y} = element.getBoundingClientRect();

    const eventOptions = {
      bubbles: true, view: window, x, y,
      ...options
    };

    const validEvents = ["mouseover", "mousedown", "mouseup", "click"];
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

  // BUILD IN UTILS
  function isKeysUsedBefore(keys) {
    if (!keys) return true;

    return hostShortcuts.some(item => item.k === keys);
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

  function findTargetShortcut() {
    if (!cachedKeys) return null;

    let targetShortcut = null;
    for (let shortcut of hostShortcuts) {

      const keysStr = utils.parseArrayOfKeys(cachedKeys);
      if (keysStr === shortcut.k) {
        // break loop when reached the target short-key
        targetShortcut = shortcut;
        break;
      }
    }

    return targetShortcut
  }

  // EVENT HANDLERS
  function handleDocClick(e) {
    if (performance.now() - lastDomClick < 500) {
      e.preventDefault();
      return false;
    }

    lastDomClick = performance.now();

    if (!e || !e.target || !listeningNewShortcut) return;

    if (e.path && e.path.some(elm => elm === ui.popupElm)) return;

    let target = e.target;

    if (e.path) {
      const buttonIndex = e.path.findIndex(pe => pe.tagName === "BUTTON" || (pe.getAttribute && pe.getAttribute("role") === "button"))
      if (buttonIndex > -1) {
        target = e.path[buttonIndex];
      }

      const inputIndex = e.path.findIndex(pe => pe.tagName === "INPUT")
      if (inputIndex > -1) {
        target = e.path[inputIndex];
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
    if (listeningNewShortcut) return;

    if (cachedKeys && !cachedKeys.includes(e.key))
      cachedKeys.push(e.key);

    // prevent default action if keys matched
    if (findTargetShortcut() !== null) {
      e.preventDefault();
      return false;
    }
  }

  function handleKeyup(e) {
    if (listeningNewShortcut || !cachedKeys || !cachedKeys.length) return;

    let targetShortcut = findTargetShortcut();

    // remove up keys from cachedKeys
    const keyIndex = cachedKeys.indexOf(e.key)
    if (keyIndex !== -1)
      cachedKeys.splice(keyIndex, 1)

    if (options.preventInInputs || (targetShortcut && targetShortcut.pi)) {
      const tagName = e.path && e.path[0].tagName;
      if (tagName && ["input", "textarea"].includes(tagName.toLowerCase())) {
        return;
      }
    }

    if (targetShortcut) {
      const {tr: target, ty: type, sc: script, w: waiting} = targetShortcut;
      if (type === TYPES.click) {
        callNextStep(target, waiting)
      }

      e.preventDefault();
      return false;
    }
  }

  function handleDetectionKeydown(e) {
    if (inProgressShortcut.pressedKeys && !inProgressShortcut.pressedKeys.includes(e.key))
      inProgressShortcut.pressedKeys.push(e.key);

    e.preventDefault();
    return false;
  }

  function handleDetectionKeyup(cb, e) {
    if (!inProgressShortcut.pressedKeys || !inProgressShortcut.pressedKeys.length) return;

    let keys = utils.parseArrayOfKeys(inProgressShortcut.pressedKeys)

    inProgressShortcut.pressedKeys = []

    if (cb && typeof cb === "function") cb(keys)

    e.preventDefault();
    return false;
  }

  function handleKeysDetection(keys) {
    inProgressShortcut.keys = keys;
    ui.popupElmKeysWrapper.innerHTML = keys;
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

    if (ui.popupElm) {
      ui.popupElm.remove();
    }

    inProgressShortcut.title = `Shortcut ${hostShortcuts.length + 1}`;
    ui.popupElm = uiUtils.createStepsPopupElm(inProgressShortcut.title, options.waitBetweenSteps / 1000);
    ui.popupElmStepsWrapper = ui.popupElm.querySelector("#shortcut-steps");
    ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");

    const popupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
    const popupElmCancelBtn = ui.popupElm.querySelector("#shortcut-cancel-btn");
    const popupElmTitleInput = ui.popupElm.querySelector("#shortcut-title-input");
    const popupElmWaitingTimeInput = ui.popupElm.querySelector("#waiting-input");
    const popupMove = ui.popupElm.querySelector("#popup-move");

    const handleNameInputChange = e => {
      inProgressShortcut.title = e.target.value.replace(/[^a-zA-Z -_.]/g, "")
    }

    const handleWaitingInputChange = e => {
      inProgressShortcut.waiting = Math.max(0, Math.min(10, +e.target.value)) * 1000
    }

    const handleAddBtnClick = (e) => {
      ui.popupElmMsg.innerText = ""
      if (!inProgressShortcut.headStep) {
        ui.popupElmMsg.innerText = "No steps added."
        return;
      }

      if (!inProgressShortcut.title) {
        ui.popupElmMsg.innerText = "Enter shortcut title."
        return;
      }

      document.removeEventListener("mousedown", handleDocClick)
      document.removeEventListener("click", handleDocClick)
      showKeysInputPopup()

      // remove button listener
      popupElmKeysOpenBtn.removeEventListener("click", handleAddBtnClick)
    }

    const handlePopupMove = (e) => {
      if (e.target.tagName === "BUTTON") {
        const pos = e.target.getAttribute("data-pos");

        switch (pos) {
          case "left":
            ui.popupElm.style.left = "16px"
            ui.popupElm.style.right = "unset"
            break;
          case "right":
            ui.popupElm.style.right = "16px"
            ui.popupElm.style.left = "unset"
            break;
          case "top":
            ui.popupElm.style.top = "16px"
            ui.popupElm.style.bottom = "unset"
            break;
          case "bottom":
            ui.popupElm.style.bottom = "16px"
            ui.popupElm.style.top = "unset"
            break;
        }
      }
    }

    popupElmKeysOpenBtn.addEventListener("click", handleAddBtnClick)
    popupElmCancelBtn.addEventListener("click", abortAdding)

    popupElmTitleInput.addEventListener("change", handleNameInputChange)

    popupElmWaitingTimeInput.addEventListener("change", handleWaitingInputChange)

    popupMove.addEventListener("click", handlePopupMove)

    document.body.appendChild(ui.popupElm)
  }

  function showKeysInputPopup() {

    // close steps popup
    if (ui.popupElm) {
      ui.popupElm.remove();
    }

    ui.popupElm = uiUtils.createKeysDefinePopupElm();
    ui.popupElmKeysWrapper = ui.popupElm.querySelector("#keys-pre");

    const popupElmPreventOnInput = ui.popupElm.querySelector("#prevent-on-input");
    const popupElmAddBtn = ui.popupElm.querySelector("#shortcut-add-btn");
    const popupElmCancelBtn = ui.popupElm.querySelector("#shortcut-cancel-btn");
    const popupElmMsg = ui.popupElm.querySelector("#keys-popup-msg");

    const handlePreventInputChange = (e) => {
      inProgressShortcut.preventOnInput = e.target.checked
    }

    const handleAddBtnClick = () => {
      popupElmMsg.innerHTML = "";
      if (!inProgressShortcut.keys) {
        popupElmMsg.innerHTML = "Determine the shortcut first."
        return;
      }

      if (isKeysUsedBefore(inProgressShortcut.keys)) {
        popupElmMsg.innerHTML = "This shortcut used before."
        return;
      }

      addShortcut()

      // remove button listener
      popupElmAddBtn.removeEventListener("click", handleAddBtnClick)
    }

    popupElmPreventOnInput.addEventListener("change", handlePreventInputChange)
    popupElmAddBtn.addEventListener("click", handleAddBtnClick)
    popupElmCancelBtn.addEventListener("click", abortAdding)

    document.body.appendChild(ui.popupElm)
    ui.popupElm.focus();

    // detect shortcuts and set it
    activateKeysDetectionMode(handleKeysDetection);

  }

  function showToast(msg, pre, error = false) {

    if (ui.successToastElm) {
      ui.successToastElm.remove();
    }

    ui.successToastElm = uiUtils.createToastElm(msg, pre);
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
    listening: listeningNewShortcut,
    shortcuts: hostShortcuts,
    listen,
    upHostShortcuts,
    onAdd,
    showSuccessToast,
  }
})();