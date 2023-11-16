/*
* This script will be injected into the background of the running webpage.
*/

const buttonClass = "abbb-button";
const debug = true;
const knownVariations = ['1a', '1n', '2', '5', '6', 'q']

// Util functions for less typing

/**
 * Shorthand version of document.getElementById()
 * @param {string} id ID of the element to fetch
 * @returns {Element} Element
 */
function byId(id) {
    return document.getElementById(id);
}

/**
 * Shorthand version of document.getElementsByClassName()
 * @param {string} names Names of the class(es) to fetch
 * @returns {HTMLCollection} HTMLCollection
 */
function byClass(names) {
    return document.getElementsByClassName(names);
}

/**
 * Shorthand version of document.querySelector()
 * @param {string} selectors One or more selectors to match
 * @returns {Element} Element
 */
function query(selectors) {
    return document.querySelector(selectors);
}

/**
 * Shorthand version of document.querySelectorAll()
 * @param {string} selectors One or more selectors to match
 * @returns {NodeList} NodeList
 */
function queryAll(selectors) {
    return document.querySelectorAll(selectors);
}

var click = new MouseEvent("click", {
    "view": window,
    "bubbles": true,
    "cancelable": false
});

/**
 * Main function bundler
 * TODO: Tidy up
 */
function runContentScript() {
    
    // Add the toggle button to the youtube ui
    //// injectButton(buttonClass);

    // Grab our button for future use
    //// let btn = document.querySelector("."+buttonClass);

    // Update the button with the saved state once
    //// updateButtonState(btn);

    // Attach the click listener to the button
    //// attachListener(btn);

    setInterval(blockVideoAds(), 50);
    setInterval(blockStaticAds(), 50);

    // chrome.contextMenus.onClicked.addListener(genericOnClick);

}

/**
 * Inject a new button with given class name into the control bar of a YouTube video
 * @param {string} className 
 */
function injectButton(className) {
    const html = `
    <button class="${className} ytp-button" abbb-pressed="0" aria-keyshortcuts="b" data-priority="3" data-title-no-tooltip="ABBB" aria-pressed="false" aria-label="ABBB shortcut b" style title="ABBB (b)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g>
            <path fill="none" d="M0 0h24v24H0z"/>
            <path fill-rule="nonzero" d="M21 3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm-1 2H4v14h16V5zM9.399 8l3.199 8h-2.155l-.4-1h-3.29l-.4 1H4.199l3.2-8h2zM19 8v8h-3a3 3 0 0 1 0-6h.999L17 8h2zm-2 4h-1a1 1 0 0 0-.117 1.993L16 14h1v-2zm-8.601-1.115L7.552 13h1.692l-.845-2.115z"/>
        </g>
    </svg>
    </button>
    `;

    let rightControls = document.querySelector(".ytp-right-controls");
    rightControls?.insertAdjacentHTML("afterbegin", html);

    const css = `
    <style>
    .${className}[abbb-pressed="0"] svg { filter: invert(100%) sepia(91%) saturate(139%) hue-rotate(186deg) brightness(108%) contrast(87%); margin: 15%; transition: all 0.5s; }
    .${className}[abbb-pressed="1"] svg { filter: invert(15%) sepia(100%) saturate(6890%) hue-rotate(355deg) brightness(101%) contrast(117%); margin: 15%; transition: all 0.5s; }
    .${className} {  }
    </style>
    `;

    let head = document.head || document.documentElement;
    head.insertAdjacentHTML("beforeend", css);
}

/**
 * Update the state of the given element with the stored data
 * @param {string} el 
 */
function updateButtonState(el) {
    chrome.storage.local.get({abbb_enable: 1}).then((result) => {
        el?.setAttribute("abbb-pressed", result.abbb_enable);
    });
}

/**
 * Attach an event listener to the given element
 * @param {string} el 
 */
function attachListener(el) {
    el?.addEventListener('click', () => {
        toggleState(el);
    });
}

/**
 * Toggle the abbb-state of the given element
 * @param {string} el 
 */
