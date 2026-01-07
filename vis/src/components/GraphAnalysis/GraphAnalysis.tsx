import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { memo } from "react";
import GraphStatsCards from "./GraphStatsCards";
import { GraphVisualization } from "./GraphVisualization";
import { RecipeSelector } from "./RecipeSelector";
import { ValueSlider } from "./ValueSlider";
import { useNeighborhoodExploration } from "./useNeighborhoodExploration";
import type { FreqMap } from "../../App";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

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
  { title: "Node Count", value: 1000 },
  { title: "Edge Count", value: 228233 },
  { title: "Average Node Degree", value: 456.466 },
  { title: "Density", value: 0.4569229229229229 },
  { title: "Connected Components Count", value: 2 },
  { title: "Largest Component Size", value: 999 },
  { title: "Average Clustering Coefficient", value: 0.7427057317683866 },
  { title: "Max Degree Centrality", value: 0.8098098098098098 },
  { title: "Avg Degree Centrality", value: 0.4569229229229229 },
  { title: "Max Betweenness Centrality", value: 0.004345996739948956 },
  { title: "Avg Betweenness Centrality", value: 0.0005568332423485893 },
  { title: "Diameter", value: 4 },
  { title: "Radius", value: 2 },
  { title: "Total Unique Ingredients", value: 897 },
  { title: "Total Ingredients", value: 7308 },
];

