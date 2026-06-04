import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { genreColor } from "../utils.js";

function parseBudgetRange(range) {
  if (!range || range === "all") return [1, Infinity];
  const [lo, hi] = range.split("-").map(Number);
  return [Math.max(1, lo), hi];
}

function parseYearRange(range) {
  if (!range || range === "all") return [0, Infinity];
  if (range.endsWith("+")) return [parseInt(range), Infinity];
  const [lo, hi] = range.split("-").map(Number);
  return [lo, hi];
}

function getGenres(row) {
  return row.genres ? row.genres.split(",").map(g => g.trim()).filter(Boolean) : [];
}

function formatMoney(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

function getBudgetCategory(budget) {
  if (budget >= 0 && budget <= 1000)           return "0-1000";
  if (budget > 1000 && budget <= 1000000)      return "1000-1000000";
  if (budget > 1000000 && budget <= 100000000) return "1000000-100000000";
  if (budget > 100000000)                      return "100000000-999999999999";
  return null;
}

export async function renderScatterPlot(filters, containerId) {
  const { genre, budgetRange, yearRange, color, dotOpacity } = filters;

  const [bLo, bHi] = parseBudgetRange(budgetRange);
  const [yLo, yHi] = parseYearRange(yearRange);

  // Load + filter data
  const rawData = await d3.csv("../data/with_budgets_and_ratings.csv");
  const data = rawData.map(row => ({
    id: row.id,
    title: row.title,
    budget: +row.budget,
    revenue: +row.revenue,
    imdb_rating: +row.imdb_rating,
    release_date: row.release_date ? row.release_date.slice(0, 4) : null,
    genres: row.genres,
    director: row.director,
  })).filter(d =>
    d.budget > 0 &&
    d.imdb_rating > 0 &&
    getBudgetCategory(d.budget) === budgetRange &&
    (d.release_date ? +d.release_date >= yLo && +d.release_date <= yHi : false) &&
    (genre ? getGenres(d).includes(genre) : true)
  );

  // Clear container
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  // Match bar chart dimensions exactly
  const margin = { top: 40, right: 140, bottom: 60, left: 60 };
  const totalW = 800;
  const totalH = 310;
  const width  = totalW - margin.left - margin.right;
  const height = totalH - margin.top  - margin.bottom;

  // Title
  container.append("div")
    .attr("class", "chart-title")
    .text(`${genre} Films — ${yearRange}`);

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales — X locked to selected budget range
  const domainMap = {
    "0-1000":                 [0,          1_000],
    "1000-1000000":           [1_000,      1_000_000],
    "1000000-100000000":      [1_000_000,  100_000_000],
    "100000000-999999999999": [100_000_000, 500_000_000]
  };
  
  const [xMin, xMax] = domainMap[budgetRange] || [0, 1_000_000_000];
  
  const xScale = d3.scaleLinear()
    .domain([xMin, xMax])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, 10])
    .range([height, 0]);

  // Grid
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""))
    .select(".domain").remove();

  // X Axis
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(v => formatMoney(v)))
    .append("text").attr("class", "axis-label")
    .attr("x", width / 2).attr("y", 45)
    .style("text-anchor", "middle")
    .text("Budget (USD)");

  // Y Axis
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(6))
    .append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -50)
    .style("text-anchor", "middle")
    .text("IMDb Rating");

  // Tooltip — reuse bar tooltip style
  let tip = d3.select("body").select(".scatter-tooltip");
  if (tip.empty()) {
    tip = d3.select("body").append("div")
      .attr("class", "scatter-tooltip bar-tooltip")
      .style("opacity", 0);
  }

  // Dots — use exact color + opacity from clicked bar
  const dotColor  = color || genreColor(genre);
  const dotAlpha  = dotOpacity || 0.7;

  g.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.budget))
    .attr("cy", d => yScale(d.imdb_rating))
    .attr("r", 5)
    .attr("fill", dotColor)
    .attr("opacity", dotAlpha)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).transition().duration(100).attr("r", 8).attr("opacity", 1);
      tip.style("opacity", 1)
        .html(`<strong>${d.title}</strong><br/>
               Budget: ${formatMoney(d.budget)}<br/>
               Rating: ${d.imdb_rating.toFixed(1)}<br/>
               Year: ${d.release_date || "—"}<br/>
               Director: ${d.director || "—"}`);
    })
    .on("mousemove", function (event) {
      tip.style("left", (event.pageX + 14) + "px")
         .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseleave", function () {
      d3.select(this).transition().duration(150).attr("r", 5).attr("opacity", dotAlpha);
      tip.style("opacity", 0);
    });
}