'use strict';

let allData = null;
let optionsForm = document.getElementById('options-form');
let optionsToast = document.getElementById('options-toast');
let shortkeysCountElm = document.getElementById('shortkeys-count');
let exportBtn = document.getElementById('export-btn');
let importBtn = document.getElementById('import-btn');
let importFileInput = document.getElementById('import-file-input');
let clearDataConfirm = document.getElementById('clear-data-confirm');
let clearDataBtn = document.getElementById('clear-data-btn');

init();

document.addEventListener("click", (e) => {
    if (e.target.classList.contains('section-title')) {
        e.target.closest(".section").classList.toggle("open")
    }
}, true)

exportBtn.onclick = function (e) {
    sendGlobalMessage({action: globalActions.GET_OPTIONS_DATA}, (response) => {
        createDownloadLink(JSON.stringify(response));
        showToast("Shortkeys exported.")
    });
}

importBtn.onclick = () => importFileInput.click();

importFileInput.onchange = function (e) {
    let reader = new FileReader();
    reader.onload = function () {
        console.log(reader.result);
    }

    reader.readAsText(this.files[0]);
}

optionsForm.onsubmit = function (e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    let options = {
        off: false,
        allowInInputs: false,
        waitBetweenSteps: "0",
    };

    for (let [key, value] of formData.entries()) {
        options[key] = value;
        if (value === "on")
            options[key] = true;
    }

    sendGlobalMessage({action: globalActions.GLOBAL_OPTIONS_UPDATE, options}, (response) => {
        if (response) {
            showToast("Options updated.", "error");
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
    sendGlobalMessage({action: globalActions.CLEAT_DATA}, () => {
        showToast("Shortkeys cleared.");
        init();
    });
}

function init() {
    clearDataConfirm.removeAttribute("checked");

    sendGlobalMessage({action: globalActions.GET_OPTIONS_DATA}, (response) => {
        const {globalOptions = {}, shortcuts = {}} = allData = response || {};
        optionsForm.elements["waitBetweenSteps"].value = globalOptions.waitBetweenSteps || 0;

        if (globalOptions.off) {
            optionsForm.elements["off"].setAttribute("checked", "true");
        } else {
            optionsForm.elements["off"].removeAttribute("checked");
        }

        if (globalOptions.allowInInputs) {
            optionsForm.elements["allowInInputs"].setAttribute("checked", "true");
        } else {
            optionsForm.elements["allowInInputs"].removeAttribute("checked");
        }

        shortkeysCountElm.innerText = (Object.keys(shortcuts).length) + "";
    });
}

function showToast(msg, status = '') {
    optionsToast.querySelector("p").innerText = msg;
    optionsToast.classList.add("visible")
    if (status) optionsToast.classList.add(status)

    setTimeout(() => {
        optionsToast.classList.remove("visible")
        if (status) optionsToast.classList.remove(status)
    }, 3000)
}

function createDownloadLink(text) {
    let link = document.createElement('a');
    link.target = "_blank"
    link.download = `in-site-shortkeys.json`
    let blob = new Blob([text], {type: 'application/json'});
    link.href = window.URL.createObjectURL(blob);
    link.click()
    link.remove()
}

function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
}

