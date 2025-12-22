
# Recipe Rating Scraper

This script scrapes recipe ratings from recipe web pages and updates a CSV dataset with the retrieved ratings.  
It is designed to run **concurrently** for efficiency and safely resumes work by only scraping rows that do not yet have ratings.

---

## Features

- Reads recipe links from a CSV file
- Scrapes ratings from web pages using **BeautifulSoup**
- Uses **multithreading** for faster scraping
- Automatically skips rows that already have ratings
- Writes results back to the same CSV file
- Handles common URL formatting issues
- Suppresses SSL warnings for problematic sites

---

## Requirements

Install the required Python packages:

```bash
pip install pandas requests beautifulsoup4 urllib3
```

Python 3.8+ is recommended.

---

## Configuration

At the top of the script, you can adjust the following settings:

```python
CSV_PATH = "../simplified_dataset.csv"  # Path to your dataset
RATING_COLUMN = "rating"                # Column to store ratings
MAX_WORKERS = 10                        # Number of threads (5–20 recommended)
```

The CSV file **must** contain a column named:

```text
link
```

This column should store the URLs of the recipe pages.

---

## How It Works

1. Loads the CSV file into a pandas DataFrame
2. Ensures the rating column exists
3. Identifies rows where the rating is missing
4. Scrapes ratings concurrently using a thread pool
5. Updates each row as results return
6. Saves the updated CSV back to disk

Ratings are extracted from:

```html
<div id="star-rating">
    <strong>...</strong>
</div>
```

If the rating cannot be found or an error occurs, the value is left as `None`.

---

## Usage

Run the script directly:

```bash
python scrape_ratings.py
```

You will see console output indicating:
- Number of recipes being scraped
- Progress updates for each completed row
- Confirmation when the CSV is updated

---

## Error Handling

- Network errors are caught and logged
- Invalid or unreachable URLs are skipped
- SSL verification is disabled for compatibility with older sites

Errors do **not** stop the script — scraping continues.

---

## Notes & Best Practices

- Be respectful of target websites and avoid increasing `MAX_WORKERS` excessively
- Consider adding delays if scraping large datasets
- This script is intended for personal or research use

---

## License

This project is provided as-is with no warranty.  
Use responsibly.
