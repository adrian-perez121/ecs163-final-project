import { genreColor } from "../utils.js"; 

export async function renderBarChart(genre, containerId) {
    // 1. Clear previous chart
    const container = d3.select(containerId);
    container.selectAll("*").remove();
    
    // Add dynamic title
    container.append("div")
        .attr("class", "chart-title")
        .text(`Average IMDb Rating by Budget & Era - ${genre}`);

    // Retrieve the base color for the selected genre
    const baseColor = genreColor(genre);

    // 2. Configuration Bounds
    const eras = [1911, 1934, 1957, 1980, 2003, 2026];
    const eraLabels = {
        "1911": "1911-1933", "1934": "1934-1956", "1957": "1957-1979",
        "1980": "1980-2002", "2003": "2003-2025", "2026": "2026+"
    };
    const categories = ["$ 0 - 1k", "$ 1.1k - 1 mil", "$ 1.1 mil - 100 mil", "$ 100 mil+"];

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

    function getBudgetCategory(budget) {
        if (budget >= 0 && budget <= 1000) return categories[0];
        if (budget > 1000 && budget <= 1000000) return categories[1];
        if (budget > 1000000 && budget <= 100000000) return categories[2];
        if (budget > 100000000) return categories[3];
        return null;
    }

    // 3. Setup Dimensions
    const margin = { top: 40, right: 140, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // 4. Create SVG & Tooltip inside the passed containerId
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "bar-tooltip")
        .style("opacity", 0);

    // 5. Load and Process Data
    const rawData = await d3.csv("./output.csv");
    
    // Filter by passed genre
    let genreData = rawData.filter(d => {
        if (!d.genres) return false;
        const genres = d.genres.split(",").map(g => g.trim());
        return genres.includes(genre);
    });

    let binnedData = {};
    eras.forEach(e => {
        binnedData[e] = {};
        categories.forEach(c => { binnedData[e][c] = { sum: 0, count: 0 }; });
    });

    genreData.forEach(d => {
        const year = +d.release_date;
        const budget = +d.budget;
        const rating = +d.imdb_rating;
        const era = getEraStartYear(year);
        const cat = getBudgetCategory(budget);

        if (era !== null && cat !== null && !isNaN(rating)) {
            binnedData[era][cat].sum += rating;
            binnedData[era][cat].count += 1;
        }
    });

    let chartData = [];
    eras.forEach(era => {
        categories.forEach((cat, index) => {
            const stats = binnedData[era][cat];
            chartData.push({
                era: era, cat: cat, catIndex: index,
                value: stats.count > 0 ? stats.sum / stats.count : 0,
                count: stats.count
            });
        });
    });

    // 6. Scales & Axes
    const xEra = d3.scaleBand().domain(eras).range([0, width]).padding(0.2);
    const xCat = d3.scaleBand().domain(categories).range([0, xEra.bandwidth()]).padding(0.05);
    const yScale = d3.scaleLinear().domain([0, 10]).range([height, 0]);

    // Gridlines
    g.append("g").attr("class", "grid")
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    // X Axis
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xEra).tickFormat(d => eraLabels[d] || d))
        .append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", 40)
        .style("text-anchor", "middle").text("Time Period (Era)");

    // Y Axis
    g.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(5))
        .append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -40)
        .style("text-anchor", "middle").text("Average IMDb Rating");

    // 7. Draw Bars
    const eraGroups = g.selectAll(".era-group")
        .data(eras).enter().append("g").attr("class", "era-group")
        .attr("transform", d => `translate(${xEra(d)},0)`);

    eraGroups.each(function(era) {
        const groupData = chartData.filter(d => d.era === era);
        d3.select(this).selectAll(".bar")
            .data(groupData).enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => xCat(d.cat))
            .attr("width", xCat.bandwidth())
            .attr("y", d => yScale(d.value))
            .attr("height", d => height - yScale(d.value))
            // NEW: Apply the genre color and scale the opacity based on the budget index
            .attr("fill", baseColor)
            .attr("opacity", d => 0.4 + (d.catIndex * 0.2)) 
            .on("mouseover", function (event, d) {
                tooltip.style("opacity", 1)
                       .html(`<strong>${genre}</strong><br/>Era: ${eraLabels[d.era]}<br/>Budget: ${d.cat}<br/>Avg Rating: ${d.value.toFixed(1)}<br/>Movies: ${d.count}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX) + "px")
                       .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0);
            })
            .on("click", function (event, d) {
                const budgetMap = {
                    "$ 0 - 1k": "0-1000", "$ 1.1k - 1 mil": "1000-1000000",
                    "$ 1.1 mil - 100 mil": "1000000-100000000", "$ 100 mil+": "100000000-999999999999"
                };
                const params = new URLSearchParams({
                    genre: genre, budgetRange: budgetMap[d.cat], yearRange: eraLabels[d.era] || d.era
                });
                window.location.href = `../scatterplot/scatter.html?${params}`;
            });
    });

    // 8. Legend
    const legendG = g.append("g").attr("class", "legend")
        .attr("transform", `translate(${width + 20},10)`);

    categories.forEach((cat, i) => {
        const item = legendG.append("g").attr("transform", `translate(0, ${i * 24})`);
        item.append("rect").attr("width", 14).attr("height", 14)
            .attr("rx", 2)
            // NEW: Apply the same base color and opacity to the legend blocks
            .attr("fill", baseColor)
            .attr("opacity", 0.4 + (i * 0.2)); 
        item.append("text").attr("x", 24).attr("y", 11)
            .text(cat).style("font-size", "12px").style("fill", "#4b5563");
    });
}