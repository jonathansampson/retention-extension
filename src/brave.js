if ( isBrave() ) {

    /**
     * If the user has somehow installed this extension within
     * the Brave Browser, we'll auto-uninstall.
     */

     chrome.management.uninstallSelf();

} else {

    chrome.runtime.onInstalled.addListener( maybeWarn );
    chrome.runtime.onInstalled.addListener( onInstalled );

    if ( !isEdge() ) {
        chrome.runtime.onStartup.addListener( maybeWarn );
    } else {
        /**
         * Edge doesn't appear to fire onStartup when the browser
         * actually launches. Instead, it fires the event once all
         * windows (including developer tools) have been [closed].
         * This is the case with version 103.0.1264.71, at the very
         * least. We should monitor future updates for this behavior.
         * 
         * Due to this limitation, we'll warn only after the first
         * window-creation event has been detected. Afterwards, no
         * more warnings.
         */
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

async function getBrowserNameAndVersion () {

    const results = {
        name: undefined,
        version: undefined
    };

    for ( let entry of navigator.userAgentData.brands ) {

        if ( /^chromium$/i.test( entry.brand ) ) {
            results.base = {
                chromium: true,
                version: entry.version
            };
        } else if ( !/^.*not.*a.*brand.*$/i.test( entry.brand ) ) {
            results.name = entry.brand;
            results.version = entry.version;
        }

    }

    /**
     * It's possible that we still have not identified the
     * browser. Vivaldi 5.3.2679.70, for example, does not
     * provide a brand entry in navigator.userAgentData. It
     * does, however, attach a vivExtData property to tabs.
     * 
     * https://github.com/borsini/chrome-otto-tabs/pull/11#issue-1268032745
     */
    if ( !results.name ) {
        const [ sampleTab ] = await chrome.tabs.query({});
        if ( sampleTab.vivExtData ) results.name = "Vivaldi";
    }

    return results;

}

async function onInstalled () {
    const { doi } = await chrome.storage.local.get({ doi: null });
    if ( doi === null ) {
        await chrome.storage.local.set({ doi: Date.now() });
    }
}

const utils = {
    niceTime: new Intl.DateTimeFormat( undefined, { timeStyle: "short" }),
    niceDate: new Intl.DateTimeFormat( undefined, { dateStyle: "medium" })
};

async function maybeWarn () {

    /**
     * A browser may be running in the background, meaning
     * no windows are visible. Don't show notifications if
     * this is the case.
     */
    const windows = await chrome.windows.getAll({ populate: true });
    if ( windows.length < 1 ) return;

    /**
     * Limit notifications to a maximum of 1 per hour.
     */
    const results = await chrome.storage.local.get({ warned: 0 });

    if ( Date.now() - results.warned < 36e5 ) {
        let d = utils.niceDate.format( results.warned );
        let t = utils.niceTime.format( results.warned );
        console.log(`Last Warned: ${ d }, at ${ t }.`);
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
    const doiDate = niceDate.format( new Date( doi ) );
    const contextMessage = doi === null 
        ? chrome.i18n.getMessage("warning_return")
        : chrome.i18n.getMessage("brave_last_default", [ doiDate ]);

    chrome.notifications.create({
        type: "basic",
        title: chrome.i18n.getMessage("warning_title"),
        message: chrome.i18n.getMessage("warning_body"),
        iconUrl: chrome.runtime.getURL("brave_128.png"),
        contextMessage,
        priority: 2
    });

    chrome.notifications.onClicked.addListener( async notificationId => {
        chrome.notifications.clear( notificationId );
        /**
         * Open a special page which explains to the user that they
         * are no longer using Brave, and offers steps for returning
         * to the Brave Browser. If this page is already opened (for
         * example, from a previous session), then switch to it.
         */
        const helpPageURL = "https://support.brave.com/hc/en-us/articles/360020406572-How-do-I-set-Brave-to-be-my-Default-Browser-";
        const [ infoTab ] = await chrome.tabs.query({ url: helpPageURL });
    
        if ( infoTab ) {
            chrome.tabs.update( infoTab.id, { active: true });
        } else {
            chrome.tabs.create({ active: true, url: helpPageURL });
        }
    });

}