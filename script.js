// =====================================================
// MARKERS THAT BELONG TO EACH STEP
// =====================================================

const sectionMarkers = {
    "1a": ["m-1a-1", "m-1a-2", "m-1a-3", "m-1a-4", "m-1a-5", "m-1a-6", "m-1a-7"],
    "1b": ["m-1b-1", "m-1b-2", "m-1b-3", "m-1b-4", "m-1b-5"],
    "1c": ["m-1c-1", "m-1c-2", "m-1c-3", "m-1c-4", "m-1c-5", "m-1c-6"]
};

// =====================================================
// SHOW/HIDE MARKERS
// =====================================================

function showMarkers(step) {

    document.querySelectorAll(".marker").forEach(marker => {
        marker.classList.remove("visible");
    });

    if (!sectionMarkers[step]) return;

    sectionMarkers[step].forEach(id => {
        const marker = document.getElementById(id);

        if (marker) {
            marker.classList.add("visible");
        }
    });

}

// =====================================================
// STEP RESOLUTION
// =====================================================
//
// Rather than trusting IntersectionObserver's callback order
// (entries can arrive batched and out of document order on fast
// scrolls - especially noticeable scrolling back up - which was
// letting the wrong step "win" and desyncing the markers), this
// resolves the active step directly from geometry every time.
// That makes it a pure function of scroll position: it gives the
// same answer regardless of which direction you scrolled in or
// how many steps you skipped past to get there.

const steps = Array.from(document.querySelectorAll(".step"));

const stepOneSection = document.querySelector('.step[data-step="1"]');
const stepOneTexts = stepOneSection.querySelectorAll(".step-text");

const STEP_ONE_SWAP_1 = 1 / 3;
const STEP_ONE_SWAP_2 = 2 / 3;

const stepTwoSection = document.querySelector('.step[data-step="2"]');

const tickImage = document.getElementById("tick-image");
const tweezersImage = document.getElementById("tweezers-image");
const tickTweezerImage = document.getElementById("ticktweezer-image");
const baggieImage = document.getElementById("baggie-image");
const baggieTickImage = document.getElementById("baggie-tick-image");
const doctorImage = document.getElementById("doctor-image");

// How far above its resting spot (baggie.png's center) the mini
// tick starts, in pixels - it travels from here down to
// translateY(0) as baggieProgress goes 0 -> 1.
const BAGGIE_TICK_START_OFFSET = -200;

let currentStep = null;
let currentMarkerKey = null;

function resolveActiveStep() {

    const centerY = window.innerHeight / 2;

    for (const step of steps) {
        const rect = step.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            return step;
        }
    }

    // Above step 1 or below step 2 - e.g. still scrolling
    // through the intro sections above the scroller.
    const last = steps[steps.length - 1];
    if (last.getBoundingClientRect().bottom < centerY) return last;

    return null;

}

function resolveStepOneSubstate() {

    const rect = stepOneSection.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;

    if (scrollable <= 0) return "1a";

    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));

    if (progress >= STEP_ONE_SWAP_2) return "1c";
    if (progress >= STEP_ONE_SWAP_1) return "1b";
    return "1a";

}

// Same idea as resolveStepOneSubstate, but returns a continuous
// 0-1 value instead of a discrete substate - used to fade
// tweezers.png in on top of tick.png as the user scrolls through
// step 2 (see clamp() further down, defined via function
// declaration so it's available here regardless of file order).
function resolveStepTwoProgress() {

    const rect = stepTwoSection.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;

    if (scrollable <= 0) return 1;

    return clamp(-rect.top / scrollable, 0, 1);

}

