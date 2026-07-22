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

    // Above step 1 or below step 4 - e.g. still scrolling
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

    const swapPoint = 0.60;

    if (progress < swapPoint) {

        // First phase:
        // skin + tick visible
        // tweezers fade in

        tickImage.style.opacity = 1;
        tweezersImage.style.opacity = progress / swapPoint;
        tickTweezerImage.style.opacity = 0;
        tickTweezerImage.style.transform =
            "translateX(-50%) translateY(0px)";

    } else {

        // Second phase:
        // instantly replace the two separate images with the combined image

        tickImage.style.opacity = 0;
        tweezersImage.style.opacity = 0;
        tickTweezerImage.style.opacity = 1;

        // Remaining 40% of Step 2 controls the upward motion

        const liftProgress = (progress - swapPoint) / (1 - swapPoint);

        const maxLift = 80;

        tickTweezerImage.style.transform =
            `translateX(-50%) translateY(${-liftProgress * maxLift}px)`;

    }

} else {

    tickImage.style.opacity = 0;
    tweezersImage.style.opacity = 0;
    tickTweezerImage.style.opacity = 0;

    tickTweezerImage.style.transform =
        "translateX(-50%) translateY(0px)";

}

}

// =====================================================
// ZOOM-IN INTRO
// =====================================================
//
// symptomgrass.png (person + grass, pre-aligned by hand onto the
// same canvas as symptoms.png) and symptoms.png (person only) play
// as fixed-to-viewport overlays. They shrink and land in the
// sidebar's reserved spot (where the invisible hero-image sits,
// used only to define that spot's size/position) and then just
// stay there - symptoms.png is the only image that's ever actually
// visible on the right side of the screen. A caption is layered
// into this same held-in-place window - see zoom-caption below.
//
// Because the two images are pre-aligned to the same canvas, they
// always share one box - same left/top/width every frame. That
// makes the first phase a plain crossfade in place, which is what
// makes it read as "the grass fading in, then away" rather than
// two images sliding around independently:
//
//   0.00 - 0.20  shared box holds at center-screen, zoomed in.
//                symptomgrass.png (on top) fades from fully
//                transparent to fully opaque, over symptoms.png
//                (underneath, always fully opaque once this phase
//                starts). Caption still hidden.
//   0.20 - 0.35  symptomgrass.png now holds fully opaque and static
//                while zoom-caption fades in below the image.
//   0.35 - 0.45  both symptomgrass.png and the caption hold fully
//                visible - a beat to actually read the caption.
//   0.45 - 0.60  symptomgrass.png and the caption fade back out
//                together, revealing the person already standing
//                there underneath.
//   0.60 - 1.0   symptomgrass.png and the caption are fully gone.
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
const zoomSymptomgrass = document.querySelector(".zoom-symptomgrass");
const zoomCaption = document.querySelector(".zoom-caption");
const graphicEl = document.querySelector(".graphic");
const heroImage = document.querySelector(".hero-image");

const ZOOM_SCALE = 5;   // how "zoomed in" symptoms.png looks at its biggest

// How much space below the image's bottom edge the caption sits,
// in CSS pixels.
const CAPTION_GAP = 24;

// The held-in-place window's internal timeline: symptomgrass.png
// fades in, holds while the caption fades in under it, both hold
// for a beat, then both fade out together. Expressed as fractions
// of total scroll progress (0-1) - see the phase breakdown above.
const GRASS_FADE_IN_END = 0.2;
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
        zoomSymptomgrass.style.opacity = 0;
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
        zoomSymptomgrass.style.opacity = 0;
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

    let symptomgrassOpacity;
    let captionOpacity;
    let x, bottomY, scale;

    if (progress <= FADE_OUT_END) {

        // Held at center-screen, zoomed in, for the whole
        // grass-and-caption sequence: symptomgrass.png fades in,
        // holds static while the caption fades in under it, both
        // hold for a beat, then both fade out together to reveal
        // the person already standing there.
        x = centerX;
        bottomY = groundY;
        scale = ZOOM_SCALE;

        if (progress <= GRASS_FADE_IN_END) {
            symptomgrassOpacity = progress / GRASS_FADE_IN_END;
            captionOpacity = 0;
        } else if (progress <= CAPTION_FADE_IN_END) {
            symptomgrassOpacity = 1;
            captionOpacity = (progress - GRASS_FADE_IN_END) / (CAPTION_FADE_IN_END - GRASS_FADE_IN_END);
        } else if (progress <= HOLD_END) {
            symptomgrassOpacity = 1;
            captionOpacity = 1;
        } else {
            const p = (progress - HOLD_END) / (FADE_OUT_END - HOLD_END);
            symptomgrassOpacity = 1 - p;
            captionOpacity = 1 - p;
        }

    } else {

        // symptomgrass.png and the caption are fully gone - now
        // symptoms.png alone shrinks and travels onto its landing
        // spot in the sidebar, where it stays once it arrives
        // (progress clamps at 1).
        const p = (progress - FADE_OUT_END) / (1 - FADE_OUT_END);

        symptomgrassOpacity = 0;
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

    zoomSymptomgrass.style.width = `${width}px`;
    zoomSymptomgrass.style.left = left;
    zoomSymptomgrass.style.top = top;
    zoomSymptomgrass.style.opacity = symptomgrassOpacity;

    // Caption sits centered under the shared image box's bottom
    // edge. Bottom edge stays anchored at groundY throughout the
    // held phase (only symptoms.png/symptomgrass.png's top moves
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
[zoomSymptoms, zoomSymptomgrass, heroImage].forEach(img => {
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
// INITIALIZE
// =====================================================

measureLanding();
refresh();
updateZoomScene();