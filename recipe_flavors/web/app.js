import {
  computeScoreAvg,
  computeCoverage,
  buildHeatmapLong,
  buildContributions,
  normalizeIngredient
} from "./js/flavor.js";

import { heatmapSpec, barsSpec, upsertVegaView } from "./js/charts.js";

import {
  uniqueCuisines,
  filterList,
  fillRecipeSelect,
  fillCuisineSelect,
  fetchJSON,
  fetchRecipe
} from "./js/ui.js";

// ------------------ state ------------------

let allIndex = [];
let flavorMap = null;

const views = {
  heatmapA: null, barsA: null,
  heatmapB: null, barsB: null
};

let compareEnabled = false;

let currentA = null;
let currentB = null;

// what-if A
let originalIngredientsA = null;
let editedIngredientsA = null;
let originalScoreA = null;
let originalCoverageA = null;
let editWiredA = false;

// suggestions
let neighborMap = null;

// ------------------ helpers ------------------

function setMeta(prefix, data) {
  const meta = document.getElementById(`meta${prefix}`);
  const best = data.contributions?.[0];
  const worst = data.contributions?.[data.contributions.length - 1];

  meta.innerHTML = `
    <b>Cuisine:</b> ${data.cuisine}<br/>
    <b>Ingredients:</b> ${data.ingredients.length}<br/>
    <b>Score (avg shared compounds):</b> ${data.score_avg.toFixed(2)}<br/>
    <b>Pair coverage:</b> ${(data.pair_coverage * 100).toFixed(1)}%<br/>
    <b>Strongest ingredient:</b> ${best ? `${best.ingredient} (${best.mean.toFixed(2)})` : "—"}<br/>
    <b>Weakest ingredient:</b> ${worst ? `${worst.ingredient} (${worst.mean.toFixed(2)})` : "—"}<br/>
    <b>Ingredients list:</b> ${data.ingredients.join(", ")}
  `;
}

async function renderRecipe(prefix, data) {
  setMeta(prefix, data);
  await upsertVegaView(views, `heatmap${prefix}`, `#heatmap${prefix}`, heatmapSpec(data.heatmap));
  await upsertVegaView(views, `bars${prefix}`, `#bars${prefix}`, barsSpec(data.contributions));
}

function updateDelta() {
  const deltaEl = document.getElementById("delta");
  if (!compareEnabled || !currentA || !currentB) {
    deltaEl.classList.add("hidden");
    deltaEl.innerHTML = "";
    return;
  }
  const d = currentA.score_avg - currentB.score_avg;
  const winner = d > 0 ? "Recipe A" : (d < 0 ? "Recipe B" : "Tie");
  deltaEl.classList.remove("hidden");
  deltaEl.innerHTML = `
    <b>Comparison:</b>
    A = ${currentA.score_avg.toFixed(2)} |
    B = ${currentB.score_avg.toFixed(2)} |
    Δ(A−B) = ${d.toFixed(2)} → <b>${winner}</b>
  `;
}

// ------------------ suggestions (top 10 compatible) ------------------

function buildNeighborMapFromFlavorMap(fm) {
  const nm = {}; // ingredient -> [{other, w}]
  for (const key of Object.keys(fm)) {
    const w = fm[key];
    const [a, b] = key.split("|");
    if (!nm[a]) nm[a] = [];
    if (!nm[b]) nm[b] = [];
    nm[a].push({ other: b, w });
    nm[b].push({ other: a, w });
  }
  return nm;
}

function topSuggestedAdditions(nm, currentIngs, k = 10) {
  const currentSet = new Set(currentIngs);
  const stats = new Map(); // other -> {sum, cnt, max}

  for (const ing of currentIngs) {
    const neigh = nm[ing] || [];
    for (const { other, w } of neigh) {
      if (currentSet.has(other)) continue;

      const s = stats.get(other) || { sum: 0, cnt: 0, max: 0 };
      s.sum += w;
      s.cnt += 1;
      if (w > s.max) s.max = w;
      stats.set(other, s);
    }
  }

  const scored = [];
  for (const [ingredient, s] of stats.entries()) {
    const avg = s.cnt ? (s.sum / s.cnt) : 0;
    scored.push({ ingredient, avg, max: s.max, links: s.cnt });
  }

  scored.sort((a, b) => (b.avg - a.avg) || (b.max - a.max) || (b.links - a.links));
  return scored.slice(0, k);
}

