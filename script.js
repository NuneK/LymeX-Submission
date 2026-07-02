// =====================================================
// SVG SETUP
// =====================================================

const svg = d3.select("#viz");

const width = 700;
const height = 500;

svg.attr("viewBox", `0 0 ${width} ${height}`);

// =====================================================
// GRAPHIC ELEMENTS
// =====================================================

// Circle used in Steps 1, 2, and 4
const circle = svg.append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", 50)
    .attr("fill", "steelblue");

// Timeline group (used only in Step 3)
const timelineGroup = svg.append("g")
    .style("opacity", 0);

// Timeline line
const timelineLine = timelineGroup.append("line")
    .attr("x1", 120)
    .attr("x2", 580)
    .attr("y1", height / 2)
    .attr("y2", height / 2)
    .attr("stroke", "#999")
    .attr("stroke-width", 5);

// Timeline circle
const timelineCircle = timelineGroup.append("circle")
    .attr("cx", 120)
    .attr("cy", height / 2)
    .attr("r", 18)
    .attr("fill", "tomato");

// Labels
timelineGroup.append("text")
    .attr("x", 120)
    .attr("y", height / 2 + 40)
    .attr("text-anchor", "middle")
    .text("Start");

timelineGroup.append("text")
    .attr("x", 580)
    .attr("y", height / 2 + 40)
    .attr("text-anchor", "middle")
    .text("End");

// =====================================================
// STEP TRACKING
// =====================================================

let currentStep = "1";

// Timeline progress (0 → 1)
let timelineProgress = 0;

// Is mouse over visualization?
let hoveringGraphic = false;

// =====================================================
// STEP VISUALS
// =====================================================

function showCircle() {

    circle.interrupt();
    timelineGroup.interrupt();

    circle.style("opacity", 1);
    timelineGroup.style("opacity", 0);

}

function showTimeline() {

    circle.interrupt();
    timelineGroup.interrupt();

    circle.style("opacity", 0);
    timelineGroup.style("opacity", 1);

    updateTimeline();

}

function updateGraphic(step) {

    currentStep = step;

    switch (step) {

        case "1":

            showCircle();

            circle
                .transition()
                .duration(600)
                .attr("cx", width / 2)
                .attr("cy", height / 2)
                .attr("r", 50)
                .attr("fill", "steelblue");

            break;

        case "2":

            showCircle();

            circle
                .transition()
                .duration(600)
                .attr("cx", 200)
                .attr("cy", 180)
                .attr("r", 90)
                .attr("fill", "tomato");

            break;

        case "3":

            showTimeline();

            break;

        case "4":

            showCircle();

            circle
                .transition()
                .duration(600)
                .attr("cx", 520)
                .attr("cy", 320)
                .attr("r", 40)
                .attr("fill", "seagreen");

            break;

    }

}

// =====================================================
// TIMELINE
// =====================================================

function updateTimeline() {

    const x = 120 + timelineProgress * 460;

    timelineCircle
        .attr("cx", x);

}

// =====================================================
// SCROLL OBSERVER
// =====================================================

const steps = document.querySelectorAll(".step");

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            const step = entry.target.dataset.step;

            updateGraphic(step);

            steps.forEach(s => s.classList.remove("active"));

            entry.target.classList.add("active");

        }

    });

}, {

    threshold: 0.5

});

steps.forEach(step => observer.observe(step));

// =====================================================
// MOUSE POSITION
// =====================================================

const graphic = document.querySelector(".graphic");

graphic.addEventListener("mouseenter", () => {

    hoveringGraphic = true;

});

graphic.addEventListener("mouseleave", () => {

    hoveringGraphic = false;

});

// =====================================================
// TIMELINE SCRUBBING
// =====================================================

graphic.addEventListener("wheel", (event) => {

    // Only intercept scrolling on Step 3
    if (currentStep !== "3") return;

    // Only if mouse is actually over the visualization
    if (!hoveringGraphic) return;

    event.preventDefault();

    timelineProgress += event.deltaY * 0.0015;

    timelineProgress = Math.max(
        0,
        Math.min(1, timelineProgress)
    );

    updateTimeline();

}, { passive: false });

// =====================================================
// INITIALIZE
// =====================================================

updateGraphic("1");