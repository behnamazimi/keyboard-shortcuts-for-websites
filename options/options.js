'use strict';

let allData = null;
let optionsForm = document.getElementById('options-form');
let optionsToast = document.getElementById('options-toast');

sendGlobalMessage({action: globalActions.OPTIONS_INIT}, (response) => {
    const {globalOptions = {}} = allData = response || {};

    optionsForm.elements["waitBetweenSteps"].value = globalOptions.waitBetweenSteps || 0;

    if (globalOptions.off) {
        console.log(234);
        optionsForm.elements["off"].setAttribute("checked", "true");
    } else {
        optionsForm.elements["off"].removeAttribute("checked");
    }

    if (globalOptions.allowInInputs) {
        optionsForm.elements["allowInInputs"].setAttribute("checked", "true");
    } else {
        optionsForm.elements["allowInInputs"].removeAttribute("checked");
    }
});

document.addEventListener("click", (e) => {
    if (e.target.classList.contains('section-title')) {
        e.target.closest(".section").classList.toggle("open")
    }
}, true)


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

function showToast(msg, status = '') {
    optionsToast.querySelector("p").innerText = msg;
    optionsToast.classList.add("visible")
    optionsToast.classList.add(status)

    setTimeout(() => {
        optionsToast.classList.remove("visible")
        optionsToast.classList.remove(status)
    }, 3000)
}

function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
}