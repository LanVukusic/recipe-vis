import { useState, useEffect } from "react";
import { GraphAnalysis } from "./components/GraphAnalysis/GraphAnalysis";
import Header from "./components/Header/Header";
import FlavourComponent from "./components/FlavourComponent";

export type FreqMap = Map<string, number>;

function App() {
  const [frequencyMap, setFrequencyMap] = useState<FreqMap>();
  const [mode, setMode] = useState<"flavour" | "graph">("flavour");
  useEffect(() => {
    fetch("/frequencies.json").then(async (data) => {
      const d = await data.json();
      const map = new Map<string, number>(Object.entries(d));
      setFrequencyMap(map);
    });
  }, []);

  return (
    <div className="w-full border-t-3 border-yellow-300 ">
      <Header />

      <div className="flex flex-col gap-4 justify-center items-center">
        <div className="p-2 flex gap-6 pt-8  w-fit text-2xl">
          <button
            onClick={() => setMode("flavour")}
            className={`px-6 py-2 cursor-pointer  ${
              mode === "flavour" ? "bg-yellow-400" : "bg-zinc-700"
            } ${mode === "graph" ? "text-yellow-400" : "text-zinc-800"}`}
          >
            Flavour compatibility
          </button>
          <button
            onClick={() => setMode("graph")}
            className={`px-6 py-2 cursor-pointer  ${
              mode === "graph" ? "bg-yellow-400" : "bg-zinc-700"
            } ${mode === "flavour" ? "text-yellow-400" : "text-zinc-800"}`}
          >
            Graph Analysis
          </button>
        </div>
        <p className="text-center text-zinc-500 max-w-prose">
          Explore recipe flavour compatibility or switch to graph based recipe
          exploration
        </p>
      </div>

      {mode === "flavour" && <FlavourComponent />}
      {mode === "graph" && frequencyMap && (
        <GraphAnalysis freqMap={frequencyMap} />
      )}
    </div>
  );
}

export default App;
