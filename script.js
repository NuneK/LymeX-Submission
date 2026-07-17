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
// SCROLL BINDING
// =====================================================

let ticking = false;

window.addEventListener("scroll", () => {

    if (ticking) return;

    ticking = true;

    requestAnimationFrame(() => {
        refresh();
        ticking = false;
    });

}, { passive: true });

// =====================================================
// INITIALIZE
// =====================================================

refresh();