'use strict';

const {copyToClipboard} = utils;
const {sendGlobalMessage} = messagingUtils;

const urlParams = new URLSearchParams(location.search)
let urlHost = urlParams.get("host")

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

initListData();

function initListData() {

  sendGlobalMessage({action: globalActions.GET_ALL_DATA}, (response) => {
    allData = response || {};

    renderHostsList();

    // open passed host page only once
    if (urlHost && allData.shortkeys && allData.shortkeys[urlHost]) {
      selectedHost = urlHost;
      showHostDetails();
      urlHost = null
    }
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

  if (e.target.getAttribute("data-action") === "delete") {
    deleteSelectedHost(hostElm)

  } else {
    showHostDetails()
  }
}

shortkeysElm.onclick = (e) => {
  // remove shortkey
  let shortkeyElm = e.target.closest(".shortkey-item");
  if (!shortkeyElm) return;

  if (e.target.classList.contains("delete-sk")) {
    deleteShortkey(shortkeyElm);

  } else if (e.target.classList.contains("copy-script")) {
    const id = shortkeyElm.getAttribute("id")
    const targetSk = (allData.shortkeys[selectedHost].shortkeys || []).filter(sk => sk.i === id);
    if (targetSk && targetSk[0]) {
      copyToClipboard(targetSk[0].sc);
      e.target.innerText = "Copied"

      setTimeout(() => {
        e.target.innerText = "Copy Script"
      }, 1000)
    }
  }

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
  const {shortkeys = {}} = allData;

  let items = shortkeys[selectedHost].shortkeys || [];

  if (selectedHost === storeUtils.sharedShortkeysKey) {
    items = shortkeys[selectedHost] || []
  }

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
  const {shortkeys = {}} = allData;

  let items = Object.entries(shortkeys);

  if (searchTrend) {
    items = items.filter(([host]) => host.indexOf(searchTrend) > -1)
  }

  hostsElm.innerHTML = '';
  if (!items.length) {
    hostsElm.innerHTML = 'There is not any hosts to show.';
  }

  for (let [host, details] of items) {
    // find out keys to get length
    let sk = details.shortkeys || [];
    if (host === storeUtils.sharedShortkeysKey)
      sk = details || []

    if (sk.length > 0)
      createHostItemElement(host, sk.length, host === storeUtils.sharedShortkeysKey)
  }
}

function createHostItemElement(host, count, sharedItem) {

  const createElm = () => {
    let temp = document.createElement("template");
    temp.innerHTML = `
                <li class="host-item ${sharedItem ? "shared" : ""}" data-host="${host}">
                    <div class="host-detail">
                        <strong class="host-name">${host}</strong>
                        <div>
                            <span class="host-sk-count">${count} shortkeys</span>
                            <div class="item-actions">
                                <button data-action="delete" class="small danger">Delete</button>
                            </div>
                        </div>
                    </div>
                </li>`;

    return temp.content.firstElementChild;
  };

  hostsElm.appendChild(createElm())
}

function createShortkeyItemElement({i: id, t: title, k: keys, ty: type, c: stepsCount}) {

  const createElm = () => {
    let temp = document.createElement("template");
    temp.innerHTML = `
            <li class="shortkey-item" id="${id}">
                <div class="sk-detail">
                    <strong class="sk-name">${title}</strong>
                    <div class="sk-footer">
                        <span class="sk-type">${type === 0 ? "Click" : "Script"}</span>
                        <code class="sk-keys">${keys}</code>
                        ${type === 0 && stepsCount ? `<span class="sk-step">(${stepsCount + ` step${stepsCount > 1 ? "s" : ""}`})</span>` : ''}
                    </div>
                </div>
                <div class="sk-actions">
                    ${type === 1 ? `<button class="copy-script outline small">Copy Script</button>&nbsp;` : ''}
                    <button class="delete-sk small danger">Delete</button>
                </div>
            </li>`;

    return temp.content.firstElementChild;
  };

  shortkeysElm.appendChild(createElm())
}

function deleteSelectedHost(hostElm) {
  if (!selectedHost || !hostElm) return;

  sendGlobalMessage({action: globalActions.DELETE_HOST, host: selectedHost}, (res) => {
    if (res) {
      initListData();
      hostElm.remove();
    }
  })
}

function deleteShortkey(shortkeyElm) {

  const id = shortkeyElm.getAttribute("id")
  if (!id) return;

  if (!id || !selectedHost) {
    showToast("Cannot find target shortkey", "error")
    return
  }

  sendGlobalMessage({action: globalActions.DELETE_SHORTKEY, id, host: selectedHost}, (res) => {
    initListData();
    shortkeyElm.remove();
    if (!res || !res.shortkeys || !res.shortkeys.length) {
      closeHostPageBtn.click();
    }
  })
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


