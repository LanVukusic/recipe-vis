export function tokenizeSearch(s: string) {
  return s.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

export function uniqueCuisines(index: any[]) {
  return Array.from(new Set(index.map((d) => d.cuisine))).sort();
}

export function filterList(
  allIndex: any[],
  cuisineValue: string,
  searchValue: string
) {
  const tokens = tokenizeSearch(searchValue);
  return allIndex.filter((item) => {
    const okCuisine = cuisineValue === "All" || item.cuisine === cuisineValue;
    if (!okCuisine) return false;
    if (tokens.length === 0) return true;
    const hay = (item.label || "").toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

export function fillRecipeSelect(
  selectEl: HTMLSelectElement,
  list: any[],
  keepId: string | null = null
) {
  selectEl.innerHTML = "";

  const maxShow = 400;
  const shown = list.slice(0, maxShow);

  for (const item of shown) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.label;
    selectEl.appendChild(opt);
  }

  if (list.length > maxShow) {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.textContent = `… showing first ${maxShow} of ${list.length} (refine search)`;
    selectEl.appendChild(opt);
  }

  if (keepId !== null) {
    const exists = shown.some((x) => String(x.id) === String(keepId));
    if (exists) selectEl.value = keepId as string;
  }
}

export function fillCuisineSelect(
  selectEl: HTMLSelectElement,
  cuisines: string[]
) {
  selectEl.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "All";
  optAll.textContent = "All";
  selectEl.appendChild(optAll);

  for (const c of cuisines) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    selectEl.appendChild(opt);
  }
}

export async function fetchJSON(url: string, niceNameForError: string) {
  const resp = await fetch(url);
  if (!resp.ok)
    throw new Error(
      `Could not load ${niceNameForError} (${url}): ${resp.status}`
    );
  return await resp.json();
}

export async function fetchRecipe(recipeId: string | number) {
  const url = `/data/recipe_${String(recipeId).padStart(4, "0")}.json`;
  return await fetchJSON(url, "recipe JSON");
}
