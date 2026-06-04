// NOTES: This file was run using npm. We needed to put our processing logic here because
// processing 1 million records of data would take too long on the website and d3 parsing for
// for csv's cannot handle that much data

import fs from "node:fs";
import * as d3 from "d3";
import { parse } from "csv-parse";

const dataPath = "../data/all_movies.csv";

console.log("Start processing the data for pie chart");

const parseGenres = (genres) => {
  return genres
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
};

// This maps the years to their respective data
const yearsMap = new Map();

const input = fs.createReadStream(new URL(dataPath, import.meta.url));
const parser = input.pipe(parse({ columns: true, trim: true }));

for await (const d of parser) {
  let year = parseFloat(d.release_date);
  year = Math.floor(year);

  // This creates pie chart data for every year in the data
  for await (const d of parser) {
    let year = parseFloat(d.release_date);
    year = Math.floor(year);

    if (!yearsMap.has(year)) {
      yearsMap.set(year, new Map());
    }

    const genres = parseGenres(d.genres);
    const counts = yearsMap.get(year);

    for (const genre of genres) {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
  }
}

const dataObject = {};

for (const [year, counts] of yearsMap) {
  if (!Number.isNaN(year)) {
    dataObject[year] = [...counts.entries()];
  }
}

fs.writeFile("../data/pie_data.json", JSON.stringify(dataObject), "utf-8", (err) => {
  if (err) {
    console.log("Something went wrong", err.message);
    return;
  }
  console.log("finished processing the data");
});
