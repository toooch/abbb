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
    setInterval(blockVideoAds(), 50);
    setInterval(blockStaticAds(), 50);
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
