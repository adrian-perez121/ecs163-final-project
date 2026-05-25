const TARGET_GENRE = "action";

(function () {
  "use strict";

  // 1. Structure Configuration Bounds
  const eras = [1911, 1934, 1957, 1980, 2003, 2026];
  const eraLabels = {
    "1911": "1911-1933",
    "1934": "1934-1956",
    "1957": "1957-1979",
    "1980": "1980-2002",
    "2003": "2003-2025",
    "2026": "2026+"
  };

  const categories = ["$ 0 - 1k", "$ 1.1k - 1 mil", "$ 1.1 mil - 100 mil", "$ 100 mil+"];

  // Helper function to bucket release dates into eras
  function getEraStartYear(year) {
    if (!year) return null;
    if (year >= 1911 && year <= 1933) return 1911;
    if (year >= 1934 && year <= 1956) return 1934;
    if (year >= 1957 && year <= 1979) return 1957;
    if (year >= 1980 && year <= 2002) return 1980;
    if (year >= 2003 && year <= 2025) return 2003;
    if (year >= 2026) return 2026;
    return null;
  }

  // Helper function to bucket budgets into scale categories
  function getBudgetCategory(budget) {
    if (budget === null || budget === undefined || budget < 0) return null;
    if (budget <= 1000) return "$ 0 - 1k";
    if (budget <= 1000000) return "$ 1.1k - 1 mil";
    if (budget <= 100000000) return "$ 1.1 mil - 100 mil";
    return "$ 100 mil+";
  }

  // Helper to cleanly capitalize the current target genre for display titles
  const displayGenre = TARGET_GENRE.charAt(0).toUpperCase() + TARGET_GENRE.slice(1);

  // 2. Generate Dynamic Text Headings and Layout Anchor Bounds via D3
  const container = d3.select("#chart-container");
  
  // Clear layout elements to prevent duplicate painting on Live Server reload
  container.html("");

  container.append("h2")
    .attr("class", "chart-title")
    .text(`Average IMDb Rating by Budget & Era — ${displayGenre}`);

  container.append("div")
    .attr("class", "chart-subtitle")
    .text(`Filtered Scope: ${displayGenre} Genre Only`);

  const chartAnchor = container.append("div")
    .attr("id", "chart");

  // 3. Asynchronously Load and Process output.csv
  d3.csv("./output.csv").then(function (rawMovies) {
    
    // Parse strings from CSV columns into clean types
    const processedMovies = rawMovies.map(d => {
      return {
        release_date: d.release_date ? +d.release_date : null,
        budget: d.budget ? +d.budget : null,
        imdb_rating: d.imdb_rating ? +d.imdb_rating : null,
        genres: d.genres ? d.genres : ""
      };
    });

    // Pipeline: Filter using the dynamic variable string criteria and drop rows missing ratings
    const filteredMovies = processedMovies.filter(d => 
      d.genres.toLowerCase().includes(TARGET_GENRE.toLowerCase()) && d.imdb_rating !== null
    );

    // Multi-level Rollup mapping structure to aggregate mathematical means
    const aggregatedMap = d3.rollup(
      filteredMovies,
      v => d3.mean(v, d => d.imdb_rating),
      d => getEraStartYear(d.release_date),
      d => getBudgetCategory(d.budget)
    );

    // Flatten calculated map objects into array arrays for presentation binding
    const rows = [];
    eras.forEach(era => {
      categories.forEach((cat, ci) => {
        const eraMap = aggregatedMap.get(era);
        const avgValue = eraMap ? eraMap.get(cat) : undefined;
        
        if (avgValue !== undefined && avgValue !== null) {
          rows.push({
            era: String(era),
            cat: cat,
            catIndex: ci,
            value: avgValue
          });
        }
      });
    });

    // 4. Chart Graphic Dimensions Layout
    const margin = { top: 15, right: 200, bottom: 60, left: 70 };
    const totalW  = 820;
    const totalH  = 420;
    const width   = totalW  - margin.left - margin.right;
    const height  = totalH  - margin.top  - margin.bottom;

    const COLORS = ["#10ff00", "#00cf00", "#009f00", "#006000"];

    // 5. Mapping Scales Context Setup
    const xEra = d3.scaleBand()
      .domain(eras.map(String))
      .range([0, width])
      .paddingInner(0.25)
      .paddingOuter(0.15);

    const xCat = d3.scaleBand()
      .domain(categories)
      .range([0, xEra.bandwidth()])
      .padding(0.06);

    const yScale = d3.scaleLinear()
      .domain([0, 10])
      .range([height, 0])
      .nice();

    // 6. SVG Generator Initialization
    const svg = chartAnchor.append("svg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Background Gridlines: Cleansed of the outer bounding path box to eliminate the right line
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(""))
      .select(".domain")
      .remove();

    // X Axis Layout
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xEra).tickFormat(d => eraLabels[d] || d).tickSizeOuter(0));

    g.append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height + 48)
      .attr("text-anchor", "middle")
      .text("Years");

    // Y Axis Layout
    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0));

    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height / 2))
      .attr("y", -54)
      .attr("text-anchor", "middle")
      .text("Average IMDb Rating");

    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // 7. Render Visual Bar Rectangles
    const eraGroups = g.selectAll(".era-group")
      .data(eras.map(String))
      .join("g")
      .attr("class", "era-group")
      .attr("transform", era => `translate(${xEra(era)},0)`);

    eraGroups.each(function (era) {
      const eraData = rows.filter(d => d.era === era);

      d3.select(this)
        .selectAll(".bar")
        .data(eraData)
        .join("rect")
        .attr("class", d => `bar bar--cat${d.catIndex}`)
        .attr("x",      d => xCat(d.cat))
        .attr("width",  xCat.bandwidth())
        .attr("y",      d => yScale(d.value))
        .attr("height", d => height - yScale(d.value))
        .on("mousemove", function (event, d) {
          tooltip
            .classed("visible", true)
            .html(`<strong>${d.cat}</strong>Era: ${eraLabels[d.era] || d.era}<br/>Avg ${displayGenre} Rating: ${d.value.toFixed(2)}`)
            .style("left",  (event.pageX + 14) + "px")
            .style("top",   (event.pageY - 36) + "px");
        })
        .on("mouseleave", function () {
          tooltip.classed("visible", false);
        });
    });

    // 8. Build Side Legend
    const legendX = width + 20;
    const legendY = 10;
    const swatchSize = 14;
    const rowH = 26;

    const legendG = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX},${legendY})`);

    categories.forEach((cat, i) => {
      const item = legendG.append("g")
        .attr("class", "legend-item")
        .attr("transform", `translate(0,${i * rowH})`);

      item.append("rect")
        .attr("width", swatchSize)
        .attr("height", swatchSize)
        .attr("fill", COLORS[i])
        .attr("rx", 3);

      item.append("text")
        .attr("x", swatchSize + 8)
        .attr("y", swatchSize / 2)
        .text(cat);
    });

  }).catch(function (error) {
    console.error("Error loading or processing output.csv file:", error);
  });

})();