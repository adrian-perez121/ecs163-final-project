import pandas as pd

# 1. Load your CSV file
df = pd.read_csv('../data/TMDB_all_movies.csv')

# 2. Convert the date column to datetime objects
# Replace 'release_date' with the actual name of your column
df['release_date'] = pd.to_datetime(df['release_date']).dt.year

# Optional: Save the filtered data to a new CSV
df.to_csv('../data/all_movies.csv', index=False)