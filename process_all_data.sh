# Make sure node packages work
npm install

# Get the data
curl -L -o ./data/tmdb-movies-daily-updates.zip\
  https://www.kaggle.com/api/v1/datasets/download/alanvourch/tmdb-movies-daily-updates

unzip data/tmdb-movies-daily-updates.zip -d data

# Preliminary Python Processing
cd data_processing
python3 -m venv .venv
. .venv/bin/activate
pip install pandas

echo "Processing data"

python3 all_movies_processor.py
python3 with_budgets_and_ratings.py

echo "Finished processing data"

deactivate
rm -rf .venv

# Processing with node
node pie_data_processor.js
node stream_data_processor.js