function refresh() {

    const activeEl = resolveActiveStep();

    steps.forEach(step => step.classList.remove("active"));

    if (!activeEl) {
        if (currentMarkerKey !== null) {
            currentMarkerKey = null;
            showMarkers(null);
        }
        currentStep = null;
        graphicEl.classList.remove("step2-active");
        tweezersImage.style.opacity = 0;
        return;
    }

    activeEl.classList.add("active");
    currentStep = activeEl.dataset.step;

    // Markers for step 1: each of the three text chunks now has
    // its own independent marker set (1a/1b/1c), rather than the
    // first two sharing one.
    let markerKey = currentStep;

    if (currentStep === "1") {

        const substate = resolveStepOneSubstate();

        stepOneTexts[0].classList.toggle("active-text", substate === "1a");
        stepOneTexts[1].classList.toggle("active-text", substate === "1b");
        stepOneTexts[2].classList.toggle("active-text", substate === "1c");

        markerKey = substate;

    }

    if (markerKey !== currentMarkerKey) {
        currentMarkerKey = markerKey;
        showMarkers(markerKey);
    }

    // Step 2 swaps symptoms.png out for the skin.png/tick.png stack
    // - see .graphic.step2-active in style.css. tweezers.png then
    // fades in on top of tick.png as the user scrolls through the
    // step, tracking scroll position directly (like the zoom-in
    // intro) rather than a fixed transition, so it can move back
    // and forth with the scrollbar.
    graphicEl.classList.toggle("step2-active", currentStep === "2");

    if (currentStep === "2") {

    const progress = resolveStepTwoProgress();

    const swapPoint = 0.35;
    const liftEnd = 0.55;
    const baggieEnd = 0.8;

    if (progress < swapPoint) {

        // First phase:
        // skin + tick visible
        // tweezers fade in

        tickImage.style.opacity = 1;
        tweezersImage.style.opacity = progress / swapPoint;
        tickTweezerImage.style.opacity = 0;
        tickTweezerImage.style.transform =
            "translateX(-50%) translateY(0px)";
        baggieImage.style.opacity = 0;
        baggieTickImage.style.opacity = 0;
        baggieTickImage.style.transform =
            `translateX(-50%) translateY(${BAGGIE_TICK_START_OFFSET}px)`;
        doctorImage.style.opacity = 0;

    } else {

        // Second phase:
        // instantly replace the two separate images with the combined image

        tickImage.style.opacity = 0;
        tweezersImage.style.opacity = 0;
        tickTweezerImage.style.opacity = 1;

        // Between swapPoint and liftEnd controls the upward motion.
        // Clamped so the lift finishes exactly at liftEnd and holds
        // there (rather than continuing to creep upward) through
        // the third phase below.

        const liftProgress = clamp(
            (progress - swapPoint) / (liftEnd - swapPoint), 0, 1
        );

        const maxLift = 80;

        tickTweezerImage.style.transform =
            `translateX(-50%) translateY(${-liftProgress * maxLift}px)`;

        // Third phase: once ticktweezer.png has fully finished
        // lifting (progress past liftEnd), baggie.png fades in over
        // the middle third of the right column - see #baggie-image
        // in style.css. The mini tick travels down from above into
        // baggie's center over the same span, ending up tucked
        // behind it (see #baggie-tick-image's z-index in style.css).
        // This phase runs until baggieEnd, handing off to the
        // fourth phase below.

        if (progress <= liftEnd) {
            baggieImage.style.opacity = 0;
            baggieTickImage.style.opacity = 0;
            baggieTickImage.style.transform =
                `translateX(-50%) translateY(${BAGGIE_TICK_START_OFFSET}px)`;
            doctorImage.style.opacity = 0;
        } else {
            const baggieProgress = clamp(
                (progress - liftEnd) / (baggieEnd - liftEnd), 0, 1
            );
            baggieImage.style.opacity = baggieProgress;

            baggieTickImage.style.opacity = baggieProgress;
            const tickY = lerp(BAGGIE_TICK_START_OFFSET, 0, baggieProgress);
            baggieTickImage.style.transform =
                `translateX(-50%) translateY(${tickY}px)`;

            // Fourth phase: once the mini tick has fully finished
            // traveling into baggie.png (progress past baggieEnd),
            // doctor.png fades in over the remaining scroll distance
            // in the lower third of the right column - see
            // #doctor-image in style.css.

            if (progress <= baggieEnd) {
                doctorImage.style.opacity = 0;
            } else {
                const doctorProgress =
                    (progress - baggieEnd) / (1 - baggieEnd);
                doctorImage.style.opacity = doctorProgress;
            }
        }

    }

} else {

    tickImage.style.opacity = 0;
    tweezersImage.style.opacity = 0;
    tickTweezerImage.style.opacity = 0;
    baggieImage.style.opacity = 0;
    baggieTickImage.style.opacity = 0;
    baggieTickImage.style.transform =
        `translateX(-50%) translateY(${BAGGIE_TICK_START_OFFSET}px)`;
    doctorImage.style.opacity = 0;

    tickTweezerImage.style.transform =
        "translateX(-50%) translateY(0px)";

}

}

