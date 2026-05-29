import { genreColor } from "../utils.js";
import createPieChart from "../pieChart/pieChart.js";

// Fetching our processed data that was already processed
// this way we don't have to get the data on every page load
const dataObject = await fetch("../data_processing/stream_data.json").then(
  (r) => {
    if (!r.ok) {
      throw new Error(r.status);
    }

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

// const genresList = Array.from(allGenres).sort();
const minYear = d3.min(Array.from(yearGenreCounts.keys()));
const maxYear = d3.max(Array.from(yearGenreCounts.keys()));

// final aggreagted array
const chartData = [];
for (let y = minYear; y <= maxYear; y++) {
  const entry = { year: y };
  genresList.forEach((g) => {
    entry[g] = yearGenreCounts.has(y) ? yearGenreCounts.get(y).get(g) || 0 : 0;
  });
  chartData.push(entry);
}

// SVG dimensions
const width = 900;
const height = 600;
const margin = { top: 20, right: 30, bottom: 80, left: 80 };

// This is going to be used for zoom in functionality
const outer = d3
  .select("#chart-container")
  .append("svg")
  .attr(
    "viewBox",
    `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
  )
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto");

// Where everything will appended
const svg = outer
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// This defines the region that is going to clip
const defs = outer.append("defs");
defs
  .append("clipPath")
  .attr("id", "chart-clip")
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", width)
  .attr("height", height);

// group for stacked-area layers (will be clipped), this applies the clip to the group
const layersG = svg.append("g").attr("clip-path", "url(#chart-clip)");

// Stack Generator
// stackOffsetNone has it at Y=0 so Y-axis represents accurate combined movie counts
const stack = d3
  .stack()
  .keys(genresList)
  .offset(d3.stackOffsetNone)
  .order(d3.stackOrderNone);

const series = stack(chartData);

// sets scales
const x = d3
  .scaleLinear()
  .domain(d3.extent(chartData, (d) => d.year))
  .range([0, width]);

const y = d3
  .scaleLinear()
  .domain([0, d3.max(series, (layer) => d3.max(layer, (d) => d[1]))])
  .range([height, 0]);

const area = d3
  .area()
  .x((d) => x(d.data.year))
  .y0((d) => y(d[0]))
  .y1((d) => y(d[1]))
  .curve(d3.curveBasis);

// Tooltip has to handle the pie chart and regular text now
// They will be toggled on and off depending on where you are hovering
const tooltip = d3.select("#tooltip");
const label = tooltip
  .append("div")
  .attr("class", "tooltip-label")
  .style("display", "none");
const pieLayout = { left: 0, top: 0, width: 150, height: 150 };
const pieMargins = { left: 0, right: 0, top: 0, bottom: 0 };

const pieContainer = tooltip
  .append("svg")
  .attr("width", pieLayout.width + pieMargins.left + pieMargins.right + 20)
  .attr("height", pieLayout.height + pieMargins.top + pieMargins.bottom + 20)
  .style("display", "block");

// Used for zooming in
const yDomainMax = y.domain()[1];
// Using https://d3-graph-gallery.com/graph/interactivity_zoom.html as a reference
// This creates the zoom in effect for the stream graph
const zoom = d3
  .zoom()
  .scaleExtent([1, 20])
  .extent([
    [0, 0],
    [width, height],
  ])
  .translateExtent([
    [-margin.left, -margin.top],
    [width + margin.right, height],
  ])
  .on("zoom", (event) => {
    const t = event.transform;
    const k = t.k;
    const newX = t.rescaleX(x);
    const newYMax = yDomainMax / k;
    const newY = d3.scaleLinear().domain([0, newYMax]).range([height, 0]);

    // // update axes
    xAxis.call(d3.axisBottom(newX).tickFormat(d3.format("d")));

    yAxis.call(d3.axisLeft(newY));

    // update area paths using new scales
    const updatedArea = d3
      .area()
      .x((d) => newX(d.data.year))
      .y0((d) => newY(d[0]))
      .y1((d) => newY(d[1]))
      .curve(d3.curveBasis);

    svg.selectAll("path.stream-path").attr("d", updatedArea);
  });

// group for stacked-area layers (will be clipped)

// You need to draw the paths first so that they are behind the axes
layersG
  .selectAll("path")
  .data(series)
  .join("path")
  .attr("class", "stream-path")
  .attr("fill", (d) => genreColor(d.key))
  .attr("d", area)
  .attr("opacity", 0.8)
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5)
  .on("mouseover", function (event, d) {
    d3.select(this)
      .attr("opacity", 1)
      .attr("stroke", "#000")
      .attr("stroke-width", 1);
    tooltip
      .style("display", "block")
      .style("border", "")
      .style("outline", "")
      .style("background", "");

    pieContainer.style("display", "none");
    label.style("display", "block").text(`Genre: ${d.key}`);
  })
  .on("mousemove", function (event) {
    tooltip
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 15 + "px");
  })
  .on("mouseout", function () {
    d3.select(this)
      .attr("opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5);
    tooltip.style("display", "none");
    label.style("display", "none");
  });

// The x-axis with the ticks
// this is where the years are being created
const xAxis = svg
  .append("g")
  .attr("class", "stream-x-axis")
  .attr("transform", `translate(0,${height})`);

xAxis.call(d3.axisBottom(x).tickFormat(d3.format("d")));

xAxis
  .append("text")
  .attr("x", width / 2)
  .attr("y", 60)
  .attr("fill", "black")
  .style("font-size", "18px")
  .text("Year");

// Selecting the year titles
xAxis
  .on("mouseover", function (event) {
    // Uses the data from the label of the nearest tick to show the pie chart
    const tick = event.target.closest(".tick");
    if (!tick) return;
    // Extracting the year
    const label = tick.querySelector("text").textContent;
    const year = new Date(label).getFullYear();
    if (Number.isNaN(year)) return;

    pieContainer.style("display", "block");
    tooltip
      .style("display", "block")
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY + 50 + "px");

    createPieChart(pieContainer, pieLayout, pieMargins, year + 1);
  })
  .on("mousemove", function (event) {
    // Make sure the pie chart moves with the cursor
    const tick = event.target.closest(".tick");
    if (!tick) return;
    tooltip
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY + 50 + "px");
  })
  .on("mouseout", function (event) {
    // hide if mouse leaves the axis entirely
    const related = event.relatedTarget;
    if (related && related.closest && related.closest(".stream-x-axis")) return;
    pieContainer.style("display", "none");
    tooltip.style("display", "none");
  });

// Adding on the y axis
const yAxis = svg.append("g");

yAxis.call(d3.axisLeft(y));
yAxis
  .append("text")
  .attr("x", -height / 2)
  .attr("y", -60)
  .attr("fill", "black")
  .attr("transform", "rotate(-90)")
  .style("text-anchor", "middle")
  .style("font-size", "18px")
  .text("Movie Count");

// Legend
const legendContainer = d3.select("#legend-items");
genresList.forEach((genre) => {
  const item = legendContainer.append("div").attr("class", "legend-item");
  item
    .append("div")
    .attr("class", "legend-color")
    .style("background-color", genreColor(genre));
  item.append("span").text(genre);
});

// Adding on the zoom functionality to the outer svg
outer.call(zoom);
