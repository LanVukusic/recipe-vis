# Recipe Compatibility Explorer (Flavor Network)

This branch contains an **interactive web visualization** based on the paper  
**“Flavor Network and the Principles of Food Pairing”** (Ahn et al.).

The goal of this project is to explore **how well ingredients in a recipe fit together**
based on shared flavor compounds, and to make this understandable through
interactive visualizations.

This implementation is **separate from the main branch** and does not overwrite existing work.

---

## Concept

- Ingredients are connected if they share flavor compounds
- Each pair has a **weight** = number of shared compounds
- A recipe’s “compatibility” is derived from all ingredient pairs

The system allows users to:
- browse recipes by cuisine
- inspect ingredient compatibility
- compare two recipes
- interactively edit ingredients (“what-if” analysis)
- visually understand *why* a recipe scores well or poorly

---

## What the Website Shows

For each recipe:

- **Compatibility score**  
  Average shared flavor compounds across ingredient pairs

- **Pair coverage**  
  Percentage of ingredient pairs that exist in the flavor network

- **Heatmap**  
  Pairwise ingredient compatibility (ingredient × ingredient)

- **Contribution bar chart**  
  How much each ingredient contributes to the overall score

- **What-if editor**  
  Add or remove ingredients and see scores & visuals update live

- **Side-by-side comparison**  
  Compare two recipes from possibly different cuisines

---