// =====================================================
// ZOOM-IN INTRO
// =====================================================
//
// wtick.png (a tick, pre-aligned by hand onto the same canvas as
// symptoms.png) and symptoms.png (person only) play as
// fixed-to-viewport overlays. They shrink and land in the
// sidebar's reserved spot (where the invisible hero-image sits,
// used only to define that spot's size/position) and then just
// stay there - symptoms.png is the only image that's ever actually
// visible on the right side of the screen. A caption is layered
// into this same held-in-place window - see zoom-caption below.
//
// Because the two images are pre-aligned to the same canvas, they
// always share one box - same left/top/width every frame. That
// makes the first phase a plain crossfade in place, which is what
// makes it read as "the tick fading in, then away" rather than
// two images sliding around independently:
//
//   0.00 - 0.20  shared box holds at center-screen, zoomed in.
//                wtick.png (on top) fades from fully
//                transparent to fully opaque, over symptoms.png
//                (underneath, always fully opaque once this phase
//                starts). Caption still hidden.
//   0.20 - 0.35  wtick.png now holds fully opaque and static
//                while zoom-caption fades in below the image.
//   0.35 - 0.45  both wtick.png and the caption hold fully
//                visible - a beat to actually read the caption.
//   0.45 - 0.60  wtick.png and the caption fade back out
//                together, revealing the person already standing
//                there underneath.
//   0.60 - 1.0   wtick.png and the caption are fully gone.
//                Only now does symptoms.png shrink and travel from
//                center-screen onto the sidebar's reserved spot,
//                landing exactly on it and staying there.
//
// Before the spacer has actually been scrolled to, both overlays
// are kept fully hidden rather than sitting at their progress=0
// state - see the early-return in updateZoomScene() below.
//
// Driven directly off scroll position (not CSS transitions) so it
// tracks the scrollbar exactly, in both directions.

const zoomSpacer = document.querySelector(".zoom-spacer");
const zoomSymptoms = document.querySelector(".zoom-symptoms");
const zoomWtick = document.querySelector(".zoom-wtick");
const zoomCaption = document.querySelector(".zoom-caption");
const graphicEl = document.querySelector(".graphic");
const heroImage = document.querySelector(".hero-image");

const ZOOM_SCALE = 5;   // how "zoomed in" symptoms.png looks at its biggest

// How much space below the image's bottom edge the caption sits,
// in CSS pixels.
const CAPTION_GAP = 24;

// The held-in-place window's internal timeline: wtick.png
// fades in, holds while the caption fades in under it, both hold
// for a beat, then both fade out together. Expressed as fractions
// of total scroll progress (0-1) - see the phase breakdown above.
const TICK_FADE_IN_END = 0.2;
const CAPTION_FADE_IN_END = 0.35;
const HOLD_END = 0.45;
const FADE_OUT_END = 0.6;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function lerp(from, to, t) {
    return from + (to - from) * t;
}

// ---- Landing spot ----
//
// symptoms.png needs to shrink down onto exactly the spot reserved
// by the invisible hero-image in the sidebar, and then just stay
// there - so it reads as arriving at its final position rather than
// shrinking indefinitely or overshooting.
//
// baseWidth: symptoms.png's own rendered width at scale 1 (mirrors
// the 32vw / 420px cap it used to have in CSS).
// baseAspect: its natural height/width ratio, used to derive height
// from width at any scale.
//
// landing: the on-screen point + scale symptoms.png needs to reach
// to line up with the reserved spot. On desktop the sidebar is a
// full-height sticky column, so once pinned its vertical center
// always sits at the viewport's vertical center - true no matter
// where we are on the page right now, which lets us compute the
// landing spot up front. On mobile the sidebar isn't sticky, so we
// fall back to its current measured position instead.