function renderSuggestionsA() {
  const box = document.getElementById("suggestA");
  if (!box || !editedIngredientsA || !neighborMap) return;

  box.innerHTML = "";

  const top = topSuggestedAdditions(neighborMap, editedIngredientsA, 10);

  if (top.length === 0) {
    box.innerHTML = `<span class="small">No suggestions (try adding more base ingredients).</span>`;
    return;
  }

  for (const item of top) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggest-btn";
    btn.textContent = `${item.ingredient} (${item.avg.toFixed(1)})`;
    btn.title = `Avg compatibility: ${item.avg.toFixed(2)} | strongest link: ${item.max} | links: ${item.links}`;

    btn.addEventListener("click", () => {
      if (!editedIngredientsA.includes(item.ingredient)) {
        editedIngredientsA.push(item.ingredient);
        applyEditsA().catch(console.error);
      }
    });

    box.appendChild(btn);
  }
}

// ------------------ what-if A ------------------

function renderChipsA() {
  const chips = document.getElementById("chipsA");
  chips.innerHTML = "";
  for (const ing of editedIngredientsA) {
    const el = document.createElement("div");
    el.className = "chip";
    el.innerHTML = `<span>${ing}</span><button title="Remove">×</button>`;
    el.querySelector("button").addEventListener("click", () => {
      editedIngredientsA = editedIngredientsA.filter(x => x !== ing);
      applyEditsA().catch(console.error);
    });
    chips.appendChild(el);
  }
}

async function applyEditsA() {
  const score = computeScoreAvg(flavorMap, editedIngredientsA);
  const coverage = computeCoverage(flavorMap, editedIngredientsA);
  const heat = buildHeatmapLong(flavorMap, editedIngredientsA);
  const contrib = buildContributions(flavorMap, editedIngredientsA);

  await upsertVegaView(views, "heatmapA", "#heatmapA", heatmapSpec(heat));
  await upsertVegaView(views, "barsA", "#barsA", barsSpec(contrib));

  const info = document.getElementById("editInfoA");
  const dScore = score - originalScoreA;
  info.innerHTML = `
    <b>Edited score:</b> ${score.toFixed(2)} (${dScore >= 0 ? "+" : ""}${dScore.toFixed(2)} vs original) |
    <b>Edited coverage:</b> ${(coverage * 100).toFixed(1)}%
    <br/>
    <span class="small">If an ingredient has no links in the network, it contributes ~0.</span>
  `;

  renderChipsA();
  renderSuggestionsA();
  updateDelta();
}

function wireEditUIAOnce() {
  if (editWiredA) return;
  editWiredA = true;

  document.getElementById("addBtnA").addEventListener("click", () => {
    const inp = document.getElementById("addIngA");
    const val = normalizeIngredient(inp.value);
    if (!val) return;

    if (!editedIngredientsA.includes(val)) {
      editedIngredientsA.push(val);
      applyEditsA().catch(console.error);
    }
    inp.value = "";
  });

  document.getElementById("resetBtnA").addEventListener("click", () => {
    editedIngredientsA = [...originalIngredientsA];
    applyEditsA().catch(console.error);
  });

  document.getElementById("addIngA").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("addBtnA").click();
  });
}

// ------------------ load A/B ------------------

