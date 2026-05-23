d3.csv("output.csv").then(data => {
    
    // processes data
    const yearGenreCounts = new Map();
    const allGenres = new Set();
    
    data.forEach(d => {
        
        // extracts and processes Year
        let year = parseFloat(d.release_date);
        year = Math.floor(year);        

        // splits Genres
        const genres = d.genres.split(",").map(g => g.trim()).filter(g => g.length > 0);
        
        if (!yearGenreCounts.has(year)) {
            yearGenreCounts.set(year, new Map());
        }
        // aggregates 
        genres.forEach(g => {
            allGenres.add(g);
            const counts = yearGenreCounts.get(year);
            counts.set(g, (counts.get(g) || 0) + 1);
        });
    });

    const genresList = Array.from(allGenres).sort();
    const minYear = d3.min(Array.from(yearGenreCounts.keys()));
    const maxYear = d3.max(Array.from(yearGenreCounts.keys()));
    
    // final aggreagted array
    const chartData = [];
    for (let y = minYear; y <= maxYear; y++) {
        const entry = { year: y };
        genresList.forEach(g => {
            entry[g] = yearGenreCounts.has(y) ? (yearGenreCounts.get(y).get(g) || 0) : 0;
        });
        chartData.push(entry);
    }

    // SVG dimensions
    const width = 900;
    const height = 600;
    const margin = { top: 20, right: 30, bottom: 80, left: 80 };
    
    const svg = d3.select("#chart-container").append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
        
    // Stack Generator
    // stackOffsetNone has it at Y=0 so Y-axis represents accurate combined movie counts
    const stack = d3.stack()
        .keys(genresList)
        .offset(d3.stackOffsetNone) 
        .order(d3.stackOrderNone);
        
    const series = stack(chartData);
    
    // sets scales
    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.year))
        .range([0, width]);
        
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, layer => d3.max(layer, d => d[1]))])
        .range([height, 0]);
        
    // color scale
    const color = d3.scaleOrdinal()
        .domain(genresList)
        .range(d3.quantize(t => d3.interpolateRainbow(t * 0.8 + 0.1), genresList.length));
        
    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);
                
    const tooltip = d3.select("#tooltip");
    
    svg.selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .attr("opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1).attr("stroke", "#000").attr("stroke-width", 1);
            tooltip.style("display", "block").html(`<b>Genre:</b> ${d.key}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                   .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.8).attr("stroke", "#fff").attr("stroke-width", 0.5);
            tooltip.style("display", "none");
        });
        
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 60)
        .attr("fill", "black")
        .style("font-size", "18px")
        .text("Year");
        
    svg.append("g")
        .call(d3.axisLeft(y))
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
    genresList.forEach(genre => {
        const item = legendContainer.append("div").attr("class", "legend-item");
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", color(genre));
        item.append("span").text(genre);
    });

});