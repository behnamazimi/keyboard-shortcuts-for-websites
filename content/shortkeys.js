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

    window.removeEventListener("keydown", handleKeydown)
    window.addEventListener("keydown", handleKeydown)

    window.removeEventListener("keyup", handleKeyup)
    window.addEventListener("keyup", handleKeyup)

    if (options.off) downHostShortkeys();
  }

  function downHostShortkeys() {
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

  function findTargetShortkey() {
    if (!cachedKeys) return null;

    let targetShortkey = null;
    for (let shortkey of hostShortkeys) {

      const keysStr = utils.parseArrayOfKeys(cachedKeys);
      if (keysStr === shortkey.k) {
        // break loop when reached the target short-key
        targetShortkey = shortkey;
        break;
      }
    }

    return targetShortkey
  }

  // EVENT HANDLERS
  function handleDocClick(e) {
    if (performance.now() - lastDomClick < 500) {
      e.preventDefault();
      return false;
    }

    lastDomClick = performance.now();

    if (!e || !e.target || !listeningNewShortkey) return;

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
    if (listeningNewShortkey) return;

    if (cachedKeys && !cachedKeys.includes(e.key))
      cachedKeys.push(e.key);

    // prevent default action if keys matched
    if (findTargetShortkey() !== null) {
      e.preventDefault();
      return false;
    }
  }

  function handleKeyup(e) {
    if (listeningNewShortkey || !cachedKeys || !cachedKeys.length) return;

    if (options.preventInInputs) {
      const tagName = e.path && e.path[0].tagName;
      if (tagName && ["input", "textarea"].includes(tagName.toLowerCase())) {
        return;
      }
    }

    let targetShortkey = findTargetShortkey();

    // remove up keys from cachedKeys
    const keyIndex = cachedKeys.indexOf(e.key)
    if (keyIndex !== -1)
      cachedKeys.splice(keyIndex, 1)

    if (targetShortkey !== null) {
      const {tr: target, ty: type, sc: script, w: waiting} = targetShortkey;
      if (type === TYPES.click) {
        callNextStep(target, waiting)
      } else if (type === TYPES.script) {
        addScriptToContent(script);
      }

      e.preventDefault();
      return false;
    }

  }

  function handleDetectionKeydown(e) {
    if (inProgressShortkey.pressedKeys && !inProgressShortkey.pressedKeys.includes(e.key))
      inProgressShortkey.pressedKeys.push(e.key);

    e.preventDefault();
    return false;
  }

  function handleDetectionKeyup(cb, e) {
    if (!inProgressShortkey.pressedKeys || !inProgressShortkey.pressedKeys.length) return;

    let keys = utils.parseArrayOfKeys(inProgressShortkey.pressedKeys)

    inProgressShortkey.pressedKeys = []

    if (cb && typeof cb === "function") cb(keys)

    e.preventDefault();
    return false;
  }

  function handleKeysDetection(keys) {
    inProgressShortkey.keys = keys;
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

    if (ui.popupElm) {
      ui.popupElm.remove();
    }

    inProgressShortkey.title = `Shortkey ${hostShortkeys.length + 1}`;
    ui.popupElm = uiUtils.createStepsPopupElm(inProgressShortkey.title, options.waitBetweenSteps / 1000);
    ui.popupElmStepsWrapper = ui.popupElm.querySelector("#shortkey-steps");
    ui.popupElmMsg = ui.popupElm.querySelector("#popup-msg");

    const popupElmKeysOpenBtn = ui.popupElm.querySelector("#open-keys-modal");
    const popupElmCancelBtn = ui.popupElm.querySelector("#shortkey-cancel-btn");
    const popupElmTitleInput = ui.popupElm.querySelector("#shortkey-title-input");
    const popupElmWaitingTimeInput = ui.popupElm.querySelector("#waiting-input");
    const popupMove = ui.popupElm.querySelector("#popup-move");

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

  function showScriptPopup() {

    if (ui.popupElm) {
      ui.popupElm.remove();
    }

    inProgressShortkey.title = `Shortkey ${hostShortkeys.length + 1}`;
    ui.popupElm = uiUtils.createScriptPopupElm(inProgressShortkey.title);
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

    // close steps popup
    if (ui.popupElm) {
      ui.popupElm.remove();
    }

    ui.popupElm = uiUtils.createKeysDefinePopupElm();
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
    showToast("New shortkey was added", keys)
  }


  return {
    listening: listeningNewShortkey,
    shortkeys: hostShortkeys,
    listen,
    upHostShortkeys,
    onAdd,
    showSuccessToast,
  }
})();