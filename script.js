// ---------------------------
// Create SVG
// ---------------------------

const svg = d3.select("#viz");

const width = 700;
const height = 500;

svg
    .attr("viewBox", `0 0 ${width} ${height}`);

// Example object

const circle = svg.append("circle")
    .attr("cx", width/2)
    .attr("cy", height/2)
    .attr("r", 50)
    .attr("fill", "steelblue");


// ---------------------------
// Update visualization
// ---------------------------

function updateGraphic(step){

    switch(step){

        case "1":

            circle
                .transition()
                .duration(600)
                .attr("cx", width/2)
                .attr("cy", height/2)
                .attr("r",50)
                .attr("fill","steelblue");

            break;

        case "2":

            circle
                .transition()
                .duration(600)
                .attr("cx",200)
                .attr("cy",180)
                .attr("r",90)
                .attr("fill","tomato");

            break;

        case "3":

            circle
                .transition()
                .duration(600)
                .attr("cx",500)
                .attr("cy",320)
                .attr("r",35)
                .attr("fill","seagreen");

            break;

    }

}

// ---------------------------
// Scroll Observer
// ---------------------------

const steps = document.querySelectorAll(".step");

const observer = new IntersectionObserver(

(entries)=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            const step = entry.target.dataset.step;

            updateGraphic(step);

            steps.forEach(s=>s.classList.remove("active"));

            entry.target.classList.add("active");

        }

    });

},

{
    threshold:0.5
}

);

steps.forEach(step=>observer.observe(step));

// Initialize

updateGraphic("1");