let baseWidth = 0;
let baseAspect = 1;
let landing = { x: 0, bottomY: 0, scale: 1 };

function measureLanding() {

    baseWidth = Math.min(window.innerWidth * 0.32, 420);

    if (zoomSymptoms.naturalWidth) {
        baseAspect = zoomSymptoms.naturalHeight / zoomSymptoms.naturalWidth;
    }

    const heroRect = heroImage.getBoundingClientRect();
    const graphicRect = graphicEl.getBoundingClientRect();
    const graphicIsSticky = getComputedStyle(graphicEl).position === "sticky";

    const targetWidth = heroRect.width;
    const targetHeight = heroRect.height;

    const landingCenterY = graphicIsSticky
        ? window.innerHeight / 2
        : heroRect.top + heroRect.height / 2;

    landing = {
        x: graphicRect.left + graphicRect.width / 2,
        bottomY: landingCenterY + targetHeight / 2,
        scale: baseWidth ? targetWidth / baseWidth : 1
    };

}

function updateZoomScene() {

    const rect = zoomSpacer.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;

    if (scrollable <= 0) return;

    // Before the spacer's top has actually reached the viewport
    // top, the zoom sequence hasn't started yet - the user is
    // still on an earlier section (intro, map, etc.). Progress
    // would otherwise clamp to 0 here, which put both overlays at
    // full-size/center-screen opacity the whole time before the
    // user ever scrolled this far. Keep them fully hidden instead.
    if (rect.top > 0) {
        zoomSymptoms.style.opacity = 0;
        zoomWtick.style.opacity = 0;
        zoomCaption.style.opacity = 0;
        heroImage.style.opacity = 0;
        return;
    }

    const progress = clamp(-rect.top / scrollable, 0, 1);

    // Once fully landed, hand off from the fixed-position zoom
    // overlay to the in-place hero-image instead of continuing to
    // reposition the overlay every frame. hero-image lives inside
    // .image-wrapper - the same local stacking context as the
    // .marker elements - so from this point on its z-index actually
    // gets compared against the markers' directly, rather than
    // fighting a fixed-position element in a different stacking
    // context. Because measureLanding() sized/positioned the
    // overlay to exactly match heroImage's own rect, this swap
    // lands on the identical pixels and reads as instantaneous.
    if (progress >= 1) {
        zoomSymptoms.style.opacity = 0;
        zoomWtick.style.opacity = 0;
        zoomCaption.style.opacity = 0;
        heroImage.style.opacity = 1;
        return;
    }

    heroImage.style.opacity = 0;

    // Both overlays are pre-aligned to the same canvas, so they
    // always get the identical box - x is the shared horizontal
    // center, groundY is the y-coordinate their bottom edges sit on.
    const centerX = window.innerWidth / 2;
    const groundY = window.innerHeight / 2;

    let wtickOpacity;
    let captionOpacity;
    let x, bottomY, scale;

    if (progress <= FADE_OUT_END) {

        // Held at center-screen, zoomed in, for the whole
        // tick-and-caption sequence: wtick.png fades in,
        // holds static while the caption fades in under it, both
        // hold for a beat, then both fade out together to reveal
        // the person already standing there.
        x = centerX;
        bottomY = groundY;
        scale = ZOOM_SCALE;

        if (progress <= TICK_FADE_IN_END) {
            wtickOpacity = progress / TICK_FADE_IN_END;
            captionOpacity = 0;
        } else if (progress <= CAPTION_FADE_IN_END) {
            wtickOpacity = 1;
            captionOpacity = (progress - TICK_FADE_IN_END) / (CAPTION_FADE_IN_END - TICK_FADE_IN_END);
        } else if (progress <= HOLD_END) {
            wtickOpacity = 1;
            captionOpacity = 1;
        } else {
            const p = (progress - HOLD_END) / (FADE_OUT_END - HOLD_END);
            wtickOpacity = 1 - p;
            captionOpacity = 1 - p;
        }

    } else {

        // wtick.png and the caption are fully gone - now
        // symptoms.png alone shrinks and travels onto its landing
        // spot in the sidebar, where it stays once it arrives
        // (progress clamps at 1).
        const p = (progress - FADE_OUT_END) / (1 - FADE_OUT_END);

        wtickOpacity = 0;
        captionOpacity = 0;

        x = lerp(centerX, landing.x, p);
        bottomY = lerp(groundY, landing.bottomY, p);
        scale = lerp(ZOOM_SCALE, landing.scale, p);

    }

    const width = baseWidth * scale;
    const height = width * baseAspect;
    const left = `${x - width / 2}px`;
    const top = `${bottomY - height}px`;

    zoomSymptoms.style.width = `${width}px`;
    zoomSymptoms.style.left = left;
    zoomSymptoms.style.top = top;
    zoomSymptoms.style.opacity = 1;

    zoomWtick.style.width = `${width}px`;
    zoomWtick.style.left = left;
    zoomWtick.style.top = top;
    zoomWtick.style.opacity = wtickOpacity;

    // Caption sits centered under the shared image box's bottom
    // edge. Bottom edge stays anchored at groundY throughout the
    // held phase (only symptoms.png/wtick.png's top moves
    // to accommodate scale), so the caption doesn't jump around
    // while it fades in/out.
    zoomCaption.style.left = `${x}px`;
    zoomCaption.style.top = `${bottomY + CAPTION_GAP}px`;
    zoomCaption.style.opacity = captionOpacity;

}

