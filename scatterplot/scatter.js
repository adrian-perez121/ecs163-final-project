import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Config 
const MARGIN = { top: 30, right: 30, bottom: 70, left: 90 };
const DATA_PATH = "../output.csv";

const GENRE_COLORS = d3.schemeTableau10;

// State
let state = {
  yField: "imdb_rating",
  genre: "All",
  allData: [],
  genres: [],
};

// Helpers
function getGenresFromRow(row) {
  return row.genres
    ? row.genres.split(",").map((g) => g.trim()).filter(Boolean)
    : [];
}

function matchesGenre(row, genre) {
  if (genre === "All") return true;
  return getGenresFromRow(row).includes(genre);
}

function filteredData() {
  return state.allData.filter(
    (d) =>
      d.budget > 0 &&
      d[state.yField] > 0 &&
      matchesGenre(d, state.genre)
  );
}

function yLabel() {
  return state.yField === "imdb_rating" ? "IMDb Rating" : "Revenue (USD)";
}

function formatRevenue(v) {
  return v >= 1e9
    ? `$${(v / 1e9).toFixed(1)}B`
    : v >= 1e6
    ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3
    ? `$${(v / 1e3).toFixed(0)}K`
    : `$${v}`;
}

function formatBudget(v) {
  return formatRevenue(v);
}

// Setup SVG
const svg = d3.select("#scatter-svg");
const container = document.getElementById("chart-container");

function getDims() {
  const w = container.clientWidth - 32; // subtract padding
  const h = 600;
  return {
    w,
    h,
    innerW: w - MARGIN.left - MARGIN.right,
    innerH: h - MARGIN.top - MARGIN.bottom,
  };
}

const g = svg
  .append("g")
  .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

const xAxisG = g.append("g").attr("class", "axis x-axis");
const yAxisG = g.append("g").attr("class", "axis y-axis");
const gridG = g.append("g").attr("class", "grid");
const dotsG = g.append("g").attr("class", "dots");
const xLabelEl = g.append("text").attr("class", "axis-label");
const yLabelEl = g.append("text").attr("class", "axis-label");

// Tooltip
const tooltip = d3.select("#tooltip");