const GraphAnalysisComponent = ({ freqMap }: { freqMap: FreqMap }) => {
  const [data, setData] = useState<Recipe[] | null>(null);
  const [selected, setSelected] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [numIterations, setNumIterations] = useState(100);
  const [restartChance, setRestartChance] = useState(0.3);
  const [minVisits, setMinVisits] = useState(1);
  const [useFilteredGraph, setUseFilteredGraph] = useState(false);

  // Add timeout reference for cleanup
  const timeoutRef = useRef<number | null>(null);

  const { explorationState, startExploration, resetExploration } =
    useNeighborhoodExploration(freqMap, data || []);

  // Load data with proper error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        setError(null);

        const response = await fetch("/recipes.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch recipes: ${response.status}`);
        }

        const d = await response.json();
        setData(d);
      } catch (err) {
        console.error("Error loading recipes:", err);
        setError("Failed to load recipe data. Please try again later.");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRecipeSelect = useCallback((recipe: Recipe) => {
    setSelected((prevSelected) => {
      if (prevSelected.some((r) => r.index === recipe.index)) {
        return prevSelected;
      }
      return [recipe, ...prevSelected];
    });
  }, []);

  const handleRemoveRecipe = useCallback((index: number) => {
    setSelected((prevSelected) =>
      prevSelected.filter((r) => r.index !== index)
    );
  }, []);

  const handleAnalyzeNeighbors = useCallback(async () => {
    if (!data || selected.length === 0 || explorationState.isExploring) {
      return;
    }

    try {
      // Clear previous results and errors
      resetExploration();
      setError(null);

      await startExploration(
        selected,
        restartChance,
        numIterations,
        minVisits,
        useFilteredGraph
      );
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Analysis failed. Please try again with different parameters.");
    }
  }, [
    data,
    selected,
    explorationState.isExploring,
    resetExploration,
    startExploration,
    restartChance,
    numIterations,
    minVisits,
    useFilteredGraph,
  ]);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUseFilteredGraph(e.target.checked);
    },
    []
  );

  const handleReset = useCallback(() => {
    resetExploration();
    setSelectedRecipe(null);
    setError(null);
  }, [resetExploration]);

  const memoizedGraphStats = useMemo(() => graphAnalysisStats, []);

  // Show loading state while data is being fetched
  if (isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center ">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
          <p className="text-gray-300">Loading recipe data...</p>
        </div>
      </div>
    );
  }

  // Show error state if data loading failed
  if (error && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center  p-4">
        <div className="max-w-md w-full bg-zinc-800 rounded-lg p-6 text-center border border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="inline-block w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  text-gray-100">
      <div className="p-4 pt-16 border-b border-yellow-400/30 w-fit">
        <h1 className="text-yellow-400 text-5xl font-bold">
          Recipes as a graph
        </h1>
        <h4 className="text-gray-400 pt-2">
          Graph analysis and random walk recommendation
        </h4>
      </div>

      <div className="p-4 max-w-prose text-sm text-gray-300 font-light opacity-80">
        Graph analysis scripts are taken and adapted from course materials of{" "}
        <a
          href="https://github.com/lovre/www/tree/master/ina"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-300 underline hover:text-yellow-200 transition-colors"
        >
          Introduction to network analysis by Lovro Šubelj
        </a>
      </div>

      <GraphStatsCards stats={memoizedGraphStats} />

      <div className="p-4 mt-8 bg-yellow-400 text-zinc-800 w-fit font-bold ">
        Interactive graph exploration
      </div>

      <div className="flex flex-wrap gap-8 p-4">
        <div className="flex-1  px-4 text-zinc-400 tracking-tight pt-8">
          <p className="mb-4 max-w-prose">
            Graph is created from the recipes in the dataset. Recipes are the
            nodes and edges between them are based on common ingredients.
          </p>
          <p className="mb-4 max-w-prose">
            If two recipes share an ingredient, they will share an edge. In this
            example 'Recipe 1' and 'Recipe 2' both share 'tomato' as their
            ingredient, so an edge is made there.
          </p>
          <img
            src="/Recipes.svg"
            alt="Recipe graph visualization example"
            className="w-full max-h-80 object-contain"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 mt-8">
        <div className="flex flex-col gap-6">
          {data && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Select Recipes
              </h3>
              <RecipeSelector
                recipes={data}
                onRecipeSelect={handleRecipeSelect}
              />
            </div>
          )}

          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-4">
              Selected Jump Points
            </h3>
            {selected.length === 0 ? (
              <div className="w-full h-32 flex justify-center items-center text-zinc-500 border-2 border-dashed rounded-lg">
                <p>Select recipes to start exploration...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {selected.map((recipe) => (
                  <div
                    key={recipe.index}
                    className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-700 hover:bg-zinc-900/70 transition-colors cursor-pointer"
                    onClick={() => handleRemoveRecipe(recipe.index)}
                  >
                    <span className="truncate">{recipe.title}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-700 px-2 py-1 rounded">
                      {getIngredientsFromRecipe(recipe).length} ingredients
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-4">
              Analysis Parameters
            </h3>
            <div className="space-y-4">
              <ValueSlider
                label="Number of iterations"
                initialValue={numIterations}
                min={0}
                max={500}
                step={1}
                onChange={setNumIterations}
                tooltip="Higher values give more accurate results but take longer"
              />
              <ValueSlider
                label="Restart probability"
                initialValue={restartChance}
                min={0}
                max={1}
                step={0.05}
                onChange={setRestartChance}
                tooltip="Higher values keep the walk closer to starting recipes"
              />
              <ValueSlider
                label="Minimum visits filter"
                initialValue={minVisits}
                min={1}
                max={20}
                step={1}
                onChange={setMinVisits}
                tooltip="Only show nodes visited at least this many times"
              />

              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFilteredGraph}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 text-yellow-400 bg-zinc-700 border-zinc-600 rounded focus:ring-yellow-400 focus:ring-offset-0 focus:ring-2"
                  />
                  <span className="text-gray-300">
                    Filter graph by selected recipes' ingredients only
                  </span>
                </label>
                <p className="text-xs text-zinc-500 mt-1 pl-7">
                  Reduces computation time but limits exploration scope
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                <AlertCircle className="inline-block w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAnalyzeNeighbors}
                disabled={
                  selected.length === 0 || explorationState.isExploring || !data
                }
                className={`
                  flex-1 px-6 py-3 font-bold rounded-lg transition-all duration-200
                  ${
                    selected.length === 0 || !data
                      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                      : explorationState.isExploring
                      ? "bg-yellow-500/20 text-yellow-300 animate-pulse"
                      : "bg-yellow-400 text-zinc-900 hover:bg-yellow-300"
                  }
                `}
              >
                {explorationState.isExploring ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exploring...
                  </div>
                ) : (
                  "Analyze Neighbors"
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={
                  !explorationState.finalSubgraph &&
                  !explorationState.isExploring
                }
                className={`
                  flex-1 px-6 py-3 font-bold rounded-lg transition-all duration-200
                  ${
                    !explorationState.finalSubgraph &&
                    !explorationState.isExploring
                      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                      : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                  }
                `}
              >
                <RefreshCw className="inline-block w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 mt-8">
        <div className="flex flex-col gap-4">
          <div className="flex gap-8 pb-4">
            <div className="flex gap-2 items-center">
              <div className="bg-yellow-400 w-4 h-4 rounded-full" />
              <span className="text-sm text-gray-300">Explored nodes</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="bg-zinc-400 w-4 h-4 rounded-full" />
              <span className="text-sm text-gray-300">Selected jump nodes</span>
            </div>
          </div>

          <div className="h-[600px] bg-zinc-800/50 rounded-lg border border-zinc-700 relative overflow-hidden">
            {explorationState.isExploring ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10">
                <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-200">
                  Running random walk analysis...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {numIterations} iterations with {restartChance} restart
                  probability
                </p>
              </div>
            ) : null}

            {explorationState.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 z-10 p-4">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-red-300 text-center max-w-md">
                  {explorationState.error}
                </p>
                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reset Analysis
                </button>
              </div>
            )}

            {!explorationState.isExploring &&
            !explorationState.finalSubgraph ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <div className="text-center p-8">
                  <p className="text-lg font-medium mb-4">Ready for analysis</p>
                  <p className="text-sm opacity-70">
                    Select recipes above and click "Analyze Neighbors" to start
                  </p>
                </div>
              </div>
            ) : (
              <GraphVisualization
                selectedNodes={selected}
                nodes={explorationState.finalSubgraph?.nodes || []}
                edges={explorationState.finalSubgraph?.edges || []}
                onNodeClick={(node) => {
                  setSelectedRecipe(node.recipe);
                }}
              />
            )}
          </div>
        </div>

        <div className="border-l border-yellow-400/30 pl-8">
          <div className="sticky top-4">
            <div className="bg-zinc-800/50 rounded-lg p-6 h-full border border-zinc-700">
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Recipe Details
              </h3>

              {selectedRecipe === null ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-500">
                  <p className="text-lg mb-2">
                    Click a recipe node to view details
                  </p>
                  <p className="text-sm opacity-70">
                    Explore the graph to discover similar recipes
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-2xl font-bold text-white mb-2">
                      {selectedRecipe.title}
                    </h4>
                    <a
                      href={selectedRecipe.link}
                      target="_blank"
                      className="text-yellow-300 hover:text-yellow-500 underline text-sm transition-colors"
                    >
                      View original recipe
                    </a>
                  </div>

                  <div>
                    <h5 className="text-lg font-semibold text-yellow-300 mb-2">
                      Ingredients
                    </h5>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
                      {getIngredientsFromRecipe(selectedRecipe).map(
                        (ingredient, index) => (
                          <div
                            key={index}
                            className="text-gray-300 bg-zinc-900/50 p-2 rounded border border-zinc-700"
                          >
                            {ingredient.trim()}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-lg font-semibold text-yellow-300 mb-2">
                      Directions
                    </h5>
                    <div className="text-gray-300 bg-zinc-900/50 p-3 rounded border border-zinc-700 text-sm max-h-48 overflow-y-auto">
                      {selectedRecipe.directions || "No directions available"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-32" />
    </div>
  );
};

// Helper function to get ingredients from recipe
const getIngredientsFromRecipe = (recipe: Recipe): string[] => {
  return recipe.NER_Simple.slice(1, -1)
    .split(",")
    .map((ing) => ing.trim().replaceAll("'", "").replaceAll('"', ""))
    .filter((ing) => ing.length > 0);
};

export const GraphAnalysis = memo(GraphAnalysisComponent);