// =====================================================
// SCROLL BINDING
// =====================================================

let ticking = false;

window.addEventListener("scroll", () => {

    if (ticking) return;

    ticking = true;

    requestAnimationFrame(() => {
        refresh();
        updateZoomScene();
        ticking = false;
    });

}, { passive: true });

let resizeTimeout;

window.addEventListener("resize", () => {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        measureLanding();
        updateZoomScene();
    }, 150);

});

// Image dimensions (and therefore the landing spot) aren't reliable
// until the images have actually loaded, so re-measure once they
// have in addition to the upfront measurement below.
[zoomSymptoms, zoomWtick, heroImage].forEach(img => {
    if (img.complete) {
        measureLanding();
    } else {
        img.addEventListener("load", () => {
            measureLanding();
            updateZoomScene();
        });
    }
});

// =====================================================
// MAP REGION HOVER
// =====================================================
//
// Each region file (newengland.png, PNW.png, etc.) is a filled,
// transparent-background silhouette of that region, sized and
// positioned identically to USmap.png - there's no vector shape to
// hit-test against, just these raster images. So each one gets
// drawn onto an offscreen canvas once, and hovering is resolved by
// checking whether the pixel under the cursor is opaque (inside the
// filled region) or transparent (outside it).

const mapImageWrapper = document.querySelector(".map-image-wrapper");
const usMapImage = document.getElementById("us-map-image");

const regionFiles = {
    newengland: "newengland.png",
    midatlantic: "midatlantic.png",
    southeast: "southeast.png",
    midwest: "midwest.png",
    southwest: "southwest.png",
    mountain: "mountain.png",
    pnw: "PNW.png",
    noncontinent: "noncontinental.png"
};

// Placeholder copy for each region - swap these for the real text
// whenever it's ready. Whatever key isn't hovered (including when
// the cursor isn't over any region at all) falls back to
// DEFAULT_MAP_TEXT, captured below from the paragraph's original
// markup.
const regionText = {
    newengland: "This region has the highest incidence of Lyme disease in the United States and accounts for over 60% of all nationwide cases. Blacklegged ticks are common, particularly in wooded and grassy areas. If you experienced a tick bite or developed symptoms after spending time outdoors, discuss Lyme disease with your healthcare provider.",
    midatlantic: "Lyme disease is also very common in this region, especially in Pennsylvania, New York, New Jersey, Maryland, Delaware, and Virginia. Risk is highest during late spring through early fall but exposure can occur year round. West Virginia has seen one of the highest surge rates (+236% increase in reported incidence).",
    southeast: "This region has a lower incidence of Lyme disease compared to other parts of the country. However, ticks are still present in wooded and grassy areas. If you experienced a tick bite or developed symptoms after spending time outdoors, discuss Lyme disease with your healthcare provider.",
    midwest: "Wisconsin and Minnesota report high numbers of Lyme disease cases each year. Ticks carrying Lyme disease are well established throughout much of this region.",
    southwest: "Lyme disease is uncommon across most hot, dry desert environments because these conditions are generally less favorable for the ticks that transmit it.",
    mountain: "Lyme disease is relatively uncommon overall, though localized areas of risk exist. Tick exposure can still occur, particularly during outdoor recreation.",
    pnw: "Lyme disease occurs primarily in northern coastal and foothill regions and accounts for under 1%-2% of total national cases. Overall risk is lower than in the Northeast, but exposure is possible after spending time in wooded or grassy habitats.",
    noncontinent: "Lyme disease is not considered established in Hawaii and Alaska. If you recently traveled to another region, your exposure risk may depend more on where you visited."
};

