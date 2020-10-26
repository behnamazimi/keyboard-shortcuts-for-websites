'use strict';

let addNewBtn = document.getElementById('add-new-shortcut');
let openOptionsBtn = document.getElementById('open-options-btn');

let color = null;

chrome.storage.sync.get('color', function (data) {
    color = data.color;
});

openOptionsBtn.onclick = function () {
    const optionsPageURL = chrome.extension.getURL("options.html");
    window.open(optionsPageURL);
}

addNewBtn.onclick = function (element) {
    window.close();
    // send message to content
    sendMessageToCurrentTab({action: "OPEN_POPUP"})

    // let color = element.target.value;
    // chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //     chrome.tabs.executeScript(
    //         tabs[0].id,
    //         {code: 'document.body.style.backgroundColor = "' + color + '";'});
    // });
};


function sendMessageToCurrentTab(body) {
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, body);
    });
}