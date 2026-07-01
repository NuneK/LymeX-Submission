const steps = document.querySelectorAll(".step");
const viz = document.querySelector(".viz");

function activateStep(stepNumber) {
  viz.textContent = "Current step: " + stepNumber;

  steps.forEach(step => {
    step.classList.remove("active");
  });

  document
    .querySelector(`[data-step="${stepNumber}"]`)
    .classList.add("active");
}

window.addEventListener("scroll", () => {
  let current = 1;

  steps.forEach(step => {
    const rect = step.getBoundingClientRect();

    if (rect.top < window.innerHeight / 2) {
      current = step.dataset.step;
    }
  });

  activateStep(current);
});