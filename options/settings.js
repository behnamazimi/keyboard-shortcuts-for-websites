'use strict';

let allData = null;
let optionsForm = document.getElementById('options-form');
let toastElm = document.getElementById('issk-toast');
let hostsCountElm = document.getElementById('hosts-count');
let shortkeysCountElm = document.getElementById('shortkeys-count');
let sharedKeysCountElm = document.getElementById('shared-keys-count');
let exportBtn = document.getElementById('export-btn');
let importBtn = document.getElementById('import-btn');
let importFileInput = document.getElementById('import-file-input');
let clearDataConfirm = document.getElementById('clear-data-confirm');
let clearDataBtn = document.getElementById('clear-data-btn');

initSettingsData();

document.addEventListener("click", (e) => {
  if (e.target.classList.contains('section-title')) {
    const section = e.target.closest(".section")
    section.removeAttribute("style")

    section.classList.toggle("open")
    if (section.classList.contains("open")) {
      setTimeout(() => {
        section.style.maxHeight = section.clientHeight + "px"
      }, 400)
    }
  }
}, true)

exportBtn.onclick = function (e) {
  messagingUtils.sendGlobalMessage({action: globalActions.GET_ALL_DATA}, (response) => {
    utils.createDownloadLink(JSON.stringify(response));
    showToast("Shortkeys exported.")
  });
}

importBtn.onclick = () => importFileInput.click();

importFileInput.onchange = function (e) {
  let reader = new FileReader();
  reader.onload = function () {
    messagingUtils.sendGlobalMessage({action: globalActions.IMPORT_DATA, jsonStr: reader.result}, (res) => {
      if (res) {
        showToast("Data imported successfully.")
        initSettingsData();
      } else {
        showToast("Selected content format is wrong. Be sure that you select the correct file.", "error")
      }
    })
  }

  reader.readAsText(this.files[0]);
}

optionsForm.oninput = function () {
  const formData = new FormData(this);

  let options = {
    off: false,
    preventInInputs: false,
    waitBetweenSteps: ".5",
  };

  for (let [key, value] of formData.entries()) {
    options[key] = value;
    if (value === "on")
      options[key] = true;

    if (key === "waitBetweenSteps") {
      options[key] = +value * 1000;
    }
  }

  messagingUtils.sendGlobalMessage({action: globalActions.GLOBAL_OPTIONS_UPDATE, options}, (response) => {
    if (response) {
      showToast("Options updated.");
    }
  })
}

clearDataConfirm.onchange = e => {
  if (e.target.checked) {
    clearDataBtn.removeAttribute("disabled")
  } else {
    clearDataBtn.setAttribute("disabled", "true")
  }
}

clearDataBtn.onclick = () => {
  messagingUtils.sendGlobalMessage({action: globalActions.CLEAT_DATA}, () => {
    initSettingsData();
    showToast("Shortkeys cleared.");

    clearDataBtn.setAttribute("disabled", "true")
    clearDataConfirm.checked = false;
  });
}

function initSettingsData() {
  clearDataConfirm.removeAttribute("checked");

  messagingUtils.sendGlobalMessage({action: globalActions.GET_ALL_DATA}, (response) => {
    const {globalOptions = {}, shortkeys = {}} = allData = response || {};
    optionsForm.elements["waitBetweenSteps"].value = (globalOptions.waitBetweenSteps / 1000) || 0.5;

    if (globalOptions.off) {
      optionsForm.elements["off"].setAttribute("checked", "true");
    } else {
      optionsForm.elements["off"].removeAttribute("checked");
    }

    if (globalOptions.preventInInputs) {
      optionsForm.elements["preventInInputs"].setAttribute("checked", "true");
    } else {
      optionsForm.elements["preventInInputs"].removeAttribute("checked");
    }

    const allHostsLen = Object.keys(shortkeys).length;
    const allKeysLen = Object.entries(shortkeys).reduce((a, [_, b]) => a + (b.shortkeys || []).length, 0)
    const sharedKeysLen = (shortkeys[storeUtils.sharedShortkeysKey] || []).length;
    hostsCountElm.innerText = allHostsLen + "";
    shortkeysCountElm.innerText = allKeysLen + "";
    sharedKeysCountElm.innerText = sharedKeysLen + ""
  });
}

function showToast(msg, status = '') {
  toastElm.querySelector("p").innerText = msg;
  toastElm.classList.add("visible")
  if (status) toastElm.classList.add(status)

  setTimeout(() => {
    toastElm.classList.remove("visible")
    if (status) toastElm.classList.remove(status)
  }, 3000)
}
