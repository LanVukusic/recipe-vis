export function heatmapSpec(values) {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 420,
    height: 420,
    data: { values },
    mark: "rect",
    encoding: {
      x: { field: "x", type: "nominal", sort: null, title: "Ingredient" },
      y: { field: "y", type: "nominal", sort: null, title: "Ingredient" },
      color: { field: "value", type: "quantitative", title: "Shared compounds" },
      tooltip: [
        { field: "x", type: "nominal", title: "Ingredient A" },
        { field: "y", type: "nominal", title: "Ingredient B" },
        { field: "value", type: "quantitative", title: "Shared compounds" }
      ]
    }
  };
}

export function barsSpec(values) {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 420,
    height: Math.max(220, values.length * 16),
    data: { values },
    mark: "bar",
    encoding: {
      y: { field: "ingredient", type: "nominal", sort: "-x", title: null },
      x: { field: "mean", type: "quantitative", title: "Mean pair compatibility" },
      tooltip: [
        { field: "ingredient", type: "nominal", title: "Ingredient" },
        { field: "mean", type: "quantitative", title: "Mean", format: ".2f" }
      ]
    }
  };
}

export async function upsertVegaView(views, key, selector, specObj) {
  if (!views[key]) {
    const res = await vegaEmbed(selector, specObj, { actions: true });
    views[key] = res.view;
  } else {
    // Replace data in existing view
    views[key].change("source_0", vega.changeset().remove(() => true).insert(specObj.data.values));
    await views[key].runAsync();
  }
}
