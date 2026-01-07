export function canonKey(a: string, b: string) {
  if (a === b) return null;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function pairWeight(
  flavorMap: Record<string, number>,
  a: string,
  b: string
) {
  const k = canonKey(a, b);
  if (!k) return 0;
  return flavorMap?.[k] ?? 0;
}

export function computeScoreAvg(
  flavorMap: Record<string, number>,
  ings: string[]
) {
  const n = ings.length;
  if (n < 2) return 0;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += pairWeight(flavorMap, ings[i], ings[j]);
      cnt += 1;
    }
  }
  return cnt ? sum / cnt : 0;
}

export function computeCoverage(
  flavorMap: Record<string, number>,
  ings: string[]
) {
  const n = ings.length;
  if (n < 2) return 0;
  let found = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (pairWeight(flavorMap, ings[i], ings[j]) > 0) found += 1;
      cnt += 1;
    }
  }
  return cnt ? found / cnt : 0;
}

export function buildHeatmapLong(
  flavorMap: Record<string, number>,
  ings: string[]
) {
  const out: Array<{ x: string; y: string; value: number }> = [];
  for (const x of ings) {
    for (const y of ings) {
      out.push({ x, y, value: x === y ? 0 : pairWeight(flavorMap, x, y) });
    }
  }
  return out;
}

export function buildContributions(
  flavorMap: Record<string, number>,
  ings: string[]
) {
  const out: Array<{ ingredient: string; mean: number }> = [];
  for (const a of ings) {
    let sum = 0;
    let cnt = 0;
    for (const b of ings) {
      if (a === b) continue;
      sum += pairWeight(flavorMap, a, b);
      cnt += 1;
    }
    out.push({ ingredient: a, mean: cnt ? sum / cnt : 0 });
  }
  out.sort((p, q) => q.mean - p.mean);
  return out;
}

export function normalizeIngredient(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}
