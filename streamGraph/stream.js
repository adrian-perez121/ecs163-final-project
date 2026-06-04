import { genreColor } from "../utils.js";
import createPieChart from "../pieChart/pieChart.js";
import { updatePCPByYear } from "../pcp_stuff/pcp.js";
import { renderBarChart } from "../groupedBarChartRating/chart_rating.js"

// ==========================================
// 1. DATA FETCHING & PROCESSING
// ==========================================
const dataObject = await fetch(new URL("../data_processing/stream_data.json", import.meta.url)).then(
  (r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  },
);

const yearGenreCounts = new Map();
for (const [year, genreMapArray] of Object.entries(
  JSON.parse(dataObject["yearGenreCounts"]),
)) {
  yearGenreCounts.set(parseInt(year), new Map(genreMapArray));
}

const genresList = JSON.parse(dataObject["genresList"]);
const minYear = d3.min(Array.from(yearGenreCounts.keys()));
const maxYear = d3.max(Array.from(yearGenreCounts.keys()));

// Final aggregated array
const chartData = [];
for (let y = minYear; y <= maxYear; y++) {
  const entry = { year: y };
  genresList.forEach((g) => {
    entry[g] = yearGenreCounts.has(y) ? yearGenreCounts.get(y).get(g) || 0 : 0;
  });
  chartData.push(entry);
}

// ==========================================
// 2. SVG & CHART SETUP
// ==========================================
const width = 1200;
const height = 460;
const margin = { top: 20, right: 0, bottom: 50, left: 60 };

d3.select("#chart-container").selectAll("*").remove();

const svg = d3.select("#chart-container")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("max-width", "100%")
  .style("height", "auto");

svg.append("defs").append("clipPath")
  .attr("id", "stream-clip")
  .append("rect")
  .attr("width", width - margin.left - margin.right)
  .attr("height", height - margin.top - margin.bottom)
  .attr("x", margin.left)
  .attr("y", margin.top);

const x = d3.scaleLinear()
  .domain(d3.extent(chartData, d => d.year))
  .range([margin.left, width - margin.right]);

const stack = d3.stack().keys(genresList);
const stackedData = stack(chartData);

const maxVal = d3.max(stackedData, layer => d3.max(layer, d => d[1]));
const y = d3.scaleLinear()
  .domain([0, maxVal]).nice()
  .range([height - margin.bottom, margin.top]);

const area = d3.area()
  .x(d => x(d.data.year))
  .y0(d => y(d[0]))
  .y1(d => y(d[1]));

// ==========================================
// 3. DRAWING THE STREAM GRAPH & BAR CHART CLICK EVENT
// ==========================================
const streamGroup = svg.append("g")
  .attr("clip-path", "url(#stream-clip)");

// added tooltip div specifically for hovering over layers
const layerTooltip = d3.select("body").append("div")
  .attr("class", "layer-tooltip")
  .style("display", "none")
  .style("position", "absolute")
  .style("z-index", "9999");

const layers = streamGroup.selectAll(".layer")
  .data(stackedData)
  .join("path")
  .attr("class", "layer")
  .attr("fill", d => genreColor(d.key))
  .attr("d", area)
  .style("cursor", "pointer")
  // HOVER EFFECTS: Reveal the genre tooltip
  .on("mouseover", function(event, d) {
      d3.selectAll(".layer").style("opacity", 0.3); // Dim all other layers
      d3.select(this).style("opacity", 1);          // Highlight the one being hovered
      
      // Adds the genre name into the tooltip and display it
      layerTooltip.style("display", "block")
                  .text(d.key);
  })
  .on("mousemove", function(event) {
      // Makes the tooltip follow the mouse cursor
      layerTooltip.style("left", (event.pageX + 15) + "px")
                  .style("top", (event.pageY - 25) + "px");
  })
  .on("mouseout", function() {
      d3.selectAll(".layer").style("opacity", 1);   // Restore normal opacity
      
      // Hide the tooltip when the mouse leaves the layer
      layerTooltip.style("display", "none");
  })
  .on("click", function (event, d) {
    const clickedGenre = d.key; 
    console.log(`Stream clicked: ${clickedGenre}. Opening bar chart...`);

    d3.select("#chart-container")
      .style("opacity", 0)
      .style("pointer-events", "none"); 

    renderBarChart(clickedGenre, "#bar-chart-inject");

    d3.select("#bar-container")
      .style("opacity", 1)
      .style("pointer-events", "all");
      
    // Hide the tooltip when the bar chart opens
    layerTooltip.style("display", "none");
  });

// ==========================================
// 4. AXES & DYNAMIC ZOOM LOGIC
// ==========================================
const xAxis = svg.append("g")
  .attr("class", "stream-x-axis")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x).tickFormat(d3.format("d")));

const yAxis = svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y));

yAxis.append("text")
  .attr("x", -height / 2)
  .attr("y", -45)
  .attr("fill", "black")
  .attr("transform", "rotate(-90)")
  .style("text-anchor", "middle")
  .style("font-size", "18px")
  .text("Movie Count");

