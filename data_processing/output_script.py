import pandas as pd

# Read csv
df = pd.read_csv('../data/TMDB_all_movies.csv')

# Filter out movies that have a budget and revenue of 0
df = df[(df['budget'] != 0) & (df['revenue'] != 0)]

# Convert to acceptable date format
df['release_date'] = pd.to_datetime(df['release_date']).dt.year

# Sort values by year ascending
df = df.sort_values(['release_date', 'revenue'], ascending=[True, False])

# Save ot new csv
df.to_csv('../data/output.csv', index=False)