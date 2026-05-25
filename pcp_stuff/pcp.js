//margins
const margin = { top: 60, right: 220, bottom: 60, left: 80 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const dimensions = ["budget", "revenue", "rating", "popularity"];

//initial append
const svg = d3.select("#pcp-chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

// The main container group translated away from the SVG edge
const mainGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Dedicated sub-groups so layers stay in order (lines behind axes)
const linesGroup = mainGroup.append("g").attr("class", "lines-group");
const axesGroup = mainGroup.append("g").attr("class", "axes-group");

// X Scale: Places the vertical attribute axes evenly across the width
const xScale = d3.scalePoint()
    .range([0, width])
    .domain(dimensions);

// Color Scale: Distinct colors for our different movie genres

// Keep a global placeholder variable
let colorScale;
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

    // if updating lines, remove existing lines
    lines.exit().remove();

    // add and merge new lines
    lines.enter()
        .append("path")
        .attr("class", "genre-path")
        .merge(lines)
        .attr("d", pathCoordinates)
        .style("stroke", d => colorScale(d.genre)); // Color code path by genre


    const axes = axesGroup.selectAll(".axis-container")
        .data(dimensions);

    const axesEnter = axes.enter()
        .append("g")
        .attr("class", "axis-container")
        .attr("transform", dim => `translate(${xScale(dim)}, 0)`);

    // axes labels
    axesEnter.append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(dim => dim.toUpperCase().replace("_", " "));

    // redraw axes
    axes.merge(axesEnter)
        .each(function (dim) {
            d3.select(this).call(d3.axisLeft(yScales[dim]));
        });


    // Legends
    let legendG = mainGroup.selectAll(".legend-container-group").data([null]);
    legendG = legendG.enter()
        .append("g")
        .attr("class", "legend-container-group")
        .merge(legendG)
        .attr("transform", `translate(${width + 40}, 20)`); // Positions it 40px past the final axis

    // Legend Header
    let legendTitle = legendG.selectAll(".legend-title").data([null]);
    legendTitle.enter()
        .append("text")
        .attr("class", "legend-title")
        .attr("y", -15)
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("Genres");

    // Data Join for the individual legend rows
    const legendItems = legendG.selectAll(".legend-item")
        .data(data, d => d.genre);

    legendItems.exit().remove();

    const legendEnter = legendItems.enter()
        .append("g")
        .attr("class", "legend-item");

    legendEnter.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("rx", 3)
        .attr("stroke", "#fff")
        .attr("stroke-width", "1px");

    // text labels next to legend squares
    legendEnter.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .style("font-size", "12px")
        .style("alignment-baseline", "middle");

    // animate legend appearance
    legendItems.merge(legendEnter)
        .transition().duration(700)
        .attr("transform", (d, i) => `translate(0, ${i * 22})`);

    // Update colors and text 
    legendG.selectAll(".legend-item rect")
        .style("fill", d => colorScale(d.genre));

    legendG.selectAll(".legend-item text")
        .text(d => d.genre);
}

// data processing
d3.csv("output.csv").then(rawData => {

    let genreTotals = {};

    rawData.forEach(d => {
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


    const sortedGenresList = finalPCPData.map(d => d.genre);
    colorScale = d3.scaleOrdinal()
        .domain(sortedGenresList)
        .range(d3.quantize(t => d3.interpolateRainbow(t * 0.8 + 0.1), sortedGenresList.length));

    // update
    updatePCP(finalPCPData);
});