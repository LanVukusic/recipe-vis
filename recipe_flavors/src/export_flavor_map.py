import csv
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
DATA_DIR = PROJECT_DIR / "data"
WEB_DATA_DIR = PROJECT_DIR / "web" / "data"

FLAVOR_FILE = DATA_DIR / "flavor_edges.csv"
OUT_MAP = WEB_DATA_DIR / "flavor_map.json"
OUT_INGS = WEB_DATA_DIR / "flavor_ingredients.json"


def main():
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    m = {}
    ingredients = set()

    with FLAVOR_FILE.open("r", newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        for row in r:
            if not row or row[0].lstrip().startswith("#"):
                continue
            if len(row) < 3:
                continue
            a = row[0].strip()
            b = row[1].strip()
            try:
                w = int(float(row[2]))
            except ValueError:
                continue

            if not a or not b or a == b:
                continue

            # store as "a|b" with a<b for canonical key
            if a < b:
                key = f"{a}|{b}"
            else:
                key = f"{b}|{a}"

            m[key] = w
            ingredients.add(a)
            ingredients.add(b)

    OUT_MAP.write_text(json.dumps(m), encoding="utf-8")
    OUT_INGS.write_text(json.dumps(sorted(ingredients)), encoding="utf-8")

    print(f"Wrote flavor map: {OUT_MAP} ({len(m):,} pairs)")
    print(f"Wrote ingredient list: {OUT_INGS} ({len(ingredients):,} ingredients)")


if __name__ == "__main__":
    main()
