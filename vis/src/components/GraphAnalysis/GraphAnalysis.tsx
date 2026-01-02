import { useEffect, useState } from "react";
import GraphStatsCards from "./GraphStatsCards";
import GraphVisualization from "./GraphVisualization";
import { RecipeSelector } from "./RecipeSelector";
import { ValueSlider } from "./ValueSlider";
import { useNeighborhoodExploration } from "./useNeighborhoodExploration";

export interface Recipe {
  index: number;
  title: string;
  ingredients: string;
  directions: string;
  link: string;
  NER_Simple: string;
}

interface graphAnalysisData {
  title: string;
  value: number;
}

const graphAnalysisStats: graphAnalysisData[] = [
  {
    title: "Node count",
    value: 50000,
  },
  {
    title: "Edge count",
    value: 500,
  },
  {
    title: "Betweenest",
    value: 153.4,
  },
  {
    title: "Average node degree",
    value: 153.4,
  },
  {
    title: "Hubbing",
    value: 15.4,
  },
  {
    title: "Average node degree",
    value: 153.4,
  },
  {
    title: "Hubbing",
    value: 15.4,
  },
];

export const GraphAnalysis = () => {
  const [data, setData] = useState<Recipe[]>();
  const [selected, setSelected] = useState<Recipe[]>([]);

  const [numIterations, setNumIterations] = useState(12);
  const [restartChance, setRestartChance] = useState(0.3);
  const [maxNodes, setMaxNodes] = useState(15);
  const [minVisits, setMinVisits] = useState(3);

  const { explorationState, startExploration, resetExploration } =
    useNeighborhoodExploration();

  useEffect(() => {
    fetch("/recipes.json").then(async (data) => {
      const d = await data.json();
      setData(d);
    });
  }, []);

  const handleAnalyzeNeighbors = () => {
    if (selected.length > 0 && data) {
      const startRecipe = selected[0]; // Use the first selected recipe as start point
      startExploration(data, startRecipe.index, restartChance, numIterations);
    }
  };

  const handleReset = () => {
    setSelected([]);
    resetExploration();
  };

  return (
    <div>
      <div className="p-4 pt-16 border-b-2 border-yellow-40 w-fit ">
        <h1 className="text-yellow-400 text-5xl">Recipes as a graph</h1>
        <h4 className="text-gray-300 pt-2">
          Graphy analysis and canonical graph data
        </h4>
      </div>

      <div className="p-4 max-w-prose text-sm text-gray-200 font-light opacity-50">
        Graph analysis scripts are taken and adapted from course materials of{" "}
        <a className="text-yellow-300 underline cursor-pointer">
          Introduction to network analysis by Lovro Šubelj{" "}
        </a>
        available at his github.
      </div>

      <GraphStatsCards stats={graphAnalysisStats} />

      <div className="p-4 mt-8  bg-yellow-400 w-fit font-bold">
        Interactive graph exploration
      </div>
      <div className="max-w-prose px-4 text-zinc-400  tracking-tight pt-8">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia quos
        blanditiis quisquam illum, esse suscipit obcaecati nemo praesentium
      </div>

      <div className="grid grid-cols-2 gap-8  p-4 text-gray-300  border-dashed  mt-8">
        <div className="flex flex-col gap-2">
          {data && (
            <RecipeSelector
              recipes={data}
              onRecipeSelect={(recipe) => {
                console.log(recipe);
                setSelected([recipe, ...selected]);
              }}
            />
          )}
        </div>
        <div className="flex flex-col gap-7">
          <span className="">Selected jump points</span>

          <div className="bg-zinc-800 p-4 h-full ">
            {selected.length == 0 && (
              <div className="w-full h-full flex justify-center items-center text-zinc-500">
                Select recipes ...
              </div>
            )}

            {/* selected recipe list */}
            <div className="flex flex-col">
              {selected.map((recipe) => (
                <div
                  key={recipe.index}
                  className="border-b border-zinc-700 pt-2"
                  onClick={() => {
                    setSelected(
                      selected.filter((r) => r.index != recipe.index)
                    );
                  }}
                >
                  {recipe.title}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <ValueSlider
              label="Num iterations"
              initialValue={numIterations}
              min={0}
              max={100}
              step={1}
              onChange={setNumIterations}
            />
            <ValueSlider
              label="Restart chance"
              initialValue={restartChance}
              min={0}
              max={1}
              step={0.1}
              onChange={setRestartChance}
            />
            <ValueSlider
              label="Max nodes"
              initialValue={maxNodes}
              min={5}
              max={35}
              step={1}
              onChange={setMaxNodes}
            />
            <ValueSlider
              label="Min visits filter"
              initialValue={minVisits}
              min={1}
              max={numIterations}
              step={1}
              onChange={setMinVisits}
            />
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 mt-8 px-6 py-2 bg-zinc-700 text-yellow-400  font-bold cursor-pointer disabled:opacity-50"
                onClick={handleAnalyzeNeighbors}
                disabled={selected.length === 0 || explorationState.isExploring}
              >
                {explorationState.isExploring
                  ? "Exploring..."
                  : "Analyze neighbours"}
              </button>
              <button
                className="mt-8 px-6 py-2 bg-zinc-70 text-yellow-400 font-bold cursor-pointer"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className="h-120 relative">
          <GraphVisualization
            nodes={explorationState.finalSubgraph?.nodes || []}
            edges={explorationState.finalSubgraph?.edges || []}
          />
        </div>

        <div className="border-l-2 border-yellow-40 p-4 text-yellow-400 bg-zinc-800 flex flex-col gap-2">
          {/* Recipe details panel would go here */}
          <div className="w-full h-full flex justify-center items-center text-zinc-500">
            {explorationState.finalSubgraph?.nodes.length
              ? `Explored ${explorationState.finalSubgraph.nodes.length} recipes`
              : "Select node to view"}
          </div>
        </div>
      </div>
    </div>
  );
};
