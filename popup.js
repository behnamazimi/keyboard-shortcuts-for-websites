'use strict';

let addNewBtn = document.getElementById('add-new-shortcut');
let settingsBtn = document.getElementById('open-settings');

let color = null;

chrome.storage.sync.get('color', function (data) {
    color = data.color;
});

addNewBtn.onclick = function (element) {

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