const mapTextElement = document.getElementById("map-text-content");
const DEFAULT_MAP_TEXT = mapTextElement ? mapTextElement.textContent : "";

const regionRasters = {}; // key -> { data, width, height }

function loadRegionRaster(key, filename) {

    return new Promise(resolve => {

        const img = new Image();

        img.onload = () => {

            try {

                const width = usMapImage.naturalWidth || img.naturalWidth;
                const height = usMapImage.naturalHeight || img.naturalHeight;

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                regionRasters[key] = {
                    data: ctx.getImageData(0, 0, width, height).data,
                    width,
                    height
                };

            } catch (err) {

                // Most likely cause: the page is being opened as a
                // file:// URL instead of served over http(s). Browsers
                // treat locally-loaded images as tainting the canvas,
                // which blocks getImageData with a SecurityError - so
                // without this catch, this promise would never resolve
                // and map hover would silently never turn on at all.
                console.error(
                    `Map hover: couldn't read pixels from images/${filename}. ` +
                    `If you're opening this file directly (file://) rather ` +
                    `than through a local server, that's almost certainly ` +
                    `why - canvas pixel reads are blocked for local files. ` +
                    `Try running a local server (e.g. "npx serve ." or ` +
                    `VS Code's Live Server) instead.`,
                    err
                );

            }

            resolve();

        };

        // Resolve even on a failed load so one bad file doesn't
        // block hover detection for every other region.
        img.onerror = () => {
            console.error(`Map hover: failed to load images/${filename}`);
            resolve();
        };

        img.src = `images/${filename}`;

    });

}

function isPointInsideRegion(key, x, y) {

    const region = regionRasters[key];
    if (!region) return false;

    const { data, width, height } = region;

    const px = Math.round(x);
    const py = Math.round(y);

    if (px < 0 || py < 0 || px >= width || py >= height) return false;

    const alpha = data[(py * width + px) * 4 + 3];

    return alpha > 10;

}

function setActiveRegion(activeKey) {

    Object.keys(regionFiles).forEach(key => {

        const overlay = document.getElementById(`region-${key}`);
        if (!overlay) return;

        overlay.classList.toggle("visible", key === activeKey);

    });

    if (mapTextElement) {
        mapTextElement.textContent =
            (activeKey && regionText[activeKey]) || DEFAULT_MAP_TEXT;
    }

}

