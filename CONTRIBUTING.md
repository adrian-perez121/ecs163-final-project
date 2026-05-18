# Group Member Rules

## Phase 1

Each person will be assigned to implement one of the following implementations. Each person should work on their own branch and their own directory. In this directory they should have an html file (call it whatever you want besides index) and a js file (call it what ever you want besides main) where they work on their visualization implementation.

### Visualizations

#### Streamgraph (Overview)

- Scope: Works on all the data
- X: Years
- Y: Movie Count

#### Multiple Bar Chart (Specific genre)

- Scope: Specific (single genre)
- X: Years
- Y: Rating or Revenue (test different attributes)

#### Scatterplot (Focus + Specific)
- Scope: Uses a range of budget values (from the multiple bar chart)
- X: Budget
- Y: Rating or Revenue
- Notes: Test different attributes

#### Pie Chart (Specific year)

- Scope: Distribution of movie genres for a specific year

#### Parallel Coordinates Plot (Overview of trends)

- Y-axes:
  - Budget
  - Revenue
  - Rating
- Notes: Use filters to isolate a few or specific genres

### Key things:

- If you are working on drill down visualization make sure it is adaptable to different types of subsets not just one
- Each plot should have its own legend
- We can worry about connecting things later
- Make sure to use d3 js version 6 or version 7
- Make your own branches
- For good hints add `import * as d3 from 'd3'` to the top of the js file
