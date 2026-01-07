import React, { useEffect } from "react";
import {
  computeScoreAvg,
  computeCoverage,
  buildHeatmapLong,
  buildContributions,
  normalizeIngredient,
} from "./flavor/flavor";

import { heatmapSpec, barsSpec, upsertVegaView } from "./flavor/charts";

import {
  uniqueCuisines,
  filterList,
  fillRecipeSelect,
  fillCuisineSelect,
  fetchJSON,
  fetchRecipe,
} from "./flavor/ui";

export default function FlavourComponent() {
  useEffect(() => {
    let allIndex: any[] = [];
    let flavorMap: Record<string, number> | null = null;

    const views: Record<string, any> = {
      heatmapA: null,
      barsA: null,
      heatmapB: null,
      barsB: null,
    };

    let compareEnabled = false;
    let currentA: any = null;
    let currentB: any = null;

    let originalIngredientsA: string[] | null = null;
    let editedIngredientsA: string[] | null = null;
    let originalScoreA: number | null = null;
    let originalCoverageA: number | null = null;
    let editWiredA = false;

    let neighborMap: Record<
      string,
      Array<{ other: string; w: number }>
    > | null = null;

    function setMeta(prefix: string, data: any) {
      const meta = document.getElementById(`meta${prefix}`);
      if (!meta) return;
      const best = data.contributions?.[0];
      const worst = data.contributions?.[data.contributions.length - 1];

      meta.innerHTML = `
    <b>Cuisine:</b> ${data.cuisine}<br/>
    <b>Ingredients:</b> ${data.ingredients.length}<br/>
    <b>Score (avg shared compounds):</b> ${data.score_avg.toFixed(2)}<br/>
    <b>Pair coverage:</b> ${(data.pair_coverage * 100).toFixed(1)}%<br/>
    <b>Strongest ingredient:</b> ${
      best ? `${best.ingredient} (${best.mean.toFixed(2)})` : "—"
    }<br/>
    <b>Weakest ingredient:</b> ${
      worst ? `${worst.ingredient} (${worst.mean.toFixed(2)})` : "—"
    }<br/>
    <b>Ingredients list:</b> ${data.ingredients.join(", ")}
  `;
    }

    async function renderRecipe(prefix: string, data: any) {
      setMeta(prefix, data);
      await upsertVegaView(
        views,
        `heatmap${prefix}`,
        `#heatmap${prefix}`,
        heatmapSpec(data.heatmap)
      );
      await upsertVegaView(
        views,
        `bars${prefix}`,
        `#bars${prefix}`,
        barsSpec(data.contributions)
      );
    }

    function updateDelta() {
      const deltaEl = document.getElementById("delta");
      if (!deltaEl) return;
      if (!compareEnabled || !currentA || !currentB) {
        deltaEl.classList.add("hidden");
        deltaEl.innerHTML = "";
        return;
      }
      const d = currentA.score_avg - currentB.score_avg;
      const winner = d > 0 ? "Recipe A" : d < 0 ? "Recipe B" : "Tie";
      deltaEl.classList.remove("hidden");
      deltaEl.innerHTML = `
    <b>Comparison:</b>
    A = ${currentA.score_avg.toFixed(2)} |
    B = ${currentB.score_avg.toFixed(2)} |
    Δ(A−B) = ${d.toFixed(2)} → <b>${winner}</b>
  `;
    }

    function buildNeighborMapFromFlavorMap(fm: Record<string, number>) {
      const nm: Record<string, Array<{ other: string; w: number }>> = {};
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

    function topSuggestedAdditions(nm: any, currentIngs: string[], k = 10) {
      const currentSet = new Set(currentIngs);
      const stats = new Map();

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

      const scored: any[] = [];
      for (const [ingredient, s] of stats.entries()) {
        const avg = s.cnt ? s.sum / s.cnt : 0;
        scored.push({ ingredient, avg, max: s.max, links: s.cnt });
      }

      scored.sort(
        (a, b) => b.avg - a.avg || b.max - a.max || b.links - a.links
      );
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
        btn.title = `Avg compatibility: ${item.avg.toFixed(
          2
        )} | strongest link: ${item.max} | links: ${item.links}`;

        btn.addEventListener("click", () => {
          if (!editedIngredientsA.includes(item.ingredient)) {
            editedIngredientsA.push(item.ingredient);
            applyEditsA().catch(console.error);
          }
        });

        box.appendChild(btn);
      }
    }

    function renderChipsA() {
      const chips = document.getElementById("chipsA");
      if (!chips || !editedIngredientsA) return;
      chips.innerHTML = "";
      for (const ing of editedIngredientsA) {
        const el = document.createElement("div");
        el.className = "chip";
        el.innerHTML = `<span>${ing}</span><button title="Remove">×</button>`;
        el.querySelector("button")!.addEventListener("click", () => {
          editedIngredientsA = editedIngredientsA!.filter((x) => x !== ing);
          applyEditsA().catch(console.error);
        });
        chips.appendChild(el);
      }
    }

    async function applyEditsA() {
      if (!flavorMap || !editedIngredientsA) return;
      const score = computeScoreAvg(flavorMap, editedIngredientsA);
      const coverage = computeCoverage(flavorMap, editedIngredientsA);
      const heat = buildHeatmapLong(flavorMap, editedIngredientsA);
      const contrib = buildContributions(flavorMap, editedIngredientsA);

      await upsertVegaView(views, "heatmapA", "#heatmapA", heatmapSpec(heat));
      await upsertVegaView(views, "barsA", "#barsA", barsSpec(contrib));

      const info = document.getElementById("editInfoA");
      if (!info) return;
      const dScore = score - (originalScoreA || 0);
      info.innerHTML = `
    <b>Edited score:</b> ${score.toFixed(2)} (${
        dScore >= 0 ? "+" : ""
      }${dScore.toFixed(2)} vs original) |
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

      const addBtn = document.getElementById("addBtnA");
      const resetBtn = document.getElementById("resetBtnA");
      const addInp = document.getElementById(
        "addIngA"
      ) as HTMLInputElement | null;
      if (addBtn && addInp) {
        addBtn.addEventListener("click", () => {
          const val = normalizeIngredient(addInp.value);
          if (!val) return;
          if (!editedIngredientsA!.includes(val)) {
            editedIngredientsA!.push(val);
            applyEditsA().catch(console.error);
          }
          addInp.value = "";
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          editedIngredientsA = [...(originalIngredientsA || [])];
          applyEditsA().catch(console.error);
        });
      }

      if (addInp) {
        addInp.addEventListener("keydown", (e) => {
          if ((e as KeyboardEvent).key === "Enter")
            document.getElementById("addBtnA")!.click();
        });
      }
    }

    async function loadA() {
      const idA = (
        document.getElementById("recipeSelectA") as HTMLSelectElement
      ).value;
      currentA = await fetchRecipe(idA);

      await renderRecipe("A", currentA);

      originalIngredientsA = [...currentA.ingredients];
      editedIngredientsA = [...currentA.ingredients];
      originalScoreA = currentA.score_avg;
      originalCoverageA = currentA.pair_coverage;

      document.getElementById("editInfoA")!.innerHTML = `
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
      const idB = (
        document.getElementById("recipeSelectB") as HTMLSelectElement
      ).value;
      currentB = await fetchRecipe(idB);
      await renderRecipe("B", currentB);
      updateDelta();
    }

    function refreshA() {
      const cuisine = (
        document.getElementById("cuisineSelectA") as HTMLSelectElement
      ).value;
      const search = (
        document.getElementById("searchInputA") as HTMLInputElement
      ).value;
      const selectA = document.getElementById(
        "recipeSelectA"
      ) as HTMLSelectElement;
      const keep = selectA.value || null;

      const list = filterList(allIndex, cuisine, search);
      fillRecipeSelect(selectA, list, keep);

      if (list.length === 0) {
        document.getElementById(
          "metaA"
        )!.innerHTML = `<span style="color:#b00"><b>No recipes match filters.</b></span>`;
        return;
      }
      loadA().catch(console.error);
    }

    function refreshB() {
      if (!compareEnabled) return;

      const cuisine = (
        document.getElementById("cuisineSelectB") as HTMLSelectElement
      ).value;
      const search = (
        document.getElementById("searchInputB") as HTMLInputElement
      ).value;
      const selectB = document.getElementById(
        "recipeSelectB"
      ) as HTMLSelectElement;
      const keep = selectB.value || null;

      const list = filterList(allIndex, cuisine, search);
      fillRecipeSelect(selectB, list, keep);

      if (list.length === 0) {
        document.getElementById(
          "metaB"
        )!.innerHTML = `<span style="color:#b00"><b>No recipes match filters.</b></span>`;
        currentB = null;
        updateDelta();
        return;
      }
      loadB().catch(console.error);
    }

    function setCompareEnabled(enabled: boolean) {
      compareEnabled = enabled;

      const section = document.getElementById("compareSection");
      const compareBtn = document.getElementById("compareBtn");
      const closeBtn = document.getElementById("closeCompareBtn");

      if (enabled) {
        section!.classList.remove("hidden");
        compareBtn!.classList.add("hidden");
        closeBtn!.classList.remove("hidden");
        refreshB();
      } else {
        section!.classList.add("hidden");
        compareBtn!.classList.remove("hidden");
        closeBtn!.classList.add("hidden");
        currentB = null;
        updateDelta();
      }
    }

    async function main() {
      allIndex = await fetchJSON(`/data/index.json`, "index.json");
      flavorMap = await fetchJSON(
        `/data/flavor_map.json`,
        "flavor_map.json (run python src/export_flavor_map.py)"
      );

      neighborMap = buildNeighborMapFromFlavorMap(flavorMap);

      const cuisines = uniqueCuisines(allIndex);
      fillCuisineSelect(
        document.getElementById("cuisineSelectA") as HTMLSelectElement,
        cuisines
      );
      fillCuisineSelect(
        document.getElementById("cuisineSelectB") as HTMLSelectElement,
        cuisines
      );

      document
        .getElementById("cuisineSelectA")!
        .addEventListener("change", refreshA);
      document
        .getElementById("searchInputA")!
        .addEventListener("input", refreshA);
      document
        .getElementById("recipeSelectA")!
        .addEventListener("change", () => loadA().catch(console.error));

      document
        .getElementById("cuisineSelectB")!
        .addEventListener("change", refreshB);
      document
        .getElementById("searchInputB")!
        .addEventListener("input", refreshB);
      document
        .getElementById("recipeSelectB")!
        .addEventListener("change", () => loadB().catch(console.error));

      document
        .getElementById("compareBtn")!
        .addEventListener("click", () => setCompareEnabled(true));
      document
        .getElementById("closeCompareBtn")!
        .addEventListener("click", () => setCompareEnabled(false));

      setCompareEnabled(false);
      refreshA();
    }

    main().catch((e) => {
      console.error(e);
      const meta = document.getElementById("metaA");
      if (meta)
        meta.innerHTML = `<span style="color:red"><b>Error:</b> ${e.message}</span>`;
    });

    return () => {
      // no-op cleanup for now
    };
  }, []);

  return (
    <div>
      <h1>Recipe Compatibility Explorer</h1>

      <div className="card">
        <div className="controls">
          <div>
            <label htmlFor="cuisineSelectA">Cuisine (A)</label>
            <br />
            <select id="cuisineSelectA"></select>
          </div>

          <div>
            <label htmlFor="searchInputA">Search (A)</label>
            <br />
            <input id="searchInputA" placeholder="e.g., chicken garlic" />
            <div className="small">
              Matches recipe preview text (first ingredients).
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="recipeSelectA">Recipe (A)</label>
            <br />
            <select
              id="recipeSelectA"
              style={{ width: "100%", minWidth: 320 }}
            ></select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button id="compareBtn">Compare</button>
            <button id="closeCompareBtn" className="hidden">
              Close comparison
            </button>
          </div>
        </div>

        <div id="delta" className="delta hidden"></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Recipe A</h2>
        <div id="metaA" className="meta"></div>

        <hr style={{ margin: "12px 0" }} />

        <div className="card" style={{ border: "1px dashed #ccc" }}>
          <h3>Edit ingredients (what-if)</h3>
          <div id="editInfoA" className="small"></div>

          <div
            id="chipsA"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              margin: "10px 0",
            }}
          ></div>

          <div className="controls" style={{ alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="addIngA">Add ingredient</label>
              <br />
              <input
                id="addIngA"
                placeholder="e.g., black_pepper (spaces become _ )"
                style={{ width: "100%" }}
              />
              <div className="small">
                Tip: use tokens like <code>lemon_juice</code>,{" "}
                <code>black_pepper</code>.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button id="addBtnA">Add</button>
              <button id="resetBtnA">Reset</button>
            </div>
          </div>
        </div>

        <div className="charts" style={{ marginTop: 14 }}>
          <div>
            <h3>Heatmap</h3>
            <div id="heatmapA"></div>
          </div>
          <div>
            <h3>Contributions</h3>
            <div id="barsA"></div>
          </div>
        </div>
      </div>

      <div
        id="compareSection"
        className="card hidden"
        style={{ marginTop: 16 }}
      >
        <h2>Recipe B (comparison)</h2>

        <div className="controls" style={{ marginBottom: 10 }}>
          <div>
            <label htmlFor="cuisineSelectB">Cuisine (B)</label>
            <br />
            <select id="cuisineSelectB"></select>
          </div>

          <div>
            <label htmlFor="searchInputB">Search (B)</label>
            <br />
            <input id="searchInputB" placeholder="e.g., beef onion" />
            <div className="small">
              Matches recipe preview text (first ingredients).
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="recipeSelectB">Recipe (B)</label>
            <br />
            <select
              id="recipeSelectB"
              style={{ width: "100%", minWidth: 320 }}
            ></select>
          </div>
        </div>

        <div id="metaB" className="meta"></div>

        <div className="charts" style={{ marginTop: 14 }}>
          <div>
            <h3>Heatmap</h3>
            <div id="heatmapB"></div>
          </div>
          <div>
            <h3>Contributions</h3>
            <div id="barsB"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
