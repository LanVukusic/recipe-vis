import csv, json
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
DATA_DIR = PROJECT_DIR / "data"
WEB_DATA_DIR = PROJECT_DIR / "web" / "data"

FLAVOR_FILE = DATA_DIR / "flavor_edges.csv"
OUT_INGS = WEB_DATA_DIR / "flavor_ingredients.json"

def main():
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    ings = set()
    with FLAVOR_FILE.open("r", newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        for row in r:
            if not row or row[0].lstrip().startswith("#") or len(row) < 3:
                continue
            a, b = row[0].strip(), row[1].strip()
            if a: ings.add(a)
            if b: ings.add(b)
    OUT_INGS.write_text(json.dumps(sorted(ings)), encoding="utf-8")
    print(f"Wrote {OUT_INGS} ({len(ings):,} ingredients)")

if __name__ == "__main__":
    main()
