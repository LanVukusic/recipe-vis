import csv
import json
import itertools
from pathlib import Path

# ----------------------------
# Paths
# ----------------------------

PROJECT_DIR = Path(__file__).parent.parent
DATA_DIR = PROJECT_DIR / "data"
WEB_DATA_DIR = PROJECT_DIR / "web" / "data"

FLAVOR_FILE = DATA_DIR / "flavor_edges.csv"
RECIPE_FILE = DATA_DIR / "recipes.csv"

INDEX_FILE = WEB_DATA_DIR / "index.json"


# ----------------------------
# Load data
# ----------------------------

def load_flavor_edges(path: Path):
    """
    Load flavor network:
    (ingredient_a, ingredient_b) -> shared_compounds
    """
    pair2w = {}
    with path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            if row[0].lstrip().startswith("#"):
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

            key = tuple(sorted((a, b)))
            pair2w[key] = w

    return pair2w


def load_recipes(path: Path, max_recipes=None):
    """
    Load recipes:
    each row = cuisine, ingredient1, ingredient2, ...
    """
    recipes = []
    with path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            if row[0].lstrip().startswith("#"):
                continue

            cuisine = row[0].strip()
            ingredients = [x.strip() for x in row[1:] if x and x.strip()]

            # de-duplicate ingredients, preserve order
            seen = set()
            ing_unique = []
            for x in ingredients:
                if x not in seen:
                    ing_unique.append(x)
                    seen.add(x)

            if cuisine and len(ing_unique) >= 2:
                recipes.append({
                    "cuisine": cuisine,
                    "ingredients": ing_unique
                })

            if max_recipes and len(recipes) >= max_recipes:
                break

    return recipes


# ----------------------------
# Scoring helpers
# ----------------------------

def pair_weight(pair2w, a, b):
    if a == b:
        return 0
    return pair2w.get(tuple(sorted((a, b))), 0)


def compute_score_avg(pair2w, ingredients):
    pairs = list(itertools.combinations(ingredients, 2))
    if not pairs:
        return 0.0
    weights = [pair_weight(pair2w, a, b) for a, b in pairs]
    return sum(weights) / len(weights)


def heatmap_long(pair2w, ingredients):
    """
    Long format for Vega-Lite heatmap:
    [{x, y, value}, ...]
    """
    data = []
    for x in ingredients:
        for y in ingredients:
            data.append({
                "x": x,
                "y": y,
                "value": 0 if x == y else pair_weight(pair2w, x, y)
            })
    return data


def ingredient_contributions(pair2w, ingredients):
    """
    Mean compatibility of each ingredient with all others.
    """
    rows = []
    for a in ingredients:
        others = [b for b in ingredients if b != a]
        if not others:
            rows.append({"ingredient": a, "mean": 0.0})
        else:
            ws = [pair_weight(pair2w, a, b) for b in others]
            rows.append({"ingredient": a, "mean": sum(ws) / len(ws)})

    rows.sort(key=lambda r: r["mean"], reverse=True)
    return rows


# ----------------------------
# Main export
# ----------------------------

if __name__ == "__main__":
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    pair2w = load_flavor_edges(FLAVOR_FILE)
    recipes = load_recipes(RECIPE_FILE, max_recipes=50000)  # adjust the number if needed

    index = []

    for ridx, r in enumerate(recipes):
        cuisine = r["cuisine"]
        ingredients = r["ingredients"][:12]

        score = compute_score_avg(pair2w, ingredients)

        pairs = list(itertools.combinations(ingredients, 2))
        found = sum(1 for a, b in pairs if pair_weight(pair2w, a, b) > 0)
        coverage = found / len(pairs) if pairs else 0.0

        recipe_json = {
            "id": ridx,
            "cuisine": cuisine,
            "ingredients": ingredients,
            "score_avg": score,
            "pair_coverage": coverage,
            "heatmap": heatmap_long(pair2w, ingredients),
            "contributions": ingredient_contributions(pair2w, ingredients),
        }

        out_path = WEB_DATA_DIR / f"recipe_{ridx:04d}.json"
        out_path.write_text(json.dumps(recipe_json, indent=2), encoding="utf-8")

        # lightweight index entry for browser
        index.append({
            "id": ridx,
            "cuisine": cuisine,
            "label": f"{cuisine} — {', '.join(ingredients[:5])}..."
        })

    INDEX_FILE.write_text(json.dumps(index, indent=2), encoding="utf-8")

    print(f"Exported {len(index)} recipes")
    print(f"Recipe JSONs in: {WEB_DATA_DIR}")
    print(f"Index file: {INDEX_FILE}")
