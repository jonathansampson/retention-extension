if ( !isBrave() ) {
    chrome.runtime.onStartup.addListener( maybeWarn );
    chrome.runtime.onInstalled.addListener( maybeWarn );
}

function isBrave () {
    return navigator.userAgentData.brands.some( entry => {
        return entry.brand === "Brave";
    });
}

async function maybeWarn () {

    const warning = {
        type: "basic",
        title: "Warning",
        message: "You are not protected by Brave.",
        iconUrl: chrome.runtime.getURL("brave_128.png"),
        contextMessage: "Return to Brave for a safer experience.",
        priority: 2
    };

    const [ infoTab ] = await chrome.tabs.query({
        url: "https://brave.com/latest/"
    });

    if ( infoTab ) {

        if ( !infoTab.active ) {
            chrome.tabs.update( infoTab.id, { active: true });
        }

        chrome.notifications.create( warning );

    } else {

        chrome.tabs.create({
            "active": true,
            "url": "https://www.brave.com/latest/"
        });

        chrome.notifications.create( warning );

    }

}
