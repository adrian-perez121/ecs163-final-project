# Analyzing Trends in The Movie Industry

Welcome to Group 11's implementation for their project!

It’s no secret that movie trends have changed over the years. There is no guarantee that the genre most popular 20 years ago is still popular today. Hence, the story we want to tell for our data visualization is a story of time. Through our interactive visualization users will be able to view how the trends in popular genres have shifted over the years.

## Structure

The main directories of interest are `data`, `data_processing`, `groupedBarChartRating`, `pcp`, `pieChart`, `scatterplot`, and `streamGraph`. The other files like `package-lock.json` and `package.json` were used for developer purposes.

### The Data

The `data` directory contains the filter scripts (written in python) to filter the original data set that came from kaggle. The original dataset can be downloaded from [here](https://www.kaggle.com/datasets/alanvourch/tmdb-movies-daily-updates). This dataset is over 700MB large so we were not able to include it in this repository.

The `data_processing` directory there are two python scripts and two JS scripts. First we will talk about the python scripts since these do the preliminary data processing.

The `all_movies_processor.py` file was used to reformat the release date column to only be the year. The processed data is still large so you will not see it in the GitHub Repository. TAYLOR TALK ABOUT YOUR DATA FILTER HERE. The final result is data that has been filtered to only include revenue and review.

The JS files are used to process the dataset that was created by `all_movies_processor.py`. The processed data is stored in two JSON files, each for their respective visualizations. This way the stream graph and pie chart can immediately start loading the visualization without having to worry about processing times.

### Project Components

The other directories, `groupedBarChartRating`, `pcp`, `pieChart`, `scatterplot`, and `streamGraph` each contain the implementation for the various types of visualizations used on our website. There is also an HTML file which demonstrates the visualization working. These examples are purely for testing if the implementation code works.

## Installation and Execution

### Steps for Running From Scratch

1. Clone this repository

2. Ensure that you have Python and Node.js installed.

3. Once this is verified run `process_all_data.sh` from the project directory. This will fetch the data from kaggle and process it.

4. Once this is done, you can open `index.html` and you will see the visualization.

Fun fact: Since the dataset is updated daily, our visualization will also be updated when `process_all_data.sh` is run.

### Steps for Running the Visualization Without Reprocessing All The Data

1. You can just open the [link](https://adrian-perez121.github.io/ecs163-final-project/) to our GitHub page!

## GROUP MEMBERS

Refer to [this](./CONTRIBUTING.md) when working on the project