const zoom = d3.zoom()
  .scaleExtent([1, 10])
  .translateExtent([[margin.left, 0], [width - margin.right, height]])
  .extent([[margin.left, 0], [width - margin.right, height]])
  .on("zoom", zoomed);

svg.call(zoom);

function zoomed(event) {
  // 1. Rescale X Axis
  const newX = event.transform.rescaleX(x);
  xAxis.call(d3.axisBottom(newX).tickFormat(d3.format("d")));

  // 2. Find visible boundaries
  const [minVisible, maxVisible] = newX.domain();

  // 3. Dynamically find the new maximum Y value in the visible area
  let maxValVisible = 0;
  stackedData.forEach(layer => {
    layer.forEach(d => {
      const year = d.data.year;
      if (year >= minVisible && year <= maxVisible) {
        if (d[1] > maxValVisible) {
          maxValVisible = d[1];
        }
      }
    });
  });

  if (maxValVisible === 0) maxValVisible = 1; // Fallback to avoid 0 domain

  // 4. Rescale Y Axis based on new visible maximum
  y.domain([0, maxValVisible]).nice();
  yAxis.call(d3.axisLeft(y));

  // 5. Redraw the areas utilizing BOTH updated axes
  const newArea = d3.area()
    .x(d => newX(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  layers.attr("d", newArea);
}

// ==========================================
// 5. TOOLTIP / PIE CHART / PCP INTERACTIONS
// ==========================================
const tooltip = d3.select("#tooltip");
tooltip.selectAll("svg").remove();
const pieContainer = tooltip.append("svg").attr("width", 180).attr("height", 180);

const pieLayout = { left: 0, top: 0, width: 140, height: 140 };
const pieMargins = { top: 10, right: 10, bottom: 10, left: 10 };

let currentYear = null;
let yearCheck = 0;

xAxis
  .on("mouseover", function (event) {
    const tick = event.target.closest(".tick");
    if (!tick) return;

    const label = tick.querySelector("text").textContent;
    const year = parseInt(label, 10);
    if (Number.isNaN(year)) return;

    const chartBox = document.getElementById("chart-container").getBoundingClientRect();
    const tooltipX = chartBox.right + window.scrollX + 20;

    tooltip
      .style("display", "block")
      .style("left", tooltipX + "px")
      .style("top", (event.pageY - 100) + "px")
      .style("outline", "none")
      .style("border", "none")
      .style("stroke", "none")
      .style("box-shadow", "2px 2px 8px gray")
      .style("border-radius", "15px");

    createPieChart(pieContainer, pieLayout, pieMargins, year);
  })
  .on("mousemove", function (event) {
    const tick = event.target.closest(".tick");
    if (!tick) return;

    const chartBox = document.getElementById("chart-container").getBoundingClientRect();
    const tooltipX = chartBox.right + window.scrollX + 20;

    tooltip
      .style("left", (event.pageX - (pieLayout.width + pieMargins.right + pieMargins.left) / 2) + "px")
      .style("top", (event.pageY - pieLayout.height - 80) + "px");
  })
  .on("click", function (event) {
    const tick = event.target.closest(".tick");
    if (!tick) return;

    const label = tick.querySelector("text").textContent;
    // Changed from new Date().getFullYear() to parseInt() to avoid timezone shifting!
    const year = parseInt(label, 10);
    if (Number.isNaN(year)) return;

    if (year !== currentYear) {
      yearCheck = 0;
      console.log(`Year clicked: ${year}. Filtering PCP...`);
      updatePCPByYear(year);
    } else {
      yearCheck++;
      if (yearCheck % 2 === 1) {
        console.log('Returning to Default Year: (All Years)');
        updatePCPByYear();
      } else {
        console.log(`Year clicked: ${year}. Filtering PCP...`);
        updatePCPByYear(year);
      }
    }
    currentYear = year;
  })
  .on("mouseout", function (event) {
    const related = event.relatedTarget;
    if (related && related.closest && related.closest(".stream-x-axis")) return;

    tooltip.style("display", "none");
  });

// ==========================================
// 6. LEGEND GENERATION
// ==========================================
const legendContainer = d3.select("#legend-items");
legendContainer.style("display", "flex")
legendContainer.style("flex-direction", "column")
legendContainer.style("height", "90%")
legendContainer.style("justify-content", "space-between")

legendContainer.selectAll("*").remove();

[...genresList].reverse().forEach((genre) => {
  const item = legendContainer.append("div").attr("class", "legend-item");
  item.append("div")
    .attr("class", "legend-color")
    .style("background-color", genreColor(genre));
  item.append("span").text(genre);
});

// ==========================================
// 7. BACK BUTTON LOGIC (BAR CHART -> STREAM)
// ==========================================
d3.select("#close-bar-btn").on("click", () => {
    d3.select("#bar-container")
      .style("opacity", 0)
      .style("pointer-events", "none");
    
    d3.select("#chart-container")
      .style("opacity", 1)
      .style("pointer-events", "all");
});

d3.select("#close-scatter-btn").on("click", () => {
  d3.select("#scatter-container")
    .style("opacity", 0)
    .style("pointer-events", "none");

  d3.select("#bar-container")
    .style("opacity", 1)
    .style("pointer-events", "all");
});