function toggleState(el) {
    // if (el != undefined) {
        let btn = el;
        let state = btn.getAttribute("abbb-pressed");

        if (state == 0) { // turn on
            btn.setAttribute("abbb-pressed", 1);
            chrome.storage.local.set({ abbb_enable: 1 });
        } else { // turn off
            btn.setAttribute("abbb-pressed", 0);
            chrome.storage.local.set({ abbb_enable: 0 });
        }
    // }
}


/**
 * Blocks static ads on a YouTube webpage
 * @param {Object} details 
 */
function blockStaticAds(details = { blockFeed: true, blockCompanions: true, blockPanels: true }) {
    
    // Feed ads are put on the landing page, snug fit between thumbnails of real, recommended videos.
    if (details.blockFeed) {
        const feedAds = document.querySelectorAll("ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer");

        feedAds?.forEach((feedAd) => {
            feedAd.remove();
            debugLog("STATIC feed ad removed");
        });
    }

    // Companion ads and engagement panels are put on a video page, usually on top of the list of videos you can watch next, or
    // between them and the reactions on devices with a smaller screen.

    if (details.blockCompanions) {
        // Companion ads
        const slotCompanions = document.querySelectorAll("ytd-companion-slot-renderer");

        slotCompanions?.forEach((companionAd) => {
            companionAd.remove();
            debugLog("STATIC companion ad removed");
        });
    }

    if (details.blockPanels) {
        // Engagement panels
        const engagementPanels = document.querySelectorAll("ytd-engagement-panel-section-list-renderer");

        engagementPanels?.forEach((engagementPanel) => {

            for (const attr of engagementPanel.attributes) {
                if (attr.name == "style") {
                    const panelParent = engagementPanel.parentElement;
                    panelParent.remove();
                    debugLog("STATIC engagement panel removed");
                }
            }
        });
    }
}

/**
 * Blocks ads in videos
 * @param {string[]} knownVariations 
 */
function blockVideoAds(knownVariations) {
    // Check if we are watching a video
    if (!window.location.toString().includes("watch?")) return;

    // Get the global player
    const mp = byId("movie_player");

    // Check if there is currently an ad playing
    const isAd = mp.classList.contains("ad-interrupting");
    if (isAd) {

        // Get the video stream
        const vs = byClass("video-stream")[0];

        // Check the video stream's existence
        if (vs && vs.duration) {

            // Set the progress of the video stream to the end.
            vs.currentTime = vs.duration;

            // Get the skip ad button, or, if we can't find it, try the modern one.
            for (const button of document.getElementsByClassName("ytp-ad-skip-button")) {
                button.click();
                debugLog("VIDEO ad skipped\nnormal button");
            }

            for (const button of document.getElementsByClassName("ytp-ad-skip-button-modern")) {
                button.click();
                debugLog("VIDEO ad skipped\nmodern button");
            }

            // Get the skip ad button, or, if we can't find it, try the modern one.
            const buttonVariations = knownVariations;
            buttonVariations.forEach((variation) => {
                let skipButton = byId("skip-button:" + variation);
                if (typeof skipButton !== undefined) {
                    skipButton.dispatchEvent(click);
                    debugLog(`VIDEO ad skipped\nbutton variation ${variation} used`);
                }
            });
        }

    }
}

// function genericOnClick(info) {
//     switch (info.menuItemId) {
//         case 'debugEnable':
//             debug = true;
//             break;

//         case 'debugDisable':
//             debug = false;
//             break;
//     }
// }

/**
 * Logs the given message when the debug mode is turned on
 * @param {string} msg Debug message to display
 */
function debugLog(msg) {
    if (debug) {
        console.log(`ABBB DEBUG MODE:\n${msg}`);
    }
}

/**
 * New mutation observer to handle mutations
 * @param {function} callback 
 */
function addLocationObserver(callback) {

    // Options for the observer (which mutation to observer)
    const config = { attributes: false, childList: true, subtree: false };

    // Create an observer instance linked to the callback function 
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(document.body, config);
}

function observerCallback() {

    if (window.location.href.startsWith("https://www.youtube.")) {
        runContentScript()
    }
}

addLocationObserver(observerCallback);
observerCallback();