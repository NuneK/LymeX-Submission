const steps = Array.from(document.querySelectorAll(".step"));
const viz = document.querySelector(".viz");

let currentStep = 1;

function updateActiveStep() {
  let bestStep = currentStep;
  let bestScore = -Infinity;

  steps.forEach(step => {
    const rect = step.getBoundingClientRect();

    // Score based on how close the step is to middle of screen
    const distanceFromCenter =
      Math.abs(rect.top - window.innerHeight * 0.5);

    const score = -distanceFromCenter;

    if (score > bestScore) {
      bestScore = score;
      bestStep = step.dataset.step;
    }
  });

  if (bestStep !== currentStep) {
    currentStep = bestStep;

    viz.textContent = "Current step: " + currentStep;

    steps.forEach(s => s.classList.remove("active"));
    document
      .querySelector(`[data-step="${currentStep}"]`)
      .classList.add("active");
  }
}

window.addEventListener("scroll", () => {
  requestAnimationFrame(updateActiveStep);
});