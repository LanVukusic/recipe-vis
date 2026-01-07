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
        box.innerHTML = `<span class="text-sm text-zinc-300">No suggestions (try adding more base ingredients).</span>`;
        return;
      }

      for (const item of top) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "px-3 py-1 rounded-full  bg-zinc-800 text-sm hover:bg-yellow-50";
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
        el.className =
          "inline-flex gap-2 items-center px-3 py-1  rounded-full bg-zinc-800 text-sm";
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
      <span class="text-sm text-zinc-300">If an ingredient has no links in the network, it contributes ~0.</span>
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
    <div className="p-6 font-sans  min-h-screen text-zinc-300">
      <h1 className="text-2xl font-semibold mb-4 bg-yellow-400 py-6 w-fit px-16 -ml-6 text-zinc-800 mt-16">
        Recipe Compatibility Explorer
      </h1>

      <div className="pt-16"></div>

      <div className="bg-zinc-800   rounded-lg p-4 shadow-sm ">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label htmlFor="cuisineSelectA" className="font-semibold">
              Cuisine (A)
            </label>
            <br />
            <select
              id="cuisineSelectA"
              className="mt-1  rounded px-2 py-1"
            ></select>
          </div>

          <div>
            <label htmlFor="searchInputA" className="font-semibold">
              Search (A)
            </label>
            <br />
            <input
              id="searchInputA"
              placeholder="e.g., chicken garlic"
              className="mt-1  rounded px-2 py-1"
            />
            <div className="text-sm text-zinc-300">
              Matches recipe preview text (first ingredients).
            </div>
          </div>

          <div className="flex-1">
            <label htmlFor="recipeSelectA" className="font-semibold">
              Recipe (A)
            </label>
            <br />
            <select
              id="recipeSelectA"
              className="mt-1 w-full  rounded px-2 py-1"
            ></select>
          </div>

          <div className="flex gap-2">
            <button
              id="compareBtn"
              className="px-3 py-1 bg-zinc-700 cursor-pointer "
            >
              Compare
            </button>
            <button
              id="closeCompareBtn"
              className="hidden px-3 py-1 bg-zinc-800  rounded "
            >
              Close comparison
            </button>
          </div>
        </div>

        <div id="delta" className="mt-3 text-lg hidden "></div>
      </div>

      <div className="mt-4 bg-zinc-800   rounded-lg p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Recipe A</h2>
        <div id="metaA" className="mt-2 text-sm text-zinc-300"></div>

        <hr className="my-3" />

        <div className="bg-zinc-800  -dashed rounded-md p-3">
          <h3 className="font-semibold">Edit ingredients (what-if)</h3>
          <div id="editInfoA" className="text-sm text-zinc-300"></div>

          <div id="chipsA" className="flex flex-wrap gap-2 my-2"></div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="addIngA" className="font-semibold">
                Add ingredient
              </label>
              <br />
              <input
                id="addIngA"
                placeholder="e.g., black_pepper (spaces become _ )"
                className="mt-1 w-full  rounded px-2 py-1 border-b border-yellow-400"
              />
              <div className="text-sm text-zinc-300 pt-2">
                Tip: use tokens like{" "}
                <code className="bg-zinc-700 text-zinc-200 rounded px-1">
                  lemon_juice
                </code>
                ,{" "}
                <code className="bg-zinc-700 text-zinc-200 rounded px-1">
                  black_pepper
                </code>
                .
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="addBtnA"
                className="px-3 py-1 bg-zinc-700 cursor-pointer "
              >
                Add
              </button>
              <button
                id="resetBtnA"
                className="px-3 py-1 bg-zinc-700 cursor-pointer "
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="font-semibold">Heatmap</h3>
            <div id="heatmapA"></div>
          </div>
          <div>
            <h3 className="font-semibold">Contributions</h3>
            <div id="barsA"></div>
          </div>
        </div>
      </div>

      <div
        id="compareSection"
        className="mt-4 bg-zinc-800   rounded-lg p-4 shadow-sm hidden"
      >
        <h2 className="text-xl font-semibold">Recipe B (comparison)</h2>

        <div className="flex gap-3 items-end mb-2">
          <div>
            <label htmlFor="cuisineSelectB" className="font-semibold">
              Cuisine (B)
            </label>
            <br />
            <select
              id="cuisineSelectB"
              className="mt-1  rounded px-2 py-1"
            ></select>
          </div>

          <div>
            <label htmlFor="searchInputB" className="font-semibold">
              Search (B)
            </label>
            <br />
            <input
              id="searchInputB"
              placeholder="e.g., beef onion"
              className="mt-1  rounded px-2 py-1"
            />
            <div className="text-sm text-zinc-300">
              Matches recipe preview text (first ingredients).
            </div>
          </div>

          <div className="flex-1">
            <label htmlFor="recipeSelectB" className="font-semibold">
              Recipe (B)
            </label>
            <br />
            <select
              id="recipeSelectB"
              className="mt-1 w-full  rounded px-2 py-1"
            ></select>
          </div>
        </div>

        <div id="metaB" className="mt-2 text-sm text-gray-700"></div>

        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="font-semibold">Heatmap</h3>
            <div id="heatmapB"></div>
          </div>
          <div>
            <h3 className="font-semibold">Contributions</h3>
            <div id="barsB"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
