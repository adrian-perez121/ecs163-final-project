import { genreColor } from "../utils.js";
//margins
const margin = { top: 60, right: 40, bottom: 60, left: 80 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const dimensions = ["budget", "revenue", "rating", "popularity"];

//initial append
const svg = d3.select("#pcp-chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

// The main container group translated away from the SVG edge
const mainGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

mainGroup.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -35)
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("font-family", "sans-serif")
    .style("fill", "#000000")
    .text("Movie Attribute Comparisons by Genre");

// Dedicated sub-groups so layers stay in order (lines behind axes)
const linesGroup = mainGroup.append("g").attr("class", "lines-group");
const axesGroup = mainGroup.append("g").attr("class", "axes-group");

// X Scale: Places the vertical attribute axes evenly across the width
const xScale = d3.scalePoint()
    .range([0, width])
    .domain(dimensions);

//update data function

function updatePCP(data) {

    // linear Y-scale for each attribute column
    const yScales = {};
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[dim])) // Dynamic min/max for this specific attribute
            .range([height, 0]);
    });

    // Line generator
    const lineGenerator = d3.line()
        .x(d => xScale(d.dim))
        .y(d => yScales[d.dim](d.val));

    // Helper to extract points from a single row object
    function pathCoordinates(genreRow) {
        return lineGenerator(dimensions.map(dim => {
            return { dim: dim, val: +genreRow[dim] };
        }));
    }

    const lines = linesGroup.selectAll(".genre-path")
        .data(data, d => d.genre); // Bind using the genre name as a unique key

    // smoothly fades out exiting lines
    lines.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    // add and merge new lines

    //smoother transition to morph lines to new coord
    lines.enter()
        .append("path")
        .attr("class", "genre-path")
        .style("fill", "none")
        .style("stroke-width", "2.5px")
        .style("opacity", 0) // Start invisible for fade-in
        .style("stroke", d => genreColor(d.genre)) // Standardized color synchronization
        .merge(lines)
        .transition()
        .duration(500)
        .attr("d", pathCoordinates)
        .style("opacity", 0.8);

    const pcp_tooltip = d3.select("#pcp-tooltip");

    linesGroup.selectAll(".genre-path")
        .on("mouseover", function (event, d) {
            pcp_tooltip.style("display", "block");
            // formatting for attributes
            const moneyFormat = d3.format(",.0f");
            const numberFormat = d3.format(".1f");

            pcp_tooltip.html(`
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: ${genreColor(d.genre)};">
                    Genre: ${d.genre}
                </div>
                <hr style="border: 0; border-top: 1px solid #ffffff; margin: 4px 0;"/>
                <strong>Avg Budget:</strong> $${moneyFormat(d.budget)}<br/>
                <strong>Avg Revenue:</strong> $${moneyFormat(d.revenue)}<br/>
                <strong>Avg Rating:</strong> ${numberFormat(d.rating)}<br/>
                <strong>Avg Popularity:</strong> ${numberFormat(d.popularity)}
            `);
        })
        .on("mousemove", function (event) {
            // make tooltip for pcp next to cursor
            pcp_tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseleave", function () {
            // remove tooltip if leaving pcp line
            pcp_tooltip.style("display", "none")
        });

    const axes = axesGroup.selectAll(".axis-container")
        .data(dimensions);

    const axesEnter = axes.enter()
        .append("g")
        .attr("class", "axis-container")

    const axesMerged = axes.merge(axesEnter) // preparing for axes label formatting
        .attr("transform", dim => `translate(${xScale(dim)}, 0)`);

    axes.exit().remove();

    // axes labels
    axesMerged.each(function (dim) {
        const axisFormat = d3.axisLeft(yScales[dim]);

        // if the attribute is budget or revenue, format tick values to be in the form $X.M (M = Millions)
        if (dim === "budget" || dim === "revenue") {
            axisFormat.tickFormat(d3.format("$.2s"));
        }
        // render axes back on screen
        d3.select(this)
            .transition()
            .duration(800)
            .call(axisFormat);
    });

    const labels = axesMerged.selectAll(".axis-label")
        .data(dim => [dim]);

    labels.enter()
        .append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("fill", "#000000")
        .attr("y", height + 35)
        .merge(labels)
        .text(dim => dim.toUpperCase().replace("_", " "));
}

// rawData form outputCSV
const rawData = await d3.csv("../output.csv");

// new function we are using in stream.js
export function updatePCPByYear(year) {

    let genreTotals = {};

    // Update the title dynamically based on the year passed in
    const titleText = year ? `Movie Attribute Comparisons by Genre (${year})` : "Movie Attribute Comparisons by Genre (All Years)";
    d3.select("#pcp-chart .chart-title").text(titleText);

    const filteredData = year ? rawData.filter(d => {
        if (!d.release_date) return false;
        const rowYear = parseInt(d.release_date.slice(0, 4), 10);
        return rowYear === (year + 1);
    }) : rawData;

    filteredData.forEach(d => {
        // skip missing values
        if (!d.genres || !d.budget || !d.revenue || !d.imdb_rating || !d.popularity) return;
        if (d.genres.trim() === "" || d.imdb_rating.trim() === "" || d.popularity.trim() === "") return;

        // parsing
        let movieBudget = parseFloat(d.budget);
        let movieRevenue = parseFloat(d.revenue);
        let movieRating = parseFloat(d.imdb_rating);
        let moviePopularity = parseFloat(d.popularity);

        // if numeric parse float failed, skip
        if (isNaN(movieBudget) || isNaN(movieRevenue) || isNaN(movieRating) || isNaN(moviePopularity)) {
            return;
        }

        // loop through valid attributes for that movie
        let movieGenres = d.genres.split(",");

        movieGenres.forEach(genreStr => {
            let currentGenre = genreStr.trim();
            if (currentGenre === "") return;

            if (!genreTotals[currentGenre]) {
                genreTotals[currentGenre] = {
                    genre: currentGenre,
                    budget: 0,
                    revenue: 0,
                    rating: 0,
                    popularity: 0,
                    count: 0
                };
            }

            // incrementing valid values
            genreTotals[currentGenre].budget += movieBudget;
            genreTotals[currentGenre].revenue += movieRevenue;
            genreTotals[currentGenre].rating += movieRating;
            genreTotals[currentGenre].popularity += moviePopularity;
            genreTotals[currentGenre].count += 1;
        });
    });

    // averaging the values
    const finalPCPData = Object.keys(genreTotals).map(key => {
        let g = genreTotals[key];
        return {
            genre: g.genre,
            budget: g.budget / g.count,
            revenue: g.revenue / g.count,
            rating: g.rating / g.count,
            popularity: g.popularity / g.count
        };
    });

    console.log("Processed PCP Data Array:", finalPCPData);
    finalPCPData.sort((a, b) => a.genre.localeCompare(b.genre));

    // update
    updatePCP(finalPCPData);
}
updatePCPByYear();