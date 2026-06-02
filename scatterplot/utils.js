
const data = await d3.csv("output.csv");
function getColorFunc() {
    
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

// color scale
    const color = d3.scaleOrdinal()
        .domain(genresList)
        .range(d3.quantize(t => d3.interpolateRainbow(t * 0.8 + 0.1), genresList.length));

    return color
}

export const genreColor = getColorFunc();