// ==UserScript==
// @name         Adblockerblockerblocker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Verwijdert de nieuwe YouTube adblocker-blocker
// @author       Tooch
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

(function() {

    const config = {
        adblock: true,
        popupRemove: true,
        jsonPaths: [
            'playerResponse.adPlacements',
            'playerResponse.playerAds',
            'adPlacements',
            'playerAds',
            'playerConfig',
            'auxiliaryUi.messageRenderers.enforcementMessageViewModel'
        ],
        domains: [
            '*.youtube-nocookie.com/*'
        ],
        observerConfig: {
            childList: true,
            subtree: true
        },
        keyEvent: new KeyboardEvent("keydown", {
            key: "k",
            code: "KeyK",
            keyCode: 75,
            which: 75,
            bubbles: true,
            cancelable: true,
            view: window
        }),
        mouseEvent: new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
        }),
        unpauseState: 0
    }

    function query(el) {
        return document.querySelector(el);
    }

    if (config[adblock]) {
        addBlocker();
    }
    if (config[popupRemove]) {
        popupRemover();
    }

    function popupRemover() {
        config[jsonPaths].forEach(jsonPath => {
            removeJsonPath(config[domains], jsonPath);
        });

        setInterval(() => {
            const fsB = query(".ytp-fullscreen-button");
            const mo = query("tp-yt-iron-overlay-backdrop");
            const pu = queryr(".style-scope ytd-enforcement-message-view-model");
            const puB = query("#dismiss-button");

            const v1 = query("#movie_player > video.html5-main-video");
            const v2 = query("#movie_player > .html5-video-container > video");

            const bs = document.body.style;

            bs.setProperty('overflow-y', 'auto', 'important');

            if (mo) {
                mo.removeAttribute("opened");
                mo.remove();
            }

            if (pu) {
                if (puB) {
                    puB.click();
                }

                pu.remove();
                config[unpauseState] = 2;

                fsB.dispatchEvent(config[mouseEvent]);

                setTimeout(() => {
                    fsB.dispatchEvent(config[mouseEvent]);
                }, 500);

                setTimeout(() => {
                    location.reload();
                }, 100);
            }

            // Check de unpause status nadat de popup is verwijderd.
            if (!config[unpauseState] > 0) return;

            // Haal de video van pauze af.
            unPauseVideo(v1);
            unPauseVideo(v2);

        }, 1000)
    }

    function addBlocker() {
        const css =
            `
            .ad-showing, .videoAdUiSkipButton, .ytp-ad-skip-button, .ytp-ad-skip-button-modern { display: none; }
            ytd-action-companion-ad-renderer { display: none; }
            div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint { display: none; }
            div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer { display: none; }
            div#main-container.style-scope.ytd-promoted-video-renderer { display: none; }
            ytd-in-feed-ad-layout-renderer { display: none; }
            .ytd-video-masthead-ad-v3-renderer { display: none; }
            ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"] { display: none; }
            ytd-merch-shelf-renderer { display: none; }
            .ytd-banner-promo-renderer { display: none; }
            ytd-statement-banner-renderer { display: none; }
        `;
        const h = document.head || query('head')[0];
        const se = document.createElement('style');
        se.innerHTML = css;
        h.appendChild(se);

        handleAds();

        if (!getGotItState()) {
            document.body.insertAdjacentHTML("beforeend", addCss() + addHtml());

            const modal = query("#myModal");
            const span = query(".close")[0];

            modal.style.display = "block";

            span.onclick = function () {
                modal.style.display = "none";
            }

            query('.gotIt').onclick = function () {
                setGotItState(true);
                modal.style.display = "none";
            }
        }
    }

    function handleAds() {
        const ars = [
            'ytd-action-companion-ad-renderer',
            'div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint',
            'div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer',
            'div#main-container.style-scope.ytd-promoted-video-renderer',
            'ytd-in-feed-ad-layout-renderer',
            '.ytd-video-masthead-ad-v3-renderer',
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
            'ytd-merch-shelf-renderer',
            '.ytd-banner-promo-renderer',
            'ytd-statement-banner-renderer',
        ];
        const ss = ['div#player-ads.style-scope.ytd-watch-flexy', 'div#panels.style-scope.ytd-watch-flexy'];
        const nvs = '.ytp-ad-skip-button-modern';

        const observerCallback = (mutationsList) => {
            config[jsonPaths].forEach(jsonPath => {
                removeJsonPath(config[domains], jsonPath);
            });
            for (const mutation of mutationsList) {
                if (mutation.addedNodes.length > 0) {
                    const video = query('video');
                    const skipBtn = query('.videoAdUiSkipButton, .ytp-ad-skip-button');
                    const ad = query('.ad-showing');

                    if (ad) {
                        video.playbackRate = 10;
                        video.volume = 0;
                        skipBtn?.click();
                    }

                    for (const removalSelector of ars) {
                        const el = query(removalSelector);
                        el?.remove();
                    }

                    const sponsorElements = document.querySelectorAll(ss.join(', '));
                    sponsorElements.forEach((element) => {
                        if (element.getAttribute("id") === "panels") {
                            element.childNodes?.forEach((childElement) => {
                                if (childElement.data?.targetId && childElement.data.targetId !== "engagement-panel-macro-markers-description-chapters") {
                                    //Skipping the Chapters section
                                    childElement.remove();
                                }
                            });
                        } else {
                            element.remove();
                        }
                    });

                    const nonVid = query(nvs);
                    nonVid?.click();
                }
            }
        };

        const observer = new MutationObserver(observerCallback);
        observer.observe(document.body, config[observerConfig]);
    }

    function unPauseVideo(video) {
        if (!video) return;
        if (video.paused) {
            document.dispatchEvent(keyEvent);
            config[unpauseState] = 0;
        } else if (config[unpauseState] > 0) config[unpauseState]--;
    }

    function removeJsonPath(domains, jsonPath) {
        const currentDomain = window.location.hostname;
        if (!domains.includes(currentDomain)) {
            return;
        }

        const pathParts = jsonPath.split('.');
        let obj = window;
        let previousObj = null;
        let tempObj = null;

        for (let part of pathParts) {
            if (obj.hasOwnProperty(part)) {
                previousObj = obj;
                tempObj = part;
                obj = obj[part];
            } else {
                break;
            }
        }

        if (previousObj && tempObj !== null) {
            previousObj[tempObj] = undefined;
        }
    }

    function getGotItState() {
        return localStorage.getItem('yAdbgotIt') === 'true';
    }

    function setGotItState(state) {
        localStorage.setItem('yAdbgotIt', state.toString());
    }

    function addCss() {
        return `
            <style>
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 99999;
                    padding-top: 100px;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background-color: rgb(0,0,0);
                    background-color: rgba(0,0,0,0.4);
                    font-size: 16px;
                    max-width: 500px;
                }

                .modal .content {
                     margin-top: 30px;
                }

                .modal-content {
                    background-color: #fefefe;
                    margin: auto;
                    padding: 20px;
                    border: 1px solid #888;
                    width: 80%;
                    border: 5px #f90000 solid;
                    border-radius: 10px;
                }

                .close {
                    color: #aaaaaa;
                    float: right;
                    font-size: 28px;
                    font-weight: bold;
                }

                .close:hover,
                .close:focus {
                    color: #000;
                    text-decoration: none;
                    cursor: pointer;
                }
            </style>
        `;
    }


    function addHtml() {
        return `
            <div id="myModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <div class="content">
                        <b> Adblocker-blocker-blocker </b>:<br>
                        Zet YouTube in de lijst met sites die je adblocker negeert. Deze extentie haalt zelf ook de advertenties weg.
                        <br><br>
                        <button class="gotIt">Top!</button>
                    </div>
                </div>

            </div>
        `;
    }
})();
