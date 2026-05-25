(function () {
  "use strict";

  // Dimensions
  const margin = { top: 20, right: 200, bottom: 60, left: 70 };
  const totalW  = 820;
  const totalH  = 440;
  const width   = totalW  - margin.left - margin.right;
  const height  = totalH  - margin.top  - margin.bottom;

  // Colour scale
  const COLORS = ["#b7e4b4", "#74c46e", "#3a9935", "#1a6412"];

  // ── Flatten data into D3-friendly rows ────────────────────────────────────
  const { eras, categories, values } = chartData;

  const rows = [];
  eras.forEach(era => {
    categories.forEach((cat, ci) => {
      const v = values[era][cat];
      if (v !== null) {
        rows.push({ era: String(era), cat, catIndex: ci, value: v });
      }
    });
  });

  // Scales
  // Outer scale: eras
  const xEra = d3.scaleBand()
    .domain(eras.map(String))
    .range([0, width])
    .paddingInner(0.25)
    .paddingOuter(0.15);

  // Inner scale: categories within each era
  const xCat = d3.scaleBand()
    .domain(categories)
    .range([0, xEra.bandwidth()])
    .padding(0.06);

  // Y scale based on dynamic revenue values
  const yMax = d3.max(rows, d => d.value) * 1.05 || 100000000;

  const yScale = d3.scaleLinear()
    .domain([0, yMax])
    .range([height, 0])
    .nice();

  // SVG root
  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Horizontal grid lines
  g.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-width)
        .tickFormat("")
    );

  // X axis
  g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xEra).tickSizeOuter(0));

  // X axis label
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 48)
    .attr("text-anchor", "middle")
    .text("Years");

  // Y axis
  g.append("g")
    .attr("class", "axis axis--y")
    .call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => {
          if (d >= 1e6) return `$${(d / 1e6).toFixed(0)}M`;
          if (d >= 1e3) return `$${(d / 1e3).toFixed(0)}K`;
          return `$${d}`;
        })
        .tickSizeOuter(0)
    );

  // Y axis label
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", -54)
    .attr("text-anchor", "middle")
    .text("Average Revenue");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

  // Bars
  // One group <g> per era
  const eraGroups = g.selectAll(".era-group")
    .data(eras.map(String))
    .join("g")
    .attr("class", "era-group")
    .attr("transform", era => `translate(${xEra(era)},0)`);

  // Bind per-category bars inside each era group
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
          .html(`<strong>${d.cat}</strong>Era: ${d.era}<br/>Avg Revenue: $${d.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
          .style("left",  (event.pageX + 14) + "px")
          .style("top",   (event.pageY - 36) + "px");
      })
      .on("mouseleave", function () {
        tooltip.classed("visible", false);
      });
  });

  // Legend
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

})();