async function loadA() {
  const idA = document.getElementById("recipeSelectA").value;
  currentA = await fetchRecipe(idA);

  await renderRecipe("A", currentA);

  // init what-if from A
  originalIngredientsA = [...currentA.ingredients];
  editedIngredientsA = [...currentA.ingredients];
  originalScoreA = currentA.score_avg;
  originalCoverageA = currentA.pair_coverage;

  document.getElementById("editInfoA").innerHTML = `
    <b>Original score:</b> ${originalScoreA.toFixed(2)} |
    <b>Original coverage:</b> ${(originalCoverageA * 100).toFixed(1)}%
    <br/>
    <span class="small">Remove or add ingredients to see how compatibility changes.</span>
  `;

  wireEditUIAOnce();
  renderChipsA();
  renderSuggestionsA();
  updateDelta();
}

async function loadB() {
  const idB = document.getElementById("recipeSelectB").value;
  currentB = await fetchRecipe(idB);
  await renderRecipe("B", currentB);
  updateDelta();
}

// ------------------ filters ------------------

function refreshA() {
  const cuisine = document.getElementById("cuisineSelectA").value;
  const search = document.getElementById("searchInputA").value;
  const selectA = document.getElementById("recipeSelectA");
  const keep = selectA.value || null;

  const list = filterList(allIndex, cuisine, search);
  fillRecipeSelect(selectA, list, keep);

  if (list.length === 0) {
    document.getElementById("metaA").innerHTML = `<span style="color:#b00"><b>No recipes match filters.</b></span>`;
    return;
  }
  loadA().catch(console.error);
}

function refreshB() {
  if (!compareEnabled) return;

  const cuisine = document.getElementById("cuisineSelectB").value;
  const search = document.getElementById("searchInputB").value;
  const selectB = document.getElementById("recipeSelectB");
  const keep = selectB.value || null;

  const list = filterList(allIndex, cuisine, search);
  fillRecipeSelect(selectB, list, keep);

  if (list.length === 0) {
    document.getElementById("metaB").innerHTML = `<span style="color:#b00"><b>No recipes match filters.</b></span>`;
    currentB = null;
    updateDelta();
    return;
  }
  loadB().catch(console.error);
}

// ------------------ compare toggle ------------------

function setCompareEnabled(enabled) {
  compareEnabled = enabled;

  const section = document.getElementById("compareSection");
  const compareBtn = document.getElementById("compareBtn");
  const closeBtn = document.getElementById("closeCompareBtn");

  if (enabled) {
    section.classList.remove("hidden");
    compareBtn.classList.add("hidden");
    closeBtn.classList.remove("hidden");
    refreshB();
  } else {
    section.classList.add("hidden");
    compareBtn.classList.remove("hidden");
    closeBtn.classList.add("hidden");
    currentB = null;
    updateDelta();
  }
}

// ------------------ main ------------------

async function main() {
  allIndex = await fetchJSON("./data/index.json", "index.json");
  flavorMap = await fetchJSON("./data/flavor_map.json", "flavor_map.json (run python src/export_flavor_map.py)");

  // build neighbor map once for fast suggestions
  neighborMap = buildNeighborMapFromFlavorMap(flavorMap);

  const cuisines = uniqueCuisines(allIndex);
  fillCuisineSelect(document.getElementById("cuisineSelectA"), cuisines);
  fillCuisineSelect(document.getElementById("cuisineSelectB"), cuisines);

  // A events
  document.getElementById("cuisineSelectA").addEventListener("change", refreshA);
  document.getElementById("searchInputA").addEventListener("input", refreshA);
  document.getElementById("recipeSelectA").addEventListener("change", () => loadA().catch(console.error));

  // B events
  document.getElementById("cuisineSelectB").addEventListener("change", refreshB);
  document.getElementById("searchInputB").addEventListener("input", refreshB);
  document.getElementById("recipeSelectB").addEventListener("change", () => loadB().catch(console.error));

  // compare
  document.getElementById("compareBtn").addEventListener("click", () => setCompareEnabled(true));
  document.getElementById("closeCompareBtn").addEventListener("click", () => setCompareEnabled(false));

  setCompareEnabled(false);
  refreshA();
}

main().catch((e) => {
  console.error(e);
  document.getElementById("metaA").innerHTML = `<span style="color:red"><b>Error:</b> ${e.message}</span>`;
});
