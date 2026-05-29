// NOTES: This file was run using npm. We needed to put our processing logic here because
// processing 1 million records of data would take too long on the website and d3 parsing for
// for csv's cannot handle that much data

import fs from "node:fs";
import * as d3 from "d3";
import { parse } from "csv-parse";

const dataPath = "../all_movies_after_1920.csv";

console.log("started processing the data");

// processes data
const yearGenreCounts = new Map();
const allGenres = new Set();

const input = fs.createReadStream(new URL(dataPath, import.meta.url));
const parser = input.pipe(parse({ columns: true, trim: true }));

for await (const d of parser) {
  let year = parseFloat(d.release_date);
  year = Math.floor(year);

  const genres = (d.genres || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!yearGenreCounts.has(year)) yearGenreCounts.set(year, new Map());
  const counts = yearGenreCounts.get(year);
  genres.forEach((g) => {
    allGenres.add(g);
    counts.set(g, (counts.get(g) || 0) + 1);
  });
}

const genresList = Array.from(allGenres).sort();

const stream_data_object = {};
const yearGenreCountsObject = {};

for (const [year, genreMap] of yearGenreCounts) {
  if (year) {
    yearGenreCountsObject[year] = [...genreMap.entries()];
  }
}

stream_data_object["yearGenreCounts"] = JSON.stringify(yearGenreCountsObject);
stream_data_object["genresList"] = JSON.stringify(genresList);

fs.writeFile(
  "stream_data.json",
  JSON.stringify(stream_data_object),
  "utf8",
  (err) => {
    if (err) {
      console.log("Something went wrong", err.message);
      return;
    }
    console.log("finished processing the data");
  },
);
