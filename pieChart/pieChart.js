import {genreColor} from "../utils.js"
const dataPath = "../output.csv";
const data = await d3.csv(dataPath);
const YearColumnName = "release_date";
const width = window.innerWidth;
const height = window.innerHeight;

// Fetching our processed data that was already processed
// this way we don't have to get the data on every page load
const dataObject = await fetch("../data_processing/pie_data.json").then(
  (r) => {
    if (!r.ok) {
      throw new Error(r.status);
    }

    return r.json();
  },
);

/**
 * Creates a pie chart that shows the proportion of movies in different genres for the specified year
 * @param {Object} container - The element where the pie chart will be put
 * @param {Object} layout - Contains information for where the pie chart will be positioned along with height and width
 * @param {Number} layout.left - Where the the pie chart will begin on the x axis
 * @param {Number} layout.top - Where the pie chart will begin on the y axis
 * @param {Number} layout.height - Height of pie chart
 * @param {Number} layout.width - Width of pie chart
 * @param {Object} margin - Margins for the pie chart
 * @param {Number} margin.left - Left margin
 * @param {Number} margin.right - Right margin
 * @param {Number} margin.top - Top margin
 * @param {Number} margin.bottom - Bottom margin
 * @param {Number} year - The year that pie chart will filter the data from
 */
function createPieChart(container, layout, margin, year) {
  const filteredData = data.filter((d) => d[YearColumnName] == year);
  const processedData = {};

  // Preparing the data for the pie chart
  const pieData = Object.fromEntries(dataObject[year])

  console.log(pieData)

  const radius = Math.min(layout.width / 2, layout.height / 2);
  const sortedKeys = Object.keys(pieData).sort((a, b) => d3.ascending(a, b));
  // Help from https://d3-graph-gallery.com/graph/pie_basic.html
  const pie = d3
    .pie()
    .value((d) => d[1])
    .sort((a, b) => {
      return d3.ascending(a[0], b[0]);
    });

  const dataReady = pie(Object.entries(pieData));

  // The slices
  // Help from https://gist.github.com/dbuezas/9306799
  const g = container.selectAll("g.pie-group")
    .data([null])
    .join("g")
    .attr("class", "pie-group")
    .attr("transform", `translate(${radius + margin.left}, ${radius + margin.top + 20})`);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  g.selectAll("path.pie-slice")
    .data(dataReady, d => d.data[0])
    .join("path")
    .attr("class", "pie-slice")
    .attr("fill", d => genreColor(d.data[0]))
    .attr("stroke", "white") 
    .each(function(d) {
      this._current = this._current || { startAngle: d.startAngle, endAngle: d.startAngle };
    })
    .transition()
    .duration(500)
    .attrTween("d", function(d) {
      const i = d3.interpolate(this._current, d);
      this._current = i(1);
      return t => arc(i(t));
    });

  g.selectAll("text.pie-title")
  .data([null])
  .join("text")
  .attr("class", "pie-title")
  .attr("x", 0)
  .attr("y", -radius - 10)
  .attr("text-anchor", "middle") 
  .style("font-size", "8px")
  .text(`Proportions of Genres for ${year}`)
}

export default createPieChart;

// const svg = d3.select("svg");
// const margins = { left: 80, right: 20, top: 80, bottom: 50 };
// const layout = { left: 0, top: 0, width: 200, height: 200 };

// createPieChart(svg, layout, margins, 1990);
