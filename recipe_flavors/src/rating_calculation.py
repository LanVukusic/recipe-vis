import pandas as pd
import ast
import itertools
import re

# -----------------------------
# File paths
# -----------------------------

RECIPES_CSV = "../../data_proc/simplified_dataset.csv"
SCORES_CSV = "../data/flavor_edges.csv"

# -----------------------------
# Normalization config
# -----------------------------

STOPWORDS = {
    "fresh", "chopped", "optional", "ground",
    "large", "small", "or", "and"
}

# -----------------------------
# Text normalization helpers
# -----------------------------

_non_alpha = re.compile(r"[^a-z\s]")
_multi_space = re.compile(r"\s+")

def normalize_to_tokens(text):
    text = text.lower()
    text = _non_alpha.sub(" ", text)
    text = _multi_space.sub(" ", text).strip()
    return frozenset(t for t in text.split() if t not in STOPWORDS)

# -----------------------------
# Load data
# -----------------------------

recipes = pd.read_csv(RECIPES_CSV)
scores = pd.read_csv(SCORES_CSV)

recipes["NER_Simple"] = recipes["NER_Simple"].apply(ast.literal_eval)

# -----------------------------
# Preprocess scores (FAST LOOKUP)
# -----------------------------

score_index = {}

for _, row in scores.iterrows():
    t1 = normalize_to_tokens(row["ingredient_1"])
    t2 = normalize_to_tokens(row["ingredient_2"])

    if not t1 or not t2:
        continue

    key = tuple(sorted((t1, t2), key=len))
    score_index[key] = score_index.get(key, 0) + row["score"]

# -----------------------------
# Rating computation
# -----------------------------

def compute_recipe_rating(ingredients):
    if not ingredients:
        return 0.0

    tokenized = [normalize_to_tokens(i) for i in ingredients if i]
    tokenized = [t for t in tokenized if t]

    total_score = 0

    for a, b in itertools.combinations(tokenized, 2):
        key = tuple(sorted((a, b), key=len))
        total_score += score_index.get(key, 0)

    score = total_score / len(tokenized) if tokenized else 0.0


    print(score)
    return score

# -----------------------------
# Apply scoring
# -----------------------------

recipes["rating"] = recipes["NER_Simple"].apply(compute_recipe_rating)

# -----------------------------
# Save BACK to recipes.csv
# -----------------------------

recipes.to_csv(RECIPES_CSV, index=False)
print("✅ 'rating' column added to recipes.csv")
