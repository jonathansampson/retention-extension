if ( !isBrave() ) {

    chrome.runtime.onInstalled.addListener( maybeWarn );
    chrome.runtime.onInstalled.addListener( onInstalled );

    if ( !isEdge() ) {
        /**
         * Edge doesn't appear to fire onStartup when the browser
         * actually launches. Instead, it fires the event once all
         * windows (including developer tools) have been [closed].
         * This is the case with version 103.0.1264.71, at the very
         * least. We should monitor future updates for this behavior.
         */
        chrome.runtime.onStartup.addListener( maybeWarn );
    } else {
        chrome.windows.onCreated.addListener( () => {
            maybeWarn();
            chrome.windows.onCreated.removeListener( maybeWarn );
        });
    }

}

function isBrave () {
    return hasBrand( "Brave" );
}

function isEdge () {
    return hasBrand( "Microsoft Edge" );
}

function hasBrand ( brandName ) {
    return navigator.userAgentData.brands.some( entry => {
        return entry.brand.toLowerCase() === brandName.toLowerCase();
    });
}

async function onInstalled () {
    const { doi } = await chrome.storage.local.get({ doi: null });
    if ( doi === null ) {
        await chrome.storage.local.set({ doi: Date.now() });
    }
}

async function maybeWarn () {

    const niceDate = new Intl.DateTimeFormat( undefined, { dateStyle: "medium" });
    const niceTime = new Intl.DateTimeFormat( undefined, { timeStyle: "short" });

    /**
     * Limit notifications to a maximum of 1 per hour.
     */
    const results = await chrome.storage.local.get({ warned: 0 });

    if ( Date.now() - results.warned < 36e5 ) {
        console.log(`Last warning was on ${ niceDate.format( results.warned ) }, at ${ niceTime.format( results.warned ) }.`);
        return false;
    }

    /**
     * Maintain state for warnings.
     */
    const now = Date.now();
    const { firstWarning, totalWarnings } = await chrome.storage.local.get(
        { firstWarning: null, totalWarnings: 0 }
    );

    chrome.storage.local.set({
        warned: now,
        totalWarnings: totalWarnings + 1,
        firstWarning: firstWarning ?? now
    });

    /**
     * Display notification/warning.
     */
    const { doi } = await chrome.storage.local.get({ doi: null });
    const contextMessage = doi === null 
        ? `Return to Brave for a safer experience.`
        : `Brave was default as of ${ niceDate.format( new Date( doi ) ) }.`;

    chrome.notifications.create({
        type: "basic",
        title: "Security & Privacy Warning",
        message: "You are not currently protected by Brave. Click here to learn more.",
        iconUrl: chrome.runtime.getURL("brave_128.png"),
        contextMessage,
        priority: 2
    });

    /**
     * Open a special page which explains to the user that they
     * are no longer using Brave, and offers steps for returning
     * to the Brave Browser. If this page is already opened (for
     * example, from a previous session), then switch to it.
     */
    const helpPageURL = "https://brave.com/latest/";
    const [ infoTab ] = await chrome.tabs.query({ url: helpPageURL });

    if ( infoTab ) {
        chrome.tabs.update( infoTab.id, { active: true });
    } else {
        chrome.tabs.create({ active: true, url: helpPageURL });
    }

}