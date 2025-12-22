import pandas as pd
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---- CONFIG ----
CSV_PATH = "../simplified_dataset.csv"
RATING_COLUMN = "rating"
MAX_WORKERS = 10       # adjust (5–20 is reasonable)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; RatingScraper/1.0)"
}
# ----------------


def normalize_url(url: str) -> str:
    if not url.startswith("http"):
        url = "http://" + url

    if "cookbooks.com" in url:
        url = url.replace("https://", "http://")

    return url


def get_rating(index, url):
    """Fetch rating and return (index, rating)."""
    try:
        url = normalize_url(url)

        response = requests.get(
            url,
            headers=HEADERS,
            timeout=10,
            verify=False
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        rating_div = soup.find("div", id="star-rating")
        if not rating_div:
            return index, None

        rating_tag = rating_div.find("strong")
        if not rating_tag:
            return index, None

        rating = rating_tag.get_text(strip=True)
        return index, rating

    except Exception as e:
        print(f"[ERROR] {url}: {e}")
        return index, None


def main():
    df = pd.read_csv(CSV_PATH)

    if RATING_COLUMN not in df.columns:
        df[RATING_COLUMN] = None

    # Only scrape rows without a rating
    tasks = [
        (idx, row["link"])
        for idx, row in df.iterrows()
        if pd.isna(row[RATING_COLUMN])
    ]

    print(f"Scraping {len(tasks)} recipes using {MAX_WORKERS} threads")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [
            executor.submit(get_rating, idx, url)
            for idx, url in tasks
        ]

        for future in as_completed(futures):
            idx, rating = future.result()
            df.at[idx, RATING_COLUMN] = rating
            print(f"Updated index {idx} with rating: {rating}")

    df.to_csv(CSV_PATH, index=False)
    print("CSV updated successfully.")


if __name__ == "__main__":
    main()
