'use strict';

let allData = null;
let selectedHost = null;
let searchTrend = '';
let optionsToast = document.getElementById('issk-toast');
let searchInput = document.getElementById('search-input');
let hostsElm = document.getElementById('hosts');
let shortkeysElm = document.getElementById('shortkeys');
let listPage = document.getElementById('list-page');
let hostPage = document.getElementById('host-page');
let closeHostPageBtn = document.getElementById('close-host-page');

init();

function init() {

    sendGlobalMessage({action: globalActions.GET_OPTIONS_DATA}, (response) => {
        allData = response || {};

        renderHostsList();
    });
}

searchInput.oninput = function (e) {
    searchTrend = e.target.value;
    renderHostsList();
}

hostsElm.onclick = (e) => {
    let hostElm = e.target.closest(".host-item");
    if (!hostElm) return;

    selectedHost = hostElm.getAttribute("data-host")
    if (!selectedHost) return;

    showHostDetails()
}

closeHostPageBtn.onclick = function () {
    selectedHost = null;
    listPage.classList.toggle("open")
    hostPage.classList.toggle("open")
}

function showHostDetails() {
    if (!selectedHost) return;

    listPage.classList.toggle("open")
    hostPage.classList.toggle("open")

    document.getElementById("c-host-name").innerText = selectedHost;
    renderShortkeysList();
}

function renderShortkeysList() {
    const {shortcuts = {}} = allData;

    let items = shortcuts[selectedHost].shortcuts || [];

    if (!items.length) return;

    shortkeysElm.innerHTML = '';
    if (!items.length) {
        shortkeysElm.innerHTML = 'There is not any shortkeys to show.';
    }

    for (let sk of items) {
        console.log(sk);
        createShortkeyItemElement(sk)
    }
}

function renderHostsList() {
    const {shortcuts = {}} = allData;

    let items = Object.entries(shortcuts);

    if (!items.length) return;

    if (searchTrend) {
        items = items.filter(([host]) => host.indexOf(searchTrend) > -1)
    }

    hostsElm.innerHTML = '';
    if (!items.length) {
        hostsElm.innerHTML = 'There is not any hosts to show.';
    }

    for (let [host, {shortcuts = []}] of items) {
        createHostItemElement(host, shortcuts.length)
    }
}

function createHostItemElement(host, count) {

    const createElm = () => {
        let temp = document.createElement("template");
        temp.innerHTML = `
                <li class="host-item" data-host="${host}">
                    <div class="host-detail">
                        <strong class="host-name">${host}</strong>
                        <span class="host-sk-count">${count} shortkeys</span>
                    </div>
                </li>`;

        return temp.content.firstElementChild;
    };

    hostsElm.appendChild(createElm())
}

function createShortkeyItemElement({id, title, keysUID}) {

    const createElm = () => {
        let temp = document.createElement("template");
        temp.innerHTML = `
                <li class="shortkey-item" id="${id}">
                    <div class="sk-detail">
                        <strong class="sk-name">${title}</strong>
                        <code class="sk-keys">[${keysUID}]</code>
                    </div>
                </li>`;

        return temp.content.firstElementChild;
    };

    shortkeysElm.appendChild(createElm())
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

function sendGlobalMessage(body, cb) {
    chrome.runtime.sendMessage(body, cb);
}

