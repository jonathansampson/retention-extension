chrome.runtime.onStartup.addListener( maybeWarn );
chrome.runtime.onInstalled.addListener( maybeWarn );

async function maybeWarn () {

    /**
     * TODO: Set default search engine to Brave Search
     * This requires search.brave.com to be verifiably associated with this extension.
     * https://developer.chrome.com/docs/extensions/mv3/settings_override/#search_provider
     */

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