function setUpMapHover() {

    if (!mapImageWrapper || !usMapImage) return;

    function loadRegionsAndListen() {

        const loading = Object.keys(regionFiles).map(
            key => loadRegionRaster(key, regionFiles[key])
        );

        Promise.all(loading).then(() => {

            mapImageWrapper.addEventListener("mousemove", event => {

                const naturalWidth = usMapImage.naturalWidth;
                const naturalHeight = usMapImage.naturalHeight;

                if (!naturalWidth || !naturalHeight) return;

                const wrapperRect = mapImageWrapper.getBoundingClientRect();

                // object-fit: contain math - the wrapper itself may be
                // a different aspect ratio than the image, so figure
                // out the actual rendered box of the image inside it
                // (accounting for letterboxing on the sides or top/
                // bottom) before converting the cursor position.

                const wrapperAspect = wrapperRect.width / wrapperRect.height;
                const imageAspect = naturalWidth / naturalHeight;

                let renderedWidth, renderedHeight, offsetX, offsetY;

                if (imageAspect > wrapperAspect) {
                    renderedWidth = wrapperRect.width;
                    renderedHeight = renderedWidth / imageAspect;
                    offsetX = 0;
                    offsetY = (wrapperRect.height - renderedHeight) / 2;
                } else {
                    renderedHeight = wrapperRect.height;
                    renderedWidth = renderedHeight * imageAspect;
                    offsetX = (wrapperRect.width - renderedWidth) / 2;
                    offsetY = 0;
                }

                const localX = event.clientX - wrapperRect.left - offsetX;
                const localY = event.clientY - wrapperRect.top - offsetY;

                if (
                    localX < 0 || localY < 0 ||
                    localX > renderedWidth || localY > renderedHeight
                ) {
                    setActiveRegion(null);
                    return;
                }

                const naturalX = (localX / renderedWidth) * naturalWidth;
                const naturalY = (localY / renderedHeight) * naturalHeight;

                const hoveredKey = Object.keys(regionFiles).find(
                    key => isPointInsideRegion(key, naturalX, naturalY)
                );

                setActiveRegion(hoveredKey || null);

            });

            mapImageWrapper.addEventListener("mouseleave", () => {
                setActiveRegion(null);
            });

        });

    }

    // The region canvases are sized off usMapImage's natural
    // dimensions, so make sure it has actually loaded first.
    if (usMapImage.complete && usMapImage.naturalWidth) {
        loadRegionsAndListen();
    } else {
        usMapImage.addEventListener("load", loadRegionsAndListen);
    }

}

setUpMapHover();

// =====================================================
// QUIZ NAVIGATION
// =====================================================
//
// "Start Quiz" and "Next" both work the same way: jump straight to
// the question (or the results section) named in their own
// data-next-question attribute, regardless of where the user has
// manually scrolled to. Neither tracks which question is "current"
// on screen - manual scrolling between questions still works
// independently of this. The selector below matches on
// data-question generically (not .quiz-question specifically) so
// it also reaches .quiz-results, whose "See Results" target is
// "results" rather than a number.
//
// Checkboxes need no JS of their own - they're plain inputs, so
// the browser already handles checked/unchecked state, and any
// number can be checked per question.

document.querySelectorAll(".quiz-next, .quiz-start").forEach(button => {

    button.addEventListener("click", () => {

        const nextNumber = button.dataset.nextQuestion;
        const nextQuestion = document.querySelector(
            `[data-question="${nextNumber}"]`
        );

        if (nextQuestion) {
            nextQuestion.scrollIntoView({ behavior: "smooth", block: "start" });
        }

    });

});

// =====================================================
// QUIZ RESULTS
// =====================================================
//
// Compiles every checked checkbox across all three questions into
// #symptoms-list. Runs immediately when "See Results" is clicked
// (so the list is ready before the scroll finishes) and also via
// IntersectionObserver whenever .quiz-results scrolls into view, so
// the list stays accurate if the user scrolls back, changes an
// answer, and returns manually instead of using the button.

const symptomsListEl = document.getElementById("symptoms-list");

function renderSymptomsList() {

    if (!symptomsListEl) return;

    const checkedBoxes = document.querySelectorAll(
        ".quiz-question .quiz-checkbox:checked"
    );

    symptomsListEl.innerHTML = "";

    if (checkedBoxes.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "symptoms-list-empty";
        emptyItem.textContent = "No symptoms selected.";
        symptomsListEl.appendChild(emptyItem);
        return;
    }

    checkedBoxes.forEach(checkbox => {
        const label = checkbox.nextElementSibling;
        const item = document.createElement("li");
        item.textContent = label ? label.textContent.trim() : "";
        symptomsListEl.appendChild(item);
    });

}

document.querySelector('.quiz-next[data-next-question="results"]')
    ?.addEventListener("click", renderSymptomsList);

const quizResultsSection = document.querySelector(".quiz-results");

if (quizResultsSection) {

    const resultsObserver = new IntersectionObserver(entries => {

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderSymptomsList();
            }
        });

    }, { threshold: 0.5 });

    resultsObserver.observe(quizResultsSection);

}

// =====================================================
// INITIALIZE
// =====================================================

measureLanding();
refresh();
updateZoomScene();