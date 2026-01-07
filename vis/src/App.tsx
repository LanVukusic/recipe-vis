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

      <div className="p-2 flex gap-2">
        <button
          onClick={() => setMode("flavour")}
          className={`px-3 py-1 rounded ${
            mode === "flavour" ? "bg-yellow-400" : "bg-white"
          }`}
        >
          Flavour UI
        </button>
        <button
          onClick={() => setMode("graph")}
          className={`px-3 py-1 rounded ${
            mode === "graph" ? "bg-yellow-400" : "bg-white"
          }`}
        >
          Graph Analysis
        </button>
      </div>

      {mode === "flavour" && <FlavourComponent />}
      {mode === "graph" && frequencyMap && (
        <GraphAnalysis freqMap={frequencyMap} />
      )}
    </div>
  );
}

export default App;
