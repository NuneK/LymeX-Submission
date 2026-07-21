// =====================================================
// MARKERS THAT BELONG TO EACH STEP
// =====================================================

const sectionMarkers = {
    "1": ["m1", "m2"],
    "1c": ["m9", "m10"],
    "2": ["m3", "m4"],
    "3": ["m5", "m6"],
    "4": ["m7", "m8"]
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

function refresh() {

    const activeEl = resolveActiveStep();

    steps.forEach(step => step.classList.remove("active"));

    if (!activeEl) {
        if (currentMarkerKey !== null) {
            currentMarkerKey = null;
            showMarkers(null);
        }
        currentStep = null;
        return;
    }

    activeEl.classList.add("active");
    currentStep = activeEl.dataset.step;

    // Markers for step 1: the first two text chunks still share
    // the original pair (m1/m2); only the new third chunk swaps
    // in its own pair (m9/m10).
    let markerKey = currentStep;

    if (currentStep === "1") {

        const substate = resolveStepOneSubstate();

        stepOneTexts[0].classList.toggle("active-text", substate === "1a");
        stepOneTexts[1].classList.toggle("active-text", substate === "1b");
        stepOneTexts[2].classList.toggle("active-text", substate === "1c");

        markerKey = substate === "1c" ? "1c" : "1";

    }

    if (markerKey !== currentMarkerKey) {
        currentMarkerKey = markerKey;
        showMarkers(markerKey);
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
// visible on the right side of the screen.
//
// Because the two images are pre-aligned to the same canvas, they
// always share one box - same left/top/width every frame. That
// makes the first phase a plain crossfade in place, which is what
// makes it read as "the grass fading in, then away" rather than
// two images sliding around independently:
//
//   0.00 - 0.25  shared box holds at center-screen, zoomed in.
//                symptomgrass.png (on top) fades from fully
//                transparent to fully opaque, over symptoms.png
//                (underneath, always fully opaque once this phase
//                starts).
//   0.25 - 0.5   still held in place; symptomgrass.png now fades
//                from opaque back to transparent, revealing the
//                person already standing there underneath.
//   0.5  - 1.0   symptomgrass.png is fully gone. Only now does
//                symptoms.png shrink and travel from center-screen
//                onto the sidebar's reserved spot, landing exactly
//                on it and staying there.
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
const graphicEl = document.querySelector(".graphic");
const heroImage = document.querySelector(".hero-image");

const ZOOM_SCALE = 5;   // how "zoomed in" symptoms.png looks at its biggest

// symptomgrass.png's opacity arc within the first half of the
// zoom sequence: invisible -> fades in to full opacity -> fades
// back out. Expressed as fractions of total scroll progress (0-1).
const GRASS_FADE_IN_END = 0.25;
const GRASS_FADE_OUT_END = 0.5;

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
        return;
    }

    const progress = clamp(-rect.top / scrollable, 0, 1);

    // Both overlays are pre-aligned to the same canvas, so they
    // always get the identical box - x is the shared horizontal
    // center, groundY is the y-coordinate their bottom edges sit on.
    const centerX = window.innerWidth / 2;
    const groundY = window.innerHeight / 2;

    let symptomgrassOpacity;
    let x, bottomY, scale;

    if (progress <= GRASS_FADE_OUT_END) {

        // Held at center-screen, zoomed in, while symptomgrass.png
        // plays its opacity arc on top of symptoms.png (underneath,
        // always fully opaque): fades in from nothing, then - once
        // fully visible - fades back out to reveal the person
        // already standing there.
        x = centerX;
        bottomY = groundY;
        scale = ZOOM_SCALE;

        if (progress <= GRASS_FADE_IN_END) {
            symptomgrassOpacity = progress / GRASS_FADE_IN_END;
        } else {
            const p = (progress - GRASS_FADE_IN_END) / (GRASS_FADE_OUT_END - GRASS_FADE_IN_END);
            symptomgrassOpacity = 1 - p;
        }

    } else {

        // symptomgrass.png is fully gone - now symptoms.png alone
        // shrinks and travels onto its landing spot in the sidebar,
        // where it stays once it arrives (progress clamps at 1).
        const p = (progress - GRASS_FADE_OUT_END) / (1 - GRASS_FADE_OUT_END);

        symptomgrassOpacity = 0;

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