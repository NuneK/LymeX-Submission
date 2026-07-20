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
// ZOOM TRANSITION SCENE
// =====================================================
//
// Two phases across this section's own scroll range:
//   0.0 - 0.5  symptoms.png (zoomed in) + grass.png fade in together
//   0.5 - 1.0  grass.png fades back out while symptoms.png shrinks
//              from its zoomed-in scale down to its resting size
//
// Driven directly off scroll position (not CSS transitions) so it
// tracks the scrollbar exactly, in both directions.

const zoomScene = document.querySelector(".zoom-scene");
const zoomStage = document.querySelector(".zoom-stage");
const zoomSymptoms = document.querySelector(".zoom-symptoms");
const zoomGrass = document.querySelector(".zoom-grass");
const graphicEl = document.querySelector(".graphic");
const heroImage = document.querySelector(".hero-image");

const ZOOM_SCALE = 5;   // how "zoomed in" symptoms.png looks at its biggest

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function lerp(from, to, t) {
    return from + (to - from) * t;
}

// =====================================================
// LANDING SPOT
// =====================================================
//
// symptoms.png needs to shrink down onto exactly the spot where
// hero-image already lives in the sidebar, so the handoff between
// the two reads as one continuous image instead of a jump cut.
//
// baseWidth/baseHeight: symptoms.png's own rendered size at scale 1
// (its plain width:32vw / max-width:420px box).
//
// landing: the on-screen point + scale symptoms.png needs to reach
// so it lines up with hero-image. This tracks the same bottom-edge
// anchor point used during the zoom-in phase (see updateZoomScene),
// not hero-image's center. On desktop the sidebar is a full-height
// sticky column, so once pinned its vertical center always sits at
// the viewport's vertical center - that's true no matter where we
// are on the page right now, which lets us compute the landing spot
// up front instead of only once we've scrolled there. On mobile the
// sidebar isn't sticky, so we fall back to its current measured
// position instead.

let baseWidth = 0;
let baseHeight = 0;
let landing = { x: 0, y: 0, scale: 1 };

function measureLanding() {

    const prevTransform = zoomSymptoms.style.transform;
    zoomSymptoms.style.transform = "none";
    baseWidth = zoomSymptoms.offsetWidth;
    baseHeight = zoomSymptoms.offsetHeight;
    zoomSymptoms.style.transform = prevTransform;

    const heroRect = heroImage.getBoundingClientRect();
    const graphicRect = graphicEl.getBoundingClientRect();
    const graphicIsSticky = getComputedStyle(graphicEl).position === "sticky";

    landing = {
        x: graphicRect.left + graphicRect.width / 2,
        y: graphicIsSticky
            ? window.innerHeight / 2 + heroRect.height / 2
            : heroRect.bottom,
        scale: baseWidth ? heroRect.width / baseWidth : 1
    };

}

function updateZoomScene() {

    const stageRect = zoomStage.getBoundingClientRect();
    const rect = zoomScene.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;

    if (scrollable <= 0) return;

    const progress = clamp(-rect.top / scrollable, 0, 1);

    // Both images are positioned from this same center point while
    // fading in together, so they read as one aligned image instead
    // of two layers drifting independently.
    const centerX = stageRect.width / 2;
    const centerY = stageRect.height / 2;

    let symptomsOpacity;
    let grassOpacity;
    let x, y, scale;

    if (progress <= 0.5) {

        const p = progress / 0.5;

        symptomsOpacity = p;
        grassOpacity = p;

        x = centerX;
        y = centerY;
        scale = ZOOM_SCALE;

    } else {

        const p = (progress - 0.5) / 0.5;

        symptomsOpacity = 1;
        grassOpacity = 1 - p;

        // landing.x/y were measured in viewport coordinates; convert
        // into the stage's own coordinate space. These match while
        // the stage is pinned, but this keeps it correct even when
        // it isn't (e.g. very short viewports).
        const landingX = landing.x - stageRect.left;
        const landingY = landing.y - stageRect.top;

        x = lerp(centerX, landingX, p);
        y = lerp(centerY, landingY, p);
        scale = lerp(ZOOM_SCALE, landing.scale, p);

    }

    zoomSymptoms.style.opacity = symptomsOpacity;
    zoomSymptoms.style.transform =
        `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;

    zoomGrass.style.opacity = grassOpacity;

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

let resizeTicking = false;

window.addEventListener("resize", () => {

    if (resizeTicking) return;

    resizeTicking = true;

    requestAnimationFrame(() => {
        measureLanding();
        updateZoomScene();
        resizeTicking = false;
    });

});

// Image dimensions (and therefore the landing spot) aren't reliable
// until both images have actually loaded, so re-measure once they
// have in addition to the upfront measurement below.
[zoomSymptoms, heroImage].forEach(img => {
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