function showTooltip(event, d) {
  const genres = getGenresFromRow(d).join(", ") || "Unknown";
  const yVal =
    state.yField === "imdb_rating"
      ? `${d.imdb_rating.toFixed(1)} / 10`
      : formatRevenue(d.revenue);

  tooltip.html(`
    <div class="tt-title">${d.title}</div>
    <div class="tt-row"><span>Budget</span><span>${formatBudget(d.budget)}</span></div>
    <div class="tt-row"><span>${yLabel()}</span><span>${yVal}</span></div>
    <div class="tt-row"><span>Year</span><span>${d.release_date ?? "—"}</span></div>
    <div class="tt-row"><span>Director</span><span>${d.director || "—"}</span></div>
    <div class="tt-genre">${genres}</div>
  `);

  const containerRect = container.getBoundingClientRect();
  const x = event.clientX - containerRect.left + 16;
  const y = event.clientY - containerRect.top - 10;

  tooltip
    .style("left", `${Math.min(x, containerRect.width - 260)}px`)
    .style("top", `${y}px`)
    .classed("visible", true);
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

// Legend
function buildLegend(colorScale) {
  let legendEl = document.getElementById("legend");
  if (!legendEl) {
    legendEl = document.createElement("div");
    legendEl.id = "legend";
    container.insertBefore(legendEl, container.firstChild);
  }

  const genres =
    state.genre === "All" ? colorScale.domain() : [state.genre];

  legendEl.innerHTML = genres
    .map(
      (g, i) => `
    <div class="legend-item" data-genre="${g}">
      <div class="legend-dot" style="background:${colorScale(g)}"></div>
      <span>${g}</span>
    </div>`
    )
    .join("");

  legendEl.querySelectorAll(".legend-item").forEach((el) => {
    el.addEventListener("click", () => {
      const genre = el.dataset.genre;
      state.genre = genre;
      document.getElementById("genre-select").value = genre;
      render();
    });
  });
}

// Main Render
function render() {
  const { w, h, innerW, innerH } = getDims();

  svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);

  const data = filteredData();

  // Update title
  const genreLabel = state.genre === "All" ? "All Genres" : state.genre;
  document.getElementById("chart-title").textContent = `Budget vs. ${yLabel()} — ${genreLabel}`;

  // Scales
  const xScale = d3
    .scaleLog()
    .domain([
      d3.min(data, (d) => d.budget) * 0.8 || 1,
      d3.max(data, (d) => d.budget) * 1.2 || 1e9,
    ])
    .range([0, innerW])
    .nice();

    const yScale = state.yField === "revenue"
    ? d3.scaleLog()
        .domain([1, 3_000_000_000])
        .range([innerH, 0])
        .clamp(true)
    : d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.imdb_rating) * 1.1 || 10])
        .range([innerH, 0])
        .nice();

  // Color by first genre
  const allGenres = [...new Set(data.flatMap(getGenresFromRow))].sort();
  const colorScale = d3.scaleOrdinal(GENRE_COLORS).domain(allGenres);

  // Grid
  gridG
    .attr("transform", `translate(0,0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-innerW)
        .tickFormat("")
    )
    .call((g) => g.select(".domain").remove());

  // X Axis
  xAxisG
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat((v) => formatBudget(v))
    );

  // Y Axis
  yAxisG.call(
    d3.axisLeft(yScale)
      .ticks(state.yField === "revenue" ? 8 : 6, state.yField === "revenue" ? ",.0s" : "")
      .tickFormat((v) => state.yField === "revenue" ? formatRevenue(v) : v)
  );

  // Axis labels
  xLabelEl
    .attr("x", innerW / 2)
    .attr("y", innerH + 55)
    .attr("text-anchor", "middle")
    .text("Budget (USD)");

  yLabelEl
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -70)
    .attr("text-anchor", "middle")
    .text(yLabel());

  // Dots
  const dots = dotsG.selectAll(".dot").data(data, (d) => d.id);

  dots.exit().remove();

  dots
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("r", 5)
    .merge(dots)
    .attr("cx", (d) => xScale(d.budget))
    .attr("cy", (d) => yScale(d[state.yField]))
    .attr("fill", (d) => colorScale(getGenresFromRow(d)[0] || "Unknown"))
    .attr("opacity", 0.72)
    .attr("stroke", "none")
    .on("mouseover", function (event, d) {
      d3.select(this)
        .raise()
        .transition().duration(100)
        .attr("r", 9)
        .attr("opacity", 1)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      showTooltip(event, d);
    })
    .on("mousemove", function (event, d) {
      showTooltip(event, d);
    })
    .on("mouseout", function () {
      d3.select(this)
        .transition().duration(150)
        .attr("r", 5)
        .attr("opacity", 0.72)
        .attr("stroke", "none");
      hideTooltip();
    });

  // Legend
  buildLegend(colorScale);
}

// Load Data & Wire Controls
d3.csv(DATA_PATH, (row) => ({
  id: row.id,
  title: row.title,
  budget: +row.budget,
  revenue: +row.revenue,
  imdb_rating: +row.imdb_rating,
  release_date: row.release_date ? row.release_date.slice(0, 4) : null,
  genres: row.genres,
  director: row.director,
})).then((data) => {
  state.allData = data;

  // Populate genre dropdown
  const allGenres = [...new Set(data.flatMap(getGenresFromRow))].sort();
  state.genres = allGenres;
  const sel = document.getElementById("genre-select");
  allGenres.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    sel.appendChild(opt);
  });

  // Wire controls
  sel.addEventListener("change", (e) => {
    state.genre = e.target.value;
    render();
  });

  document.getElementById("y-axis-select").addEventListener("change", (e) => {
    state.yField = e.target.value;
    render();
  });

  